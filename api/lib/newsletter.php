<?php
// Sdílená logika newsletteru: nastavení, databáze SQLite, limit pokusů a skládání e-mailů.
// Soubor se jen načítá z api/newsletter.php a api/newsletter-admin.php, přímý přístup blokuje .htaccess.
declare(strict_types=1);

const NL_FROM = 'info@marcuskoky.cz';          // odesílatel newsletteru; musí ho povolit hosting (SPF/DKIM)
const NL_FROM_NAME = 'Marcus Koky Barber';
const NL_REPLY_TO = 'info@marcuskoky.cz';
const NL_CONSENT_TEXT = 'Souhlasím se zasíláním novinek, akcí a volných termínů Marcus Koky Barber e-mailem. Souhlas můžu kdykoli odvolat odkazem v každém e-mailu.';
const NL_PENDING_DAYS = 7;                      // jak dlouho platí potvrzovací odkaz

function nl_config(): array {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $candidates = array_filter([
        getenv('MKB_CONFIG') ?: null,
        dirname(__DIR__, 3) . '/mkb-config.php',   // mimo kořen webu (doporučeno)
        dirname(__DIR__) . '/config.php',           // api/config.php (v .gitignore)
    ]);
    $loaded = [];
    foreach ($candidates as $file) {
        if (is_file($file)) { $loaded = require $file; break; }
    }
    $cfg = array_merge([
        'admin_password_hash' => '',
        'test_email' => NL_FROM,
        'site_url' => 'https://www.marcuskoky.cz/',
        'data_dir' => dirname(__DIR__) . '/data',
        'batch_size' => 25,
        'secret' => '',              // tajemství pro podpis slevových odkazů (HMAC); prázdné = sleva vypnutá
        'sleva_procent' => 5,        // JEDINÉ místo, kde se nastavuje sleva z newsletteru (v %)
        'sleva_dni' => 30,           // jak dlouho od rozeslání platí slevový odkaz
    ], is_array($loaded) ? $loaded : []);
    $cfg['site_url'] = rtrim((string)$cfg['site_url'], '/') . '/';
    $cfg['batch_size'] = max(1, min(200, (int)$cfg['batch_size']));
    $cfg['sleva_procent'] = max(0, min(50, (int)$cfg['sleva_procent']));
    $cfg['sleva_dni'] = max(1, (int)$cfg['sleva_dni']);
    return $cfg;
}

