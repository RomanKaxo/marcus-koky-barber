<?php
// Správa newsletteru pro majitele (spravce.html → Newsletter). Vše jen POST + JSON.
// Přihlášení heslem z config.php (hash), PHP session s cookie HttpOnly + SameSite=Strict, CSRF token v hlavičce.
//   a=stav | prihlasit (heslo) | odhlasit | prehled | smazat (id) | test (predmet, text, tlacitko)
//   a=kampan (predmet, preheader, text, tlacitko) | davka (id)
declare(strict_types=1);
require __DIR__ . '/lib/newsletter.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

const LIMIT_LOGIN_PER_HOUR = 10;
const SUBJECT_MAX = 150;
const BODY_MAX = 10000;

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') nl_json(405, ['ok' => false, 'error' => 'Jen POST.']);

$https = ($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off';
session_name('mkb_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
ini_set('session.use_strict_mode', '1');
session_start();

$action = (string)($_POST['a'] ?? '');
$cfg = nl_config();
$logged = !empty($_SESSION['nl_admin']) && ($_SESSION['nl_until'] ?? 0) > time();

function post_text(string $name, int $max): string {
    return mb_substr(trim(str_replace("\r", '', (string)($_POST[$name] ?? ''))), 0, $max);
}
function require_login(bool $logged): void {
    if (!$logged) nl_json(401, ['ok' => false, 'error' => 'Přihlas se.']);
    $sent = (string)($_SERVER['HTTP_X_CSRF'] ?? '');
    if (!hash_equals((string)($_SESSION['nl_csrf'] ?? ''), $sent)) nl_json(403, ['ok' => false, 'error' => 'Neplatný požadavek, obnov stránku.']);
    $_SESSION['nl_until'] = time() + 8 * 3600;
}
function message_input(): array {
    $subject = preg_replace('/[\r\n]+/', ' ', post_text('predmet', SUBJECT_MAX)) ?? '';
    $preheader = preg_replace('/\s+/u', ' ', post_text('preheader', 150)) ?? '';
    $body = post_text('text', BODY_MAX);
    if (mb_strlen($subject) < 3) nl_json(422, ['ok' => false, 'error' => 'Doplň předmět.']);
    if (mb_strlen($body) < 10) nl_json(422, ['ok' => false, 'error' => 'Text je moc krátký.']);
    return [$subject, $preheader, $body, !empty($_POST['tlacitko'])];
}

try {
    if ($action === 'stav') {
        nl_json(200, ['ok' => true, 'prihlasen' => $logged, 'csrf' => $logged ? $_SESSION['nl_csrf'] : null,
            'nastaveno' => $cfg['admin_password_hash'] !== '']);
    }

    if ($action === 'prihlasit') {
        if ($cfg['admin_password_hash'] === '') nl_json(503, ['ok' => false, 'error' => 'Heslo není nastavené (api/config.php).']);
        if (!nl_rate_limit('nladmin', LIMIT_LOGIN_PER_HOUR)) nl_json(429, ['ok' => false, 'error' => 'Moc pokusů, zkus to za hodinu.']);
        if (!password_verify((string)($_POST['heslo'] ?? ''), $cfg['admin_password_hash'])) {
            nl_json(401, ['ok' => false, 'error' => 'Špatné heslo.']);
        }
        session_regenerate_id(true);
        $_SESSION['nl_admin'] = true;
        $_SESSION['nl_until'] = time() + 8 * 3600;
        $_SESSION['nl_csrf'] = bin2hex(random_bytes(32));
        nl_json(200, ['ok' => true, 'csrf' => $_SESSION['nl_csrf']]);
    }

    require_login($logged);
    $db = nl_db();

    if ($action === 'odhlasit') {
        $_SESSION = [];
        session_destroy();
        nl_json(200, ['ok' => true]);
    }

    if ($action === 'prehled') {
        $subs = $db->query('SELECT id, email, status, source, created_at, confirmed_at, unsubscribed_at FROM subscribers ORDER BY created_at DESC')->fetchAll();
        $camps = $db->query('SELECT id, subject, status, created_at, finished_at, total, sent, failed FROM campaigns ORDER BY created_at DESC LIMIT 50')->fetchAll();
        nl_json(200, ['ok' => true, 'odberatele' => $subs, 'kampane' => $camps, 'test_email' => $cfg['test_email'], 'davka' => $cfg['batch_size'],
            'sleva_procent' => nl_discount_on() ? $cfg['sleva_procent'] : 0]);
    }

    if ($action === 'smazat') {
        $db->prepare('DELETE FROM subscribers WHERE id = ?')->execute([(int)($_POST['id'] ?? 0)]);
        nl_json(200, ['ok' => true]);
    }

    if ($action === 'test') {
        [$subject, $preheader, $body, $button] = message_input();
        [$text, $html, $unsub] = nl_campaign_message('[TEST] ' . $subject, $preheader, $body, $button, 0, str_repeat('0', 48));
        if (!nl_send($cfg['test_email'], '[TEST] ' . $subject, $text, $html, $unsub)) nl_json(500, ['ok' => false, 'error' => 'Test se nepodařilo odeslat.']);
        nl_json(200, ['ok' => true, 'komu' => $cfg['test_email']]);
    }

    if ($action === 'kampan') {
        [$subject, $preheader, $body, $button] = message_input();
        if ($db->query('SELECT COUNT(*) FROM campaigns WHERE status = \'sending\'')->fetchColumn() > 0) {
            nl_json(409, ['ok' => false, 'error' => 'Jedno rozesílání ještě běží, dokonči ho v historii.']);
        }
        $now = time();
        $total = (int)$db->query('SELECT COUNT(*) FROM subscribers WHERE status = \'confirmed\'')->fetchColumn();
        if ($total === 0) nl_json(422, ['ok' => false, 'error' => 'Zatím nemáš žádné potvrzené odběratele.']);
        $db->prepare('INSERT INTO campaigns (subject, preheader, body, button, status, created_at, total) VALUES (?, ?, ?, ?, \'sending\', ?, ?)')
            ->execute([$subject, $preheader, $body, $button ? 1 : 0, $now, $total]);
        nl_json(200, ['ok' => true, 'id' => (int)$db->lastInsertId(), 'total' => $total]);
    }

    if ($action === 'davka') {
        $id = (int)($_POST['id'] ?? 0);
        // Kurzor posuneme ještě před odesláním: při pádu se může pár e-mailů ztratit, ale nikdy nepřijdou dvakrát.
        $db->exec('BEGIN IMMEDIATE');
        $st = $db->prepare('SELECT * FROM campaigns WHERE id = ?');
        $st->execute([$id]);
        $c = $st->fetch();
        if (!$c) { $db->exec('ROLLBACK'); nl_json(404, ['ok' => false, 'error' => 'Rozesílání nenalezeno.']); }
        $batch = [];
        if ($c['status'] === 'sending') {
            $st = $db->prepare('SELECT id, email, token FROM subscribers WHERE status = \'confirmed\' AND id > ? AND confirmed_at <= ? ORDER BY id LIMIT ' . $cfg['batch_size']);
            $st->execute([$c['last_id'], $c['created_at']]);
            $batch = $st->fetchAll();
            if ($batch) {
                $db->prepare('UPDATE campaigns SET last_id = ? WHERE id = ?')->execute([end($batch)['id'], $id]);
            } else {
                $db->prepare('UPDATE campaigns SET status = \'done\', finished_at = ? WHERE id = ?')->execute([time(), $id]);
            }
        }
        $db->exec('COMMIT');
        $sent = $failed = 0;
        foreach ($batch as $s) {
            [$text, $html, $unsub] = nl_campaign_message($c['subject'], (string)$c['preheader'], $c['body'], (bool)$c['button'], $id, $s['token']);
            nl_send($s['email'], $c['subject'], $text, $html, $unsub) ? $sent++ : $failed++;
        }
        if ($batch) $db->prepare('UPDATE campaigns SET sent = sent + ?, failed = failed + ? WHERE id = ?')->execute([$sent, $failed, $id]);
        $st = $db->prepare('SELECT id, status, total, sent, failed FROM campaigns WHERE id = ?');
        $st->execute([$id]);
        $now = $st->fetch();
        nl_json(200, ['ok' => true, 'hotovo' => $now['status'] === 'done', 'kampan' => $now]);
    }

    nl_json(400, ['ok' => false, 'error' => 'Neznámá akce.']);
} catch (Throwable $e) {
    error_log('newsletter-admin: ' . $e->getMessage());
    nl_json(500, ['ok' => false, 'error' => 'Něco se pokazilo na serveru.']);
}
