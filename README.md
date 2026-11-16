# Marcus Koky Barber

Prémiový jednostránkový web pro barbershop Marcus Koky Barber v Brně (Ponávka Tower). Statické HTML, CSS
a vanilla JavaScript, bez frameworku, build kroku, CDN, analytiky a cookies. Písma Playfair Display (nadpisy)
a Manrope (text) jsou hostovaná lokálně.

Ukázka: https://romankaxo.github.io/marcus-koky-barber/

## Lokální spuštění

```sh
python3 -m http.server 8080
```

Otevři `http://localhost:8080/`. Všechny cesty jsou relativní, takže web funguje v kořeni i v podsložce
`/marcus-koky-barber/` na GitHub Pages. Rezervace se otevírá v novém panelu ve službě Termino, protože ta
nedovoluje vložení do iframe.

## Podklady

- Fakta, ceník, reference a fotky pocházejí ze současného webu marcuskoky.cz (stav 21. 10. 2026).
- `assets/img/`: logo vytažené ze skutečného loga (zlatá a černá varianta), fotka Marcuse a pět fotek střihů
  ze salonu. Fotky nemají barevné filtry ani ztmavující překryvy. `og.jpg` je náhled pro sdílení.
- `assets/fonts/`: Playfair Display a Manrope, licence SIL OFL 1.1, viz `fonts.css`.
- Texty napsal Elaris podle zadání, kód postavil Codex a výsledek doladil Claude.

## Stav

Web je zatím ukázka: obě HTML stránky mají `noindex` a `robots.txt` zakazuje indexaci, aby nekonkurovaly
současné doméně. Před přechodem na marcuskoky.cz je potřeba omezení odstranit a upravit absolutní URL
v `og:image`, `og:url`, canonical, JSON-LD a `sitemap.xml`. Klíčová slova a celý postup jsou v `SEO.md`.

`getOpeningStatus(day, minutes)` v `assets/js/main.js` počítá živý stav otevírací doby (den 0 = neděle)
a stránka mu předává čas v zóně Europe/Prague. Codex funkci ověřil přes všech 10 080 minut týdne.
V headless Chromiu jsou zkontrolované šířky 1440 a 390 px: bez chyb v konzoli a bez vodorovného posuvu.
Ostatní šířky, ovládání klávesnicí a výkon zatím ověřené nejsou.

## Návrh rezervace

`rezervace.html` (+ `assets/css/rezervace.css`, `assets/js/rezervace.js`) je klikací návrh vlastního rezervačního
systému ve stylu webu: služba → termín → údaje (včetně kódu ze Slevomatu) → potvrzení s .ics do kalendáře.
Běží jen v prohlížeči, nic neodesílá, obsazenost je smyšlená. Hlavní web dál odkazuje na Termino.
`spravce.html` je pohled majitele: den (časová osa) a týden, detail klienta, přišel / nepřišel / zrušit, blokování
časů. Ukázkoví klienti jsou smyšlení; rezervace z `rezervace.html` a změny se drží v localStorage prohlížeče.
Pro ostrý provoz chybí server (ukládání, e-maily, správa termínů pro Marcuse) a token Slevomat Partner API
(`voucherCheck` při zadání kódu, `voucherApply` po potvrzení).

## Rezervační okno a formulář (listopad 2026)

