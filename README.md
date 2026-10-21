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
v `og:image`, `og:url` a JSON-LD.

`getOpeningStatus(day, minutes)` v `assets/js/main.js` počítá živý stav otevírací doby (den 0 = neděle)
a stránka mu předává čas v zóně Europe/Prague. Codex funkci ověřil přes všech 10 080 minut týdne.
V headless Chromiu jsou zkontrolované šířky 1440 a 390 px: bez chyb v konzoli a bez vodorovného posuvu.
Ostatní šířky, ovládání klávesnicí a výkon zatím ověřené nejsou.