function nl_db(): PDO {
    static $db = null;
    if ($db) return $db;
    $dir = nl_config()['data_dir'];
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) throw new RuntimeException('Nelze vytvořit složku pro data.');
    $db = new PDO('sqlite:' . $dir . '/newsletter.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $db->exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
    $db->exec('CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        status TEXT NOT NULL CHECK (status IN (\'pending\', \'confirmed\', \'unsubscribed\')),
        token TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL DEFAULT \'web\',
        consent_text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        confirm_sent_at INTEGER,
        confirmed_at INTEGER,
        unsubscribed_at INTEGER
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        button INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL CHECK (status IN (\'sending\', \'done\')),
        created_at INTEGER NOT NULL,
        finished_at INTEGER,
        total INTEGER NOT NULL DEFAULT 0,
        sent INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        last_id INTEGER NOT NULL DEFAULT 0
    )');
    $cols = array_column($db->query('PRAGMA table_info(campaigns)')->fetchAll(), 'name');
    if (!in_array('preheader', $cols, true)) $db->exec('ALTER TABLE campaigns ADD COLUMN preheader TEXT NOT NULL DEFAULT \'\'');
    return $db;
}

/** Jednoduchý limit pokusů podle IP (stejně jako api/rezervace.php). Vrací false při překročení. */
function nl_rate_limit(string $bucket, int $perHour): bool {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'x';
    $file = sys_get_temp_dir() . '/mkb-' . $bucket . '-' . hash('sha256', $ip);
    $times = array_filter(array_map('intval', @file($file, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > time() - 3600);
    if (count($times) >= $perHour) return false;
    $times[] = time();
    @file_put_contents($file, implode("\n", $times), LOCK_EX);
    return true;
}

function nl_json(int $code, array $body): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function nl_valid_email(string $email): bool {
    return strlen($email) <= 254 && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function nl_token(): string { return bin2hex(random_bytes(24)); }

function nl_url(string $action, string $token): string {
    return nl_config()['site_url'] . 'api/newsletter.php?a=' . $action . '&t=' . $token;
}

/* ---------- sleva z newsletteru ---------- */

/** Je sleva zapnutá? Potřebuje tajemství (min. 32 znaků) a nenulové procento. */
function nl_discount_on(): bool {
    $c = nl_config();
    return strlen((string)$c['secret']) >= 32 && $c['sleva_procent'] > 0;
}

/** Podepsaný token kampaně pro slevový odkaz: "<id>-<hmac>". Bez tajemství ho nikdo nevyrobí. */
function nl_discount_token(int $campaignId): string {
    return $campaignId . '-' . substr(hash_hmac('sha256', 'mkb-sleva|' . $campaignId, (string)nl_config()['secret']), 0, 32);
}

/** Ověří token: podpis, existující rozeslaná kampaň a platnost. Vrací ID kampaně, nebo null. */
function nl_discount_verify(string $token): ?int {
    if (!nl_discount_on() || !preg_match('/^(\d{1,9})-([a-f0-9]{32})$/', $token, $m)) return null;
    if (!hash_equals(nl_discount_token((int)$m[1]), $token)) return null;
    $st = nl_db()->prepare('SELECT created_at FROM campaigns WHERE id = ?');
    $st->execute([(int)$m[1]]);
    $created = $st->fetchColumn();
    if ($created === false || (int)$created < time() - nl_config()['sleva_dni'] * 86400) return null;
    return (int)$m[1];
}

/** Cena po slevě, zaokrouhlená na celé Kč (polovina nahoru). Stejný výpočet je v assets/js/rozsireni.js. */
function nl_discount_price(int $price): int {
    return (int)round($price * (100 - nl_config()['sleva_procent']) / 100, 0, PHP_ROUND_HALF_UP);
}

/** Na zvýhodněné ceny (první návštěva, 14denní restart) se sleva nevztahuje. */
function nl_discount_applies(string $service): bool {
    return !preg_match('/^(První návštěva|14denní restart):/u', $service);
}

function nl_h(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

/** Text od majitele → odstavce HTML (vše escapované, prázdný řádek = nový odstavec). */
function nl_body_html(string $text): string {
    $paras = preg_split('/\R{2,}/u', trim(str_replace("\r", '', $text))) ?: [];
    $out = '';
    foreach ($paras as $p) {
        if (trim($p) === '') continue;
        $out .= '<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#f4efe6;">'
            . nl2br(nl_h(trim($p)), false) . '</p>';
    }
    return $out;
}

/**
 * Složí HTML e-mail ze sdílené šablony assets/email/newsletter.html (stejnou používá náhled ve správci).
 * $button = ['text' => ..., 'url' => ...] nebo null.
 */
function nl_render_html(string $subject, string $preheader, string $bodyHtml, ?array $button, string $unsubUrl, string $footerNote): string {
    $tpl = (string)file_get_contents(dirname(__DIR__, 2) . '/assets/email/newsletter.html');
    $block = function (string $tpl, string $name, bool $keep): string {
        return $keep ? str_replace(["<!--$name-->", "<!--/$name-->"], '', $tpl)
            : (preg_replace('/<!--' . $name . '-->.*?<!--\/' . $name . '-->/s', '', $tpl) ?? $tpl);
    };
    $tpl = $block($tpl, 'POZN', !empty($button['note']));
    $tpl = $block($tpl, 'TLACITKO', (bool)$button);
    $site = nl_config()['site_url'];
    return strtr($tpl, [
        '{{predmet}}' => nl_h($subject),
        '{{preheader}}' => nl_h($preheader),
        '{{obsah}}' => $bodyHtml,
        '{{tlacitko_text}}' => nl_h($button['text'] ?? ''),
        '{{tlacitko_url}}' => nl_h($button['url'] ?? ''),
        '{{tlacitko_pozn}}' => nl_h($button['note'] ?? ''),
        '{{hero_url}}' => nl_h($site . 'assets/img/email-hero.jpg'),
        '{{wordmark_url}}' => nl_h($site . 'assets/img/wordmark-gold.png'),
        '{{odhlasit_url}}' => nl_h($unsubUrl),
        '{{web_url}}' => nl_h($site),
        '{{poznamka}}' => nl_h($footerNote),
    ]);
}

function nl_mime_header(string $s): string {
    return mb_encode_mimeheader(preg_replace('/[\r\n]+/', ' ', $s) ?? '', 'UTF-8', 'B', "\r\n");
}

/**
 * Odešle multipart/alternative (text + HTML) přes PHP mail().
 * $unsubUrl != null přidá hlavičky List-Unsubscribe pro odhlášení jedním klikem (RFC 8058).
 */
function nl_send(string $to, string $subject, string $text, string $html, ?string $unsubUrl): bool {
    if (!nl_valid_email($to)) return false;
    $boundary = 'mkb-' . bin2hex(random_bytes(12));
    $host = parse_url(nl_config()['site_url'], PHP_URL_HOST) ?: 'marcuskoky.cz';
    $headers = [
        'From: ' . nl_mime_header(NL_FROM_NAME) . ' <' . NL_FROM . '>',
        'Reply-To: ' . NL_REPLY_TO,
        'Message-ID: <' . bin2hex(random_bytes(16)) . '@' . $host . '>',
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
    ];
    if ($unsubUrl) {
        $headers[] = 'List-Unsubscribe: <' . $unsubUrl . '>, <mailto:' . NL_REPLY_TO . '?subject=odhlasit>';
        $headers[] = 'List-Unsubscribe-Post: List-Unsubscribe=One-Click';
        $headers[] = 'List-Id: Novinky Marcus Koky Barber <novinky.' . $host . '>';
        $headers[] = 'Precedence: bulk';
    }
    $body = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($text))
        . "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($html))
        . "--$boundary--\r\n";
    return mail($to, nl_mime_header($subject), $body, implode("\r\n", $headers));
}

function nl_text_footer(string $unsubUrl, string $note): string {
    return "\n\n--\nMarcus Koky Barber · Bratislavská 201/14 (Ponávka Tower), 602 00 Brno\n"
        . "+420 732 165 547 · " . nl_config()['site_url'] . "\n\n"
        . $note . "\nOdhlásit odběr: " . $unsubUrl . "\n";
}

/** Potvrzovací e-mail double opt-in. */
function nl_send_confirmation(string $email, string $token): bool {
    $confirm = nl_url('potvrdit', $token);
    $unsub = nl_url('odhlasit', $token);
    $subject = 'Potvrď odběr novinek · Marcus Koky Barber';
    $note = 'Tento e-mail přišel, protože někdo zadal tvou adresu do přihlášení k novinkám na webu Marcus Koky Barber. Pokud jsi to nebyl(a) ty, nic nedělej, bez potvrzení ti nic dalšího nepošlu.';
    $text = "Ahoj,\n\nještě jeden klik a budeš mezi prvními, kdo se dozví o volných termínech, akcích a novinkách ze salonu.\n\n"
        . "Potvrdit odběr: $confirm\n\nOdkaz platí " . NL_PENDING_DAYS . " dní.\n\nMarcus" . nl_text_footer($unsub, $note);
    $html = nl_render_html($subject, 'Ještě jeden klik a jsi mezi prvními, kdo se dozví o volných termínech.',
        nl_body_html("Ahoj,\n\nještě jeden klik a budeš mezi prvními, kdo se dozví o volných termínech, akcích a novinkách ze salonu.\n\nOdkaz platí " . NL_PENDING_DAYS . " dní.\n\nMarcus"),
        ['text' => 'Potvrdit odběr', 'url' => $confirm], $unsub, $note);
    return nl_send($email, $subject, $text, $html, null);
}

/** Jedna zpráva newsletteru pro konkrétního odběratele (nebo test). */
/** Tlačítko kampaně: se slevou (podepsaný odkaz), nebo obyčejná rezervace, když je sleva vypnutá. */
function nl_campaign_button(int $campaignId): array {
    $site = nl_config()['site_url'];
    if (nl_discount_on()) {
        $p = nl_config()['sleva_procent'];
        // test (ID 0) vypadá stejně, ale odkaz slevu nenese: kampaň ještě neexistuje
        $url = $campaignId > 0 ? $site . '?nl=' . nl_discount_token($campaignId) . '#rezervace' : $site . '#rezervace';
        return ['text' => "Rezervovat se slevou $p %", 'url' => $url,
            'note' => 'Sleva platí pro rezervaci přes tento e-mail.'];
    }
    return ['text' => 'Rezervovat termín', 'url' => $site . '#rezervace', 'note' => ''];
}

/** Jedna zpráva newsletteru pro konkrétního odběratele (nebo test). */
function nl_campaign_message(string $subject, string $preheader, string $body, bool $button, int $campaignId, string $token): array {
    $unsub = nl_url('odhlasit', $token);
    $note = 'Dostáváš tento e-mail, protože ses přihlásil(a) k odběru novinek na webu Marcus Koky Barber.';
    $btn = $button ? nl_campaign_button($campaignId) : null;
    $text = trim(str_replace("\r", '', $body))
        . ($btn ? "\n\n{$btn['text']}: {$btn['url']}" . ($btn['note'] ? "\n({$btn['note']})" : '') : '')
        . nl_text_footer($unsub, $note);
    if ($preheader === '') $preheader = trim(strtok(trim($body), "\n") ?: '');
    $html = nl_render_html($subject, mb_substr($preheader, 0, 150), nl_body_html($body), $btn, $unsub, $note);
    return [$text, $html, $unsub];
}