- Každé tlačítko „Rezervovat“ otevře okno s formulářem (jméno, telefon a e-mail povinné, služba, den, čas, poznámka,
  souhlas). Na mobilu okno samo vyskočí 1,6 s po příchodu, jednou za návštěvu (ne při odkazu s #kotvou).
- Odeslání: `api/rezervace.php` (PHP `mail()`): e-mail Marcusovi na info@marcuskoky.cz s Reply-To klienta a potvrzení
  klientovi. Honeypot pole `web`, limit 5 odeslání za hodinu z jedné IP. Odesílatel `rezervace@marcuskoky.cz` musí
  hosting povolit (SPF). Na GitHub Pages PHP neběží, formulář tam jen předvede úspěch.
- Odkaz na Termino zůstává v okně jako alternativa a jako záloha bez JavaScriptu.
- Sekce Holiči: Marcus + dvě místa pro další holiče (fotka a text doplníme).
- Animace: nástup úvodu, ceny se načítají od nuly, ikony služeb se vykreslí, pás s ikonami, barberský pruh.
  Vše respektuje `prefers-reduced-motion`.
- Vlastní ikony v `assets/icons/` (nakreslil Codex, náhled `assets/icons/nahled.html`).

## Newsletter (listopad 2026)

Majitel může upozorňovat klienty na volné termíny, akce a novinky. Na GitHub Pages (bez PHP) běží vše v ukázkovém
režimu se štítkem „Návrh“: web nic neodesílá a správce ukazuje smyšlené odběratele uložené jen v prohlížeči.

- **Přihlášení na webu:** blok „Novinky ze salonu“ nad patičkou (`#novinky`) s výslovným souhlasem a odkazem na GDPR.
  V rezervačním okně je nepovinné zaškrtávátko „Chci dostávat novinky“; po úspěšné rezervaci pošle stejné přihlášení.
- **Double opt-in:** `api/newsletter.php` uloží adresu jako nepotvrzenou a pošle potvrzovací e-mail (odkaz platí 7 dní).
  Odpověď je vždy stejná, takže nejde zjistit, kdo už odebírá. Honeypot `web`, limit 5 pokusů za hodinu z IP,
  potvrzení na stejnou adresu nejvýš jednou za 10 minut. Ukládá se znění souhlasu, zdroj a časy (doklad pro GDPR).
- **Odhlášení jedním klikem:** odkaz v každém e-mailu odhlásí hned (GET), hlavičky `List-Unsubscribe`
  a `List-Unsubscribe-Post` (RFC 8058) umí odhlásit i tlačítkem v Gmailu/Outlooku (POST).
- **Správce:** `spravce.html` → záložka Newsletter (`spravce.html#newsletter`). Přihlášení heslem, počty
  a seznam odběratelů s filtrem a mazáním, editor (předmět, text, tlačítko „Rezervovat termín“ vedoucí na
  `/#rezervovat`, které otevře rezervační okno), živý náhled, test na pevnou adresu z nastavení, „Odeslat všem“
  po dávkách s průběhem a historie. Přerušené rozesílání jde dokončit tlačítkem Pokračovat; nikomu nepřijde dvakrát.
- **E-mail:** šablona `assets/email/newsletter.html` (tabulky, inline styly, černá/zlatá) + textová alternativa.
  Stejnou šablonu používá PHP i náhled ve správci. Odesílatel je konstanta `NL_FROM` v `api/lib/newsletter.php`
  (`info@marcuskoky.cz`).
- **Soubory:** `api/newsletter.php` (veřejné), `api/newsletter-admin.php` (správa, session + CSRF),
  `api/lib/newsletter.php` (sdílené), `api/config.example.php`, `assets/js/spravce-newsletter.js`.

### Zprovoznění na hostingu

1. Hosting s PHP 8.2+, `pdo_sqlite` a funkcí `mail()`.
2. `api/config.example.php` zkopíruj jako `mkb-config.php` o složku výš než kořen webu (nejbezpečnější),
   nebo jako `api/config.php` (je v `.gitignore`). Vyplň hash hesla
   (`php -r 'echo password_hash("dlouhe-heslo", PASSWORD_DEFAULT), PHP_EOL;'`), `test_email` a `site_url`.
3. Databáze vznikne sama v `data_dir`. Nejlépe mimo kořen webu; výchozí `api/data/` chrání `.htaccess`
   (Apache). Na Nginx je potřeba zakázat `/api/data/`, `/api/lib/` a `/api/config.php` v konfiguraci serveru.
4. Pro doručitelnost nastav u domény SPF, DKIM a DMARC pro `info@marcuskoky.cz` a zjisti limit odeslaných
   e-mailů za hodinu; podle něj uprav `batch_size`. Při stovkách odběratelů je lepší SMTP služba.

Ověřeno lokálně (`php -S` se `sendmail_path` na skript zapisující e-maily do souboru, nic se neodeslalo):
přihlášení → potvrzovací e-mail → potvrzení → test → rozeslání po dávkách jen potvrzeným → odhlášení odkazem i POST
one-click → smazání ve správci; chybné heslo, chybějící CSRF, honeypot, duplicitní přihlášení a neplatné tokeny.
UI prohlédnuté v headless Chromiu na 1440 a 390 px. Neověřeno: skutečné doručení, vykreslení v Gmailu/Outlooku,
ochrana `.htaccess` (vestavěný server PHP ji ignoruje).
