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
- `assets/img/`: logo vytažené ze skutečného loga (zlatá a černá varianta), fotka Marcuse (na webu se už nezobrazuje) a pět fotek střihů
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
`spravce.html` je pohled majitele, navržený hlavně pro mobil: karta „Další klient“ s odpočtem a Zavolat, rozpis dne
s akcemi přímo na kartě (Zavolat, Přišel, Nepřišel, Zrušit s vrácením), volné časy s „+ Přidat“ pro telefon a walk-in
(ukládá do `mkb-rezervace`, takže je termín obsazený i na `rezervace.html`), filtr holičů (zatím zástupní Holič 2 a 3),
týden s vytížením dnů, hledání klienta na 14 dní a detail s počtem návštěv. Blokování časů je na přání majitele pryč.
Ukázkoví klienti jsou smyšlení; rezervace z `rezervace.html` a změny se drží v localStorage prohlížeče.
Pro ostrý provoz chybí server (ukládání, e-maily, správa termínů pro Marcuse) a token Slevomat Partner API
(`voucherCheck` při zadání kódu, `voucherApply` po potvrzení).

## Rezervační okno a formulář (listopad 2026)

- Každé tlačítko „Rezervovat“ otevře okno s formulářem (jméno, telefon a e-mail povinné, služba, den, čas, poznámka,
  souhlas). Na mobilu okno samo vyskočí 1,6 s po příchodu, jednou za návštěvu (ne při odkazu s #kotvou).
- Odeslání: `api/rezervace.php` (PHP `mail()`): e-mail Marcusovi na info@marcuskoky.cz s Reply-To klienta a potvrzení
  klientovi. Honeypot pole `web`, limit 5 odeslání za hodinu z jedné IP. Odesílatel `rezervace@marcuskoky.cz` musí
  hosting povolit (SPF). Na GitHub Pages PHP neběží, formulář tam jen předvede úspěch.
- Odkaz na Termino zůstává v okně jako alternativa a jako záloha bez JavaScriptu.
- Sekce Holiči: Marcus, Michal a Elos, zatím bez fotek (viz oddíl níže).
- Animace: nástup úvodu, ceny se načítají od nuly, ikony služeb se vykreslí, pás s ikonami, barberský pruh.
  Vše respektuje `prefers-reduced-motion`.
- Vlastní ikony v `assets/icons/` (nakreslil Codex, náhled `assets/icons/nahled.html`).

## Úvod s videem, holiči bez fotek, výběr holiče (24. 11. 2026)

Úpravy podle připomínek majitele. Fotka Marcuse (`marcus-studio.jpg`) už na webu není vidět: úvod má video
z interiéru, sekce Holiči a výběr holiče mají štítky s iniciálou, uvítací okno má snímek interiéru. Soubor
v `assets/img/` zůstává kvůli `og.jpg` a e-mailu (`email-hero.jpg`).

### Video v úvodu

Soubory ve složce `assets/video/`:

| Soubor | Formát |
| --- | --- |
| `hero.mp4` | H.264 (MP4, `faststart`), bez zvukové stopy, 30 fps, do 8 MB, smyčka 10–30 s |
| `hero.webm` | VP9, bez zvuku, stejný střih (prohlížeč si vybere, WebM je první) |
| `hero-poster.jpg` | jeden snímek z videa, stejný poměr stran; ukazuje se před načtením, při omezení pohybu a bez JS |

- Ideál je 1080p. Současné video je na výšku 360×640 (9:16), proto běží v úzkém rámečku vedle nadpisu
  (300–400 px na desktopu, 230–300 px na tabletu) a na mobilu jako pruh přes šířku nad textem. Přes celou šířku
  desktopu by bylo rozmazané. Až bude video ve vyšším rozlišení, stačí vyměnit soubory; pro video na šířku uprav
  `aspect-ratio` u `.hero-media` v `assets/css/style.css` a atributy `width`/`height` u `<video>` a posteru.
- Převod ze zdroje:
  `ffmpeg -i zdroj.mov -an -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart hero.mp4`,
  `ffmpeg -i zdroj.mov -an -c:v libvpx-vp9 -crf 34 -b:v 0 hero.webm`,
  `ffmpeg -ss 4 -i hero.mp4 -frames:v 1 -q:v 3 hero-poster.jpg`.
- Chování (`assets/js/rozsireni.js`, blok „úvod: video z interiéru“): `<video muted loop playsinline
  preload="metadata" poster>` má zdroje v `data-src`. Načtou se, až je rámeček vidět (IntersectionObserver),
  video hraje jen ve viditelné části stránky a jde pozastavit tlačítkem v rohu. Atribut `autoplay` v HTML
  záměrně není: při `prefers-reduced-motion` se nic nenačte a zůstane poster s tlačítkem Přehrát.
- Když soubor chybí nebo ho prohlížeč nepřehraje, zůstane poster, který se pomalu přibližuje (CSS `drift`).

### Holiči bez fotek a pozdější vložení fotky

Místo fotky má každý holič štítek (`.barber-plate`): velká iniciála v Playfair, citát z jeho textu, Instagram
a krátký popisek. Stejná iniciála je ve výběru holiče v rezervačním okně (`.bd-barber-pic`).

Fotku vložíš jedním atributem, na obou místech stejně:

```html
<figure class="barber-photo barber-plate" data-photo="assets/img/holic-michal.jpg">
<span class="bd-barber-pic" data-photo="assets/img/holic-michal.jpg" aria-hidden="true">M</span>
```

Skript přidá obrázek a třídu `.has-photo`; iniciála a citát se schovají, pruh s Instagramem zůstane. Když se
fotka nenačte, vrátí se štítek. Doporučený formát: na šířku 4:3 (na mobilu se ořízne na 4:5), aspoň 1280 px,
obličej v horní třetině. Popis pro čtečky jde doplnit atributem `data-photo-alt`.

### Výběr holiče a uvítací okno

- Výběr holiče: tři karty (Marcus, Michal, Elos) přijíždějí střídavě zleva a zprava (560 ms, po 100 ms za
  sebou), „Je mi to jedno“ je menší volba pod nimi. Elos dál vede na Reservio v novém okně (`data-elos`),
  ostatní pokračují do formuláře (`data-holic`).
- Uvítací okno: žluté tlačítko „Zavřít ✕“ (48 px vysoké) je pevně v pravém horním rohu okna a neodjíždí
  s obsahem. Okno se zavře i klikem mimo a klávesou Esc. V okně jsou dvě nabídky první návštěvy vedle sebe
  (na mobilu pod sebou): střih 499 Kč místo 640 Kč a kompletka 799 Kč místo 1 120 Kč (stejně jako ceník a zbytek webu).
- Ověřeno v headless Chromiu na 1440 a 390 px (plus 820, 1100, 1920 a nízké výšky): bez chyb v konzoli a bez
  vodorovného posuvu, s omezením pohybu se video nenačte a karty stojí na místě. Neověřeno: Safari na iPhonu
  (automatické spuštění videa), skutečné fotky holičů.

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
  a seznam odběratelů s filtrem a mazáním, editor (šablony, předmět, preheader, text, velké tlačítko na
  rezervaci se slevou), živý náhled, test na pevnou adresu z nastavení, „Odeslat všem“
  po dávkách s průběhem a historie. Přerušené rozesílání jde dokončit tlačítkem Pokračovat; nikomu nepřijde dvakrát.
- **E-mail:** šablona `assets/email/newsletter.html` (tabulky, inline styly, černá/zlatá) + textová alternativa.
  Stejnou šablonu používá PHP i náhled ve správci. Odesílatel je konstanta `NL_FROM` v `api/lib/newsletter.php`
  (`info@marcuskoky.cz`).
- **Soubory:** `api/newsletter.php` (veřejné), `api/newsletter-admin.php` (správa, session + CSRF),
  `api/lib/newsletter.php` (sdílené), `api/config.example.php`, `assets/js/spravce-newsletter.js`.

### Sleva 5 % z newsletteru a šablony (listopad 2026)

- **E-mail:** fotka nahoře (`assets/img/email-hero.jpg`, výřez z `marcus-studio.jpg`, tmavé pozadí a alt jako záloha),
  velký nadpis, text, jedno velké tlačítko přes celou šířku „Rezervovat se slevou 5 %“ (bulletproof, ve Outlooku VML)
  a pod ním „Sleva platí pro rezervaci přes tento e-mail.“ Odkazy jsou jen dva: tlačítko a odhlášení. Šablona umí
  preheader (náhledový text ve schránce).
- **Sleva:** tlačítko vede na `./?nl=<id>-<HMAC>#rezervace`. Token je podepsaný tajemstvím `secret` z configu,
  takže si ho nikdo nevyrobí ručně. Web ho ověří přes `api/newsletter.php?a=sleva`, otevře rezervační okno se štítkem
  „Sleva 5 % z newsletteru“ a v souhrnu ukáže přeškrtnutou a novou cenu (zaokrouhleno na celé Kč, polovina nahoru).
  `api/rezervace.php` token ověří znovu (podpis, existující kampaň, platnost `sleva_dni`, výchozí 30 dní) a do e-mailu
  Marcusovi i klientovi napíše „Sleva 5 % z newsletteru: X Kč místo Y Kč“. Neplatný odkaz rezervaci neblokuje,
  jen se sleva neuplatní (Marcus to vidí v e-mailu). Na první návštěvu a 14denní restart se sleva nevztahuje.
- **Procento:** jediné nastavení je `sleva_procent` v configu (výchozí 5). Bez `secret` (min. 32 znaků) je sleva
  vypnutá a tlačítko vede na obyčejnou rezervaci. Pevně napsané „5 %“ zůstává jen v textech webu (blok Novinky
  v `index.html`, oddíl v `podminky.html`) a v ukázkovém režimu (`DEMO_DISCOUNT` v JS); při změně je uprav také.
- **Šablony ve správci:** `assets/email/sablony.json` (Dlouho jsi tu nebyl, Uvolnily se termíny, Novinka v salonu).
  Výběr nad editorem vyplní předmět (s přepínáním alternativ), preheader a text; `{sleva}` se nahradí procentem.
  Místa `[DOPLŇ …]` musí Marcus přepsat, jinak správce e-mail neodešle. Novou šablonu stačí přidat do JSON.
- Test e-mail má stejné tlačítko, ale jeho odkaz slevu nenese (kampaň ještě neexistuje).

### Zprovoznění na hostingu

1. Hosting s PHP 8.2+, `pdo_sqlite` a funkcí `mail()`.
2. `api/config.example.php` zkopíruj jako `mkb-config.php` o složku výš než kořen webu (nejbezpečnější),
   nebo jako `api/config.php` (je v `.gitignore`). Vyplň hash hesla
   (`php -r 'echo password_hash("dlouhe-heslo", PASSWORD_DEFAULT), PHP_EOL;'`), `test_email`, `site_url`
   a `secret` pro slevové odkazy (`php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'`).
3. Databáze vznikne sama v `data_dir`. Nejlépe mimo kořen webu; výchozí `api/data/` chrání `.htaccess`
   (Apache). Na Nginx je potřeba zakázat `/api/data/`, `/api/lib/` a `/api/config.php` v konfiguraci serveru.
4. Pro doručitelnost nastav u domény SPF, DKIM a DMARC pro `info@marcuskoky.cz` a zjisti limit odeslaných
   e-mailů za hodinu; podle něj uprav `batch_size`. Při stovkách odběratelů je lepší SMTP služba.

Ověřeno lokálně (`php -S` se `sendmail_path` na skript zapisující e-maily do souboru, nic se neodeslalo):
přihlášení → potvrzovací e-mail → potvrzení → test → rozeslání po dávkách jen potvrzeným → odhlášení odkazem i POST
one-click → smazání ve správci; chybné heslo, chybějící CSRF, honeypot, duplicitní přihlášení a neplatné tokeny.
UI prohlédnuté v headless Chromiu na 1440 a 390 px. Neověřeno: skutečné doručení, vykreslení v Gmailu/Outlooku,
ochrana `.htaccess` (vestavěný server PHP ji ignoruje).

## Právní stránky (listopad 2026)

`gdpr.html` (Zásady ochrany osobních údajů) a `podminky.html` (Podmínky rezervace a služeb) sdílejí vzhled
z `assets/css/pravni.css`: obsah vlevo (na mobilu nahoře), číslované oddíly, tisk černě na bílém. Obě stránky jsou
koncept, ne právní posudek, a účinné mají být od 1. 12. 2026. Všechno, co musí provozovatel doplnit nebo potvrdit,
je na stránkách vyznačené žlutě (`.doplnit` v textu, `.pozn` jako poznámka). Poznámky `.pozn` po vyřešení smaž.

Zásady ochrany osobních údajů (`gdpr.html`):

- potvrdit navržené doby uložení: rezervace 12 měsíců od termínu, komunikace 12 měsíců, nepotvrzené přihlášky
  k newsletteru 30 dnů, záznam o souhlasu po odhlášení 3 roky; podle nich nastavit mazání (schránka, databáze
  newsletteru se dnes sama nečistí),
- ověřit roli služby Termino (samostatný správce, nebo zpracovatel se zpracovatelskou smlouvou),
- doplnit název poskytovatele hostingu a e-mailu a ověřit zpracovatelskou smlouvu a umístění dat v EU,
- doplnit, jak dlouho hosting uchovává záznamy o přístupech (logy serveru),
- pokud si klienty ukládá jinam (kontakty v telefonu, historie střihů), doplnit účel a dobu.

Podmínky rezervace a služeb (`podminky.html`):

- kdy je závazná rezervace přes Termino,
- plátce DPH ano/ne (věta o cenách), způsoby platby na místě,
- pravidla 14denního restartu (od kdy se počítá, po jakých službách, kombinace s voucherem),
- dětský střih: věkové rozmezí, doprovod dospělého,
- vouchery Slevomat a dárkové poukazy (nebo celou část smazat),
- pozdní příchod, zrušení/přesun zdarma, nedostavení se (poplatek ano/ne),
- lhůta pro ohlášení vady při reklamaci.

`404.html` má inline skript, který nastaví `<base>` na `/marcus-koky-barber/` (GitHub Pages) nebo na `/`,
takže styly, obrázky a odkazy fungují i z hluboké chybějící adresy. Na vlastní doméně musí server vracet
`404.html` z kořene webu (např. `ErrorDocument 404 /404.html` v `.htaccess`); pokud by web běžel v jiné podsložce,
je potřeba upravit proměnnou `sub` ve skriptu. Obě právní stránky jsou v `sitemap.xml`.
