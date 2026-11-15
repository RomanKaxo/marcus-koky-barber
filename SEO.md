# SEO: Marcus Koky Barber

Stav 15. 11. 2026. Web je pořád ukázka na GitHub Pages: `noindex` a `robots.txt` blokují indexaci.
Hledanost jednotlivých slov ověřená není (bez přístupu do Google Ads plánovače klíčových slov),
pořadí níže je odhad podle záměru hledajícího.

## Klíčová slova

**Hlavní (lidé hledají, kam jít, a chtějí se objednat)**
- barbershop Brno, barber Brno
- holič Brno, holičství Brno, pánské holičství Brno
- pánský střih Brno, pánské kadeřnictví Brno

**Služby (zúžené hledání)**
- úprava vousů Brno, holení břitvou Brno, holení horkým ručníkem / hot towel
- fade Brno, skin fade, crop fade, pompadour, slick back (názvy střihů v galerii)
- střih strojkem, střih dlouhých vlasů pro muže, dětský střih Brno, barvení vousů

**Místní (blízkost)**
- barber Zábrdovice, barbershop Ponávka Tower, holič Bratislavská, holič Brno-střed
- jen místa, kde salon opravdu je; žádné cizí čtvrti ani „centrum“

**Značka**
- Marcus Koky, Marcus Koky Barber, marcus_koky_barber

## Kde na webu jsou

| Místo | Slova |
| --- | --- |
| `<title>` | Barbershop a holič Brno · Marcus Koky Barber · Ponávka Tower |
| meta description | pánský barbershop v Brně, Ponávka Tower, Bratislavská, pánský střih, fade, úprava vousů, holení, rezervace online |
| úvod (nadpisek + odstavec) | Barber · Brno · Ponávka Tower, barber z Brna, pánské stříhání |
| služby (h3 + text) | pánský střih nůžkami / strojkem, fade, úprava vousů a holení, břitva, horký ručník |
| ceník | všechny názvy služeb, české i anglické |
| o mně | barbershop v Brně |
| galerie (alt fotek) | pompadour, crop fade, side part fade, skin fade, slick back |
| reference | „barber shop v Brně“ (skutečná recenze, neměnit) |
| JSON-LD `BarberShop` | adresa, otevírací doba, areaServed Brno, ceník 14 služeb s cenami, ReserveAction na Termino |

Poetické nadpisy (Království s černou duší…) zůstaly záměrně, jsou to značka. Klíčová slova nesou
title, description, podnadpisky a texty.

## Před spuštěním na marcuskoky.cz

1. Smazat `<meta name="robots" content="noindex">` v `index.html` (v `404.html` nechat).
2. `robots.txt` přepsat na:
   ```
   User-agent: *
   Allow: /
   Sitemap: https://www.marcuskoky.cz/sitemap.xml
   ```
3. Nahradit `https://romankaxo.github.io/marcus-koky-barber/` za `https://www.marcuskoky.cz/` v canonical,
   `og:url`, `og:image`, JSON-LD (`@id`, `url`, `image`) a `sitemap.xml`.
4. Starý web: zachovat adresu `/gdpr/` (odkaz v patičce) a staré podstránky přesměrovat 301 na novou.
5. Google Search Console: ověřit doménu, odeslat sitemap, zkontrolovat Test výsledků s bohatým obsahem.

## Mimo web (pro místní hledání váží nejvíc)

- **Profil firmy na Google (Mapy):** stejný název, adresa a telefon jako na webu, kategorie
  „Holičství“, odkaz na web a na rezervaci Termino, fotky střihů, otevírací doba, služby s cenami.
- **Recenze na Google:** prosit spokojené klienty o hodnocení (odkaz z profilu, QR v salonu).
  Nikdy nepsat ani nekupovat vlastní recenze.
- **Stejné údaje všude:** Firmy.cz (Seznam), Instagram, Facebook, Termino. Adresa jednou podobou.
  Pozor: web uvádí 201/14, jinde se objevuje 14a; před zápisem do katalogů sjednotit s Marcusem.
- **Seznam:** Firmy.cz je pro české hledání skoro stejně důležitý jako Google.
