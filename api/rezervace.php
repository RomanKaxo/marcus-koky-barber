<?php
// Rezervační formulář Marcus Koky Barber: pošle poptávku Marcusovi a potvrzení klientovi.
// Funguje na hostingu s PHP a funkcí mail(). Na GitHub Pages neběží (tam je formulář v režimu ukázky).
declare(strict_types=1);

const TO = 'info@marcuskoky.cz';           // kam chodí rezervace
const FROM = 'rezervace@marcuskoky.cz';    // odesílatel; musí existovat nebo být povolený na hostingu (SPF)
const LIMIT_PER_HOUR = 5;                  // ochrana proti zahlcení z jedné IP

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function reply(int $code, array $body): never {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}
function field(string $name, int $max = 200): string {
    $v = trim((string)($_POST[$name] ?? ''));
    $v = preg_replace('/[\r\n]+/', ' ', $v) ?? '';   // žádné nové řádky v hlavičkových polích
    return mb_substr($v, 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') reply(405, ['ok' => false, 'error' => 'Jen POST.']);
if (!empty($_POST['web'])) reply(200, ['ok' => true]);          // past na roboty: tváří se jako úspěch

$jmeno   = field('jmeno', 80);
$telefon = field('telefon', 30);
$email   = field('email', 120);
$sluzba  = field('sluzba', 120);
$den     = field('den', 10);
$cas     = field('cas', 40);
$pozn    = mb_substr(trim((string)($_POST['poznamka'] ?? '')), 0, 1000);
$souhlas = !empty($_POST['souhlas']);

$chyby = [];
if (mb_strlen($jmeno) < 2) $chyby[] = 'jméno';
if (strlen(preg_replace('/\D/', '', $telefon) ?? '') < 9) $chyby[] = 'telefon';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $chyby[] = 'e-mail';
if ($sluzba === '') $chyby[] = 'služba';
$d = DateTimeImmutable::createFromFormat('!Y-m-d', $den, new DateTimeZone('Europe/Prague'));
if (!$d || $d < new DateTimeImmutable('today', new DateTimeZone('Europe/Prague'))) $chyby[] = 'den';
if (!$souhlas) $chyby[] = 'souhlas';
if ($chyby) reply(422, ['ok' => false, 'error' => 'Zkontroluj: ' . implode(', ', $chyby) . '.']);

// jednoduchý limit podle IP
$ip = $_SERVER['REMOTE_ADDR'] ?? 'x';
$file = sys_get_temp_dir() . '/mkb-rez-' . hash('sha256', $ip);
$times = array_filter(array_map('intval', @file($file, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > time() - 3600);
if (count($times) >= LIMIT_PER_HOUR) reply(429, ['ok' => false, 'error' => 'Moc pokusů za sebou.']);
$times[] = time();
@file_put_contents($file, implode("\n", $times), LOCK_EX);

$dny = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
$kdy = $dny[(int)$d->format('w')] . ' ' . $d->format('j. n. Y') . ', ' . $cas;

$enc = fn(string $s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
$headers = fn(string $replyTo) => implode("\r\n", [
    'From: ' . $enc('Marcus Koky Barber') . ' <' . FROM . '>',
    'Reply-To: ' . $replyTo,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
]);

$proMarcuse = "Nová rezervace z webu\n\n"
    . "Jméno:    $jmeno\nTelefon:  $telefon\nE-mail:   $email\nSlužba:   $sluzba\nKdy:      $kdy\n"
    . ($pozn !== '' ? "Poznámka: $pozn\n" : '')
    . "\nOdpověz na tento e-mail a klientovi termín potvrď.\n";
$ok = mail(TO, $enc("Rezervace: $jmeno, $kdy"), $proMarcuse, $headers($email));
if (!$ok) reply(500, ['ok' => false, 'error' => 'E-mail se nepodařilo odeslat.']);

$proKlienta = "Ahoj $jmeno,\n\ndíky za rezervaci v Marcus Koky Barber. Přišlo mi:\n\n"
    . "Služba: $sluzba\nKdy:    $kdy\n\n"
    . "Termín ti potvrdím telefonem nebo e-mailem. Kdyby se něco změnilo, zavolej na +420 732 165 547.\n\n"
    . "Bratislavská 201/14 (Ponávka Tower), Brno\nMarcus\n";
@mail($email, $enc('Rezervace přijata · Marcus Koky Barber'), $proKlienta, $headers(TO));

reply(200, ['ok' => true]);
