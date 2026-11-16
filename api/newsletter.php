<?php
// Newsletter Marcus Koky Barber: přihlášení (double opt-in), potvrzení a odhlášení jedním klikem.
//   POST a=prihlasit  email, souhlas, zdroj, web (honeypot)       → JSON
//   GET  a=potvrdit&t=TOKEN                                        → stránka
//   GET  a=odhlasit&t=TOKEN                                        → stránka (odhlásí hned, jedním klikem)
//   POST a=odhlasit&t=TOKEN  List-Unsubscribe=One-Click (RFC 8058) → 200
//   GET  a=sleva&nl=TOKEN                                          → JSON {ok, procento} pro slevový odkaz z e-mailu
// Na GitHub Pages PHP neběží, formuláře tam jen předvádějí (režim Návrh).
declare(strict_types=1);
require __DIR__ . '/lib/newsletter.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

const LIMIT_SUBSCRIBE_PER_HOUR = 5;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = (string)($_GET['a'] ?? $_POST['a'] ?? '');

function page(int $code, string $title, string $text, bool $resubscribe = false): never {
    http_response_code($code);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header("Content-Security-Policy: default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    $site = nl_h(nl_config()['site_url']);
    $more = $resubscribe ? '<p class="nl-page-small">Odhlásil(a) ses omylem? Přihlas se znovu dole na <a href="../#novinky">webu</a>.</p>' : '';
    echo '<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex"><title>' . nl_h($title) . ' · Marcus Koky Barber</title>'
        . '<link rel="stylesheet" href="../assets/fonts/fonts.css"><link rel="stylesheet" href="../assets/css/style.css">'
        . '<style>.nl-page{min-height:100vh;display:grid;place-items:center;padding:32px 20px}.nl-page-box{max-width:560px;text-align:center}'
        . '.nl-page-box img{width:120px;margin:0 auto 32px}.nl-page-box h1{font-size:clamp(40px,8vw,64px);margin-bottom:20px}'
        . '.nl-page-box p{margin:0 auto 28px;color:var(--muted)}.nl-page-small{font-size:14px}.nl-page-box .nl-page-small{margin:28px auto 0}.nl-page-small a{color:var(--text);border-bottom:1px solid var(--gold-dark)}</style>'
        . '</head><body><main class="nl-page"><div class="nl-page-box"><img src="../assets/img/emblem-gold.png" width="331" height="362" alt="Marcus Koky Barber">'
        . '<h1>' . $title . '</h1><p>' . nl_h($text) . '</p>'
        . '<a class="button button--yellow" href="../">Zpět na web</a>' . $more
        . '</div></main></body></html>';
    exit;
}

function by_token(string $t): ?array {
    if (!preg_match('/^[a-f0-9]{48}$/', $t)) return null;
    $st = nl_db()->prepare('SELECT * FROM subscribers WHERE token = ?');
    $st->execute([$t]);
    return $st->fetch() ?: null;
}

try {
    /* ---------- přihlášení ---------- */
    if ($action === 'prihlasit') {
        if ($method !== 'POST') nl_json(405, ['ok' => false, 'error' => 'Jen POST.']);
        if (!empty($_POST['web'])) nl_json(200, ['ok' => true]);   // past na roboty
        $email = mb_strtolower(trim((string)($_POST['email'] ?? '')));
        if (!nl_valid_email($email)) nl_json(422, ['ok' => false, 'error' => 'Zadej platný e-mail.']);
        if (empty($_POST['souhlas'])) nl_json(422, ['ok' => false, 'error' => 'Bez souhlasu tě nemůžu přihlásit.']);
        $source = ($_POST['zdroj'] ?? '') === 'rezervace' ? 'rezervace' : 'web';
        if (!nl_rate_limit('nl', LIMIT_SUBSCRIBE_PER_HOUR)) nl_json(429, ['ok' => false, 'error' => 'Moc pokusů za sebou, zkus to později.']);

        $db = nl_db();
        $st = $db->prepare('SELECT * FROM subscribers WHERE email = ?');
        $st->execute([$email]);
        $row = $st->fetch();
        $now = time();
        $send = null;
        if (!$row) {
            $token = nl_token();
            $db->prepare('INSERT INTO subscribers (email, status, token, source, consent_text, created_at, confirm_sent_at) VALUES (?, \'pending\', ?, ?, ?, ?, ?)')
                ->execute([$email, $token, $source, NL_CONSENT_TEXT, $now, $now]);
            $send = $token;
        } elseif ($row['status'] === 'unsubscribed' || ($row['status'] === 'pending' && (int)$row['confirm_sent_at'] < $now - 600)) {
            // znovu přihlášení po odhlášení nebo opakované potvrzení (nejvýš jednou za 10 minut)
            $token = nl_token();
            $db->prepare('UPDATE subscribers SET status = \'pending\', token = ?, source = ?, consent_text = ?, created_at = ?, confirm_sent_at = ?, confirmed_at = NULL, unsubscribed_at = NULL WHERE id = ?')
                ->execute([$token, $source, NL_CONSENT_TEXT, $now, $now, $row['id']]);
            $send = $token;
        }
        // Odpověď je vždy stejná, aby z ní nešlo zjistit, kdo už odebírá.
        if ($send !== null && !nl_send_confirmation($email, $send)) nl_json(500, ['ok' => false, 'error' => 'Potvrzovací e-mail se nepodařilo odeslat.']);
        nl_json(200, ['ok' => true]);
    }

    /* ---------- potvrzení ---------- */
    if ($action === 'potvrdit') {
        $row = by_token((string)($_GET['t'] ?? ''));
        if (!$row) page(404, 'Odkaz <em>nesedí</em>', 'Tenhle potvrzovací odkaz neznám. Možná už je starý, přihlas se k novinkám znovu.');
        if ($row['status'] === 'confirmed') page(200, 'Už jsi <em>uvnitř</em>', 'Odběr je potvrzený. Novinky ti přijdou e-mailem.');
        if ($row['status'] === 'unsubscribed') page(410, 'Odběr je <em>zrušený</em>', 'Tahle adresa se z novinek odhlásila. Pokud je chceš znovu, přihlas se na webu.');
        if ((int)$row['created_at'] < time() - NL_PENDING_DAYS * 86400) page(410, 'Odkaz <em>vypršel</em>', 'Potvrzovací odkaz platí ' . NL_PENDING_DAYS . ' dní. Přihlas se prosím znovu.');
        nl_db()->prepare('UPDATE subscribers SET status = \'confirmed\', confirmed_at = ? WHERE id = ? AND status = \'pending\'')->execute([time(), $row['id']]);
        page(200, 'Hotovo, <em>vítej</em>', 'Odběr je potvrzený. Volné termíny, akce a novinky ze salonu ti budou chodit e-mailem. Odhlásit se můžeš kdykoli jedním klikem.');
    }

    /* ---------- ověření slevového odkazu (web podle něj ukáže slevu) ---------- */
    if ($action === 'sleva') {
        $ok = nl_discount_verify((string)($_GET['nl'] ?? '')) !== null;
        nl_json($ok ? 200 : 404, $ok ? ['ok' => true, 'procento' => nl_config()['sleva_procent']] : ['ok' => false, 'error' => 'Slevový odkaz neplatí.']);
    }

    /* ---------- odhlášení jedním klikem ---------- */
    if ($action === 'odhlasit') {
        $row = by_token((string)($_GET['t'] ?? ''));
        if ($row && $row['status'] !== 'unsubscribed') {
            nl_db()->prepare('UPDATE subscribers SET status = \'unsubscribed\', unsubscribed_at = ? WHERE id = ?')->execute([time(), $row['id']]);
        }
        if ($method === 'POST') { http_response_code($row ? 200 : 404); exit; }   // klient pošty (List-Unsubscribe-Post)
        if (!$row) page(404, 'Odkaz <em>nesedí</em>', 'Tenhle odhlašovací odkaz neznám. Napiš na info@marcuskoky.cz a odhlásím tě ručně.');
        page(200, 'Odhlášeno', 'Už ti žádné novinky nepošlu. Díky, že jsi byl(a) se mnou.', true);
    }

    nl_json(400, ['ok' => false, 'error' => 'Neznámá akce.']);
} catch (Throwable $e) {
    error_log('newsletter: ' . $e->getMessage());
    nl_json(500, ['ok' => false, 'error' => 'Něco se pokazilo na serveru.']);
}
