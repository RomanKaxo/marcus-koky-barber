#!/usr/bin/env python3
"""Generate the Marcus Koky Barber v2 (Claude) icon set + preview."""
import math, os, re, sys

OUT = "/home/roman/Projects/marcus-koky-barber/assets/icons-v2-claude"
os.makedirs(OUT, exist_ok=True)

M, D, H = "1.75", "1", "0.75"  # main outline, detail, hatch


def f(x):
    s = f"{x:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


def p(d, w=M, extra=""):
    return f'<path d="{d}" stroke-width="{w}"{extra}/>'


def c(cx, cy, r, w=D):
    return f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" stroke-width="{w}"/>'


def dot(cx, cy, r=0.9):
    return f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="currentColor" stroke="none"/>'


def lines(segs, w=H):
    return p(" ".join(f"M{f(a)} {f(b)}L{f(cc)} {f(d)}" for a, b, cc, d in segs), w)


ICONS = {}

# ---------------------------------------------------------------- nuzky
def nuzky():
    e = []
    # blades (upper tip, lower tip), pivot ~ (30,34)
    e.append(p("M27.5 33.5C35 25 45 15 56 6.5C52 15 43 26 33.5 36.5C31.5 37 28.5 35.5 27.5 33.5Z"))
    e.append(p("M29.5 37C39 32.5 49 28 59 25.5C52 31 42.5 36.5 32.5 40.5C30.5 40.5 29 39 29.5 37Z"))
    # bevel + spine engraving
    e.append(p("M33 31.5L52 11.5M35.5 37.5L54 28.5", H))
    e.append(lines([(44 + i * 2.2, 22 - i * 2.1, 45.6 + i * 2.2, 23.4 - i * 2.1) for i in range(3)]))
    # shanks to rings
    e.append(p("M28.5 36.5C26 40 23.5 43 21.5 45.5M31 38.5C28.5 41.5 26 44.5 23.8 47.2"))
    e.append(p("M29 39C25 39.6 21 40 17.6 40.4M28.5 36C24.5 36.6 20.8 37.2 17.2 37.6"))
    # rings (thumb ring rounder, finger ring oval)
    e.append(p("M21.5 45.5C24.7 47.3 25.3 51.5 23.3 54.6C21.3 57.7 17 58.6 13.9 56.6C10.8 54.6 10.2 50.4 12.3 47.5C14.4 44.6 18.5 43.8 21.5 45.5Z"))
    e.append(c(17.8, 51.2, 3.6, D))
    e.append(p("M17.4 37.5C17.6 34.5 15.5 31.4 12 31.1C8.5 30.8 5.6 33.3 5.5 36.6C5.4 39.9 8 42.3 11.5 42.4C14.3 42.5 16.6 41.6 17.6 40.4", M))
    e.append(c(11.4, 36.8, 3.2, D))
    # finger tang
    e.append(p("M7.5 42C6 44.5 5.5 47.5 6.5 50.5", D))
    e.append(dot(6.7, 51, 1.1))
    # pivot screw
    e.append(c(30.2, 36.4, 2.6, D))
    e.append(p("M28.6 37.8L31.8 35", H))
    # sparkle on tip
    e.append(p("M55 13v3.2M53.4 14.6h3.2", H))
    return e

# ---------------------------------------------------------------- strojek
def strojek():
    e = []
    # body (Senior-type: wide shoulders, tapering waist)
    e.append(p("M18.5 19.5C18.5 17.5 19.8 16.5 21.5 16.5H42.5C44.2 16.5 45.5 17.5 45.5 19.5L43 51.5C42.7 55 40.5 57 37 57H27C23.5 57 21.3 55 21 51.5Z"))
    # blade head + comb guard
    e.append(p("M17 16.5H47M19.5 16.5V13.5H44.5V16.5", D))
    e.append(lines([(21.3 + i * 2.13, 13.5, 21.3 + i * 2.13, 11) for i in range(11)], H))
    e.append(p("M16.5 16.5C16 11 18 6.5 22 5H42C46 6.5 48 11 47.5 16.5"))
    e.append(lines([(22 + i * 4, 5.5, 22 + i * 4, 13.5) for i in range(6)], D))
    # blade screws
    for x in (25, 39):
        e.append(c(x, 20.5, 1.6, D))
        e.append(p(f"M{x-1} {f(21.5)}L{x+1} 19.5", H))
    # badge plate
    e.append(p("M27 26.5H37C38 26.5 38.5 27 38.5 28V33C38.5 34 38 34.5 37 34.5H27C26 34.5 25.5 34 25.5 33V28C25.5 27 26 26.5 27 26.5Z", D))
    e.append(p("M29 30.5L32 28.5L35 30.5L32 32.5Z", H))
    # power switch on side
    e.append(p("M45 27.5H47.5V35H44.4", D))
    e.append(dot(46.4, 29.5, 0.7))
    # knurled grip
    e.append(lines([(22.5 + (i * 0.12), 40 + i * 2, 41.5 - (i * 0.12), 40 + i * 2) for i in range(6)], H))
    # highlight
    e.append(p("M22.3 21.5L23.6 37", D))
    # cord
    e.append(p("M29.5 57V58.5H34.5V57", D))
    e.append(p("M32 58.5C32 61 34.5 61.5 37 61.5S41 62 42 60.5", D))
    return e

# ---------------------------------------------------------------- britva
def britva():
    e = []
    # blade + shank: square spine, rounded toe, hollow edge, smile at the heel
    e.append(p("M15.5 22.5H55C57.5 22.5 59 24 59 26.5V32C59 34 57.5 35.5 55.5 35.4L28 34.4C25.5 34.3 24.4 32.6 23.4 30.8C22.6 29.6 21.6 29.3 20.3 29.3H16.4"))
    # spine line + edge bevel
    e.append(p("M23 25.4H56", D))
    e.append(p("M27.5 32.3L56.6 33.3", H))
    # etched scroll ornament on blade face
    e.append(p("M30 29C31.5 27 34 27 35 28.7C36 30.4 38.5 30.4 39.8 28.7C41 27 43.6 27 44.8 28.7C45.8 30.2 48 30.2 49.2 28.9", H))
    e.append(dot(28.4, 29, 0.6))
    e.append(dot(51, 28.6, 0.6))
    # tang tail with jimps
    e.append(p("M15.5 22.5C11.5 21.6 8 22.6 5.8 25.1C5.2 25.8 5.8 26.8 6.7 26.3C8.4 25.4 10.3 25 12 25", D))
    e.append(lines([(8.2 + i * 1.5, 22.9 - i * 0.3, 8.6 + i * 1.5, 24.4 - i * 0.3) for i in range(3)], H))
    # scales hanging down-left from the pivot
    e.append(p("M16.7 26.5C16.4 32 15.4 37 14.5 42.2C13.6 47 12 52 10.6 57.5C10 59.8 6 60 5.5 57.3C5.8 52 6.6 46.5 7.5 40.8C8.4 35.5 9.8 30 11.3 25.5C12.3 23.5 15.7 23.8 16.7 26.5Z"))
    e.append(p("M13.2 31.5C12.2 38 10.8 45 8.8 52.5", H))
    # pivot pin + end pin
    e.append(c(14, 27, 1.7, D))
    e.append(dot(14, 27, 0.7))
    e.append(c(8.1, 56.2, 1.3, D))
    e.append(dot(8.1, 56.2, 0.55))
    return e

# ---------------------------------------------------------------- kreslo
def kreslo():
    e = []
    # headrest
    e.append(p("M43 6.5C43 5 44 4 45.5 4H53.5C55 4 56 5 56 6.5S55 9 53.5 9H45.5C44 9 43 8 43 6.5Z"))
    e.append(p("M48.5 9V12.5M51 9V12", D))
    # backrest, tufted
    e.append(p("M39.5 34.5L42.2 14.2C42.5 12 44.5 10.7 46.7 11L52.4 11.7C54.6 12 56 14 55.6 16.2L52.3 34.5"))
    e.append(p("M46.6 13.6L44.3 24.6M51.8 14.2L49.8 24.6", H))
    for x, y in ((48.7, 16.4), (47.6, 21.4)):
        e.append(dot(x, y, 0.75))
    # seat cushion with piping stitch
    e.append(p("M13 37.5C13 35.8 14.3 34.5 16 34.5H47.5C49.5 34.5 51 36 51 38V40C51 41.7 49.7 43 48 43H15.5C14.1 43 13 41.9 13 40.5Z"))
    e.append(lines([(17 + i * 3.2, 38.6, 18.6 + i * 3.2, 38.6) for i in range(10)], H))
    # armrest + support
    e.append(p("M44.5 25H18.5C16.6 25 15.3 26.3 15.3 28S16.6 31 18.5 31H44", M))
    e.append(p("M19.5 31V34.5M41 31V34.5", D))
    e.append(dot(18.4, 28, 0.8))
    # footrest
    e.append(p("M15 43L11 51.5", M))
    e.append(p("M5.5 51.5H15.5", M))
    e.append(lines([(7 + i * 2, 53.5, 8 + i * 2, 51.5) for i in range(4)], H))
    # hydraulic column with chrome rings
    e.append(p("M28.5 43V54M36 43V54", M))
    e.append(lines([(28.5, 46, 36, 46), (28.5, 49.5, 36, 49.5)], H))
    e.append(p("M33.6 44.5V53", H))
    # pump pedal (foot bail)
    e.append(p("M36 51.5L44.5 49.5H48", D))
    # base dome
    e.append(p("M15 60H50C49.5 56.5 42.5 54 32.3 54S15.5 56.5 15 60Z"))
    e.append(p("M21 58C24 56.8 28 56.3 32.3 56.3", H))
    return e

# ---------------------------------------------------------------- hreben
def hreben():
    e = []
    # slim spine, rounded ends, gently arched top
    e.append(p("M6 29V26.5C6 24.2 7.8 23 10 22.6C18 21.5 46 21.5 54 22.6C56.2 23 58 24.2 58 26.5V29Z"))
    e.append(p("M10.5 25.6C20 24.8 44 24.8 53.5 25.6", H))
    # teeth: all the same length, coarse spacing left, fine spacing right
    e.append(p("".join(f"M{f(8 + i * 3.8)} 29V42" for i in range(6)), M))
    e.append(p("".join(f"M{f(31 + i * 3)} 29V42" for i in range(9)), D))
    return e

# ---------------------------------------------------------------- rucnik
def rucnik():
    e = []
    # roll body
    e.append(p("M19 31.5H48.5C53 31.5 56 36.5 56 42S53 52.5 48.5 52.5H19"))
    # end spiral
    e.append(p("M19 31.5C13.5 31.5 9.5 36.2 9.5 42S13.5 52.5 19 52.5S28.5 47.8 28.5 42S24.7 33.9 19.6 33.9C15.3 33.9 12.3 37.6 12.3 42S15.4 49.8 19.2 49.8S25.6 46.4 25.6 42.2S22.9 36.6 19.6 36.6S14.6 39.2 14.6 42.4S16.8 47.2 19.4 47.2S23.1 44.8 23.1 42.4S21.4 39.4 19.6 39.4", D))
    # woven texture + stripe band
    e.append(lines([(32 + i * 2.6, 32.6, 32 + i * 2.6, 51.4) for i in range(3)], H))
    e.append(p("M43.5 31.5V52.5M46.5 31.6V52.4", D))
    # fringe at the tail edge
    e.append(lines([(53.8 + (i % 2) * 0.2, 35 + i * 3.4, 56.4, 34.8 + i * 3.4) for i in range(5)], H))
    # tray
    e.append(p("M5 56H59M8 56C8.5 58 10 59 12 59H52C54 59 55.5 58 56 56", D))
    # steam
    e.append(p("M20 26C17 23 23 20 20 16.5S19 10 21 7.5"))
    e.append(p("M31 26C28 23 34 20 31 16.5S30 10 32 7.5", D))
    e.append(p("M42 26C39 23 45 20 42 16.5S41 10 43 7.5"))
    return e

# ---------------------------------------------------------------- stetka
def stetka():
    e = []
    # bristle knot (bulb)
    e.append(p("M21 30C17 25 16.5 16 22 10.5C25.5 7 29 5.8 32 5.8S38.5 7 42 10.5C47.5 16 47 25 43 30"))
    # bristle texture fanning out of the ferrule
    for d in ("M25 30C23 23 23.5 15 27 10", "M29 30C28 23 28.5 15 30.5 8.5",
              "M33 30C33.5 23 34 15 33.6 7.6", "M37 30C38.5 23 39.5 16 37.5 9.5",
              "M41 30C42.5 24 43 18 41 12.2", "M22 29C20.8 24 21 18 22.8 14"):
        e.append(p(d, H))
    e.append(dot(28.5, 12.5, 0.6))
    e.append(dot(35.8, 14, 0.6))
    # ferrule
    e.append(p("M18.5 30H45.5V34.5H18.5Z", M))
    e.append(p("M18.5 32.3H45.5", H))
    # turned handle
    e.append(p("M21 34.5C24.5 38.5 26.2 42.2 25.4 45.8C24.7 49 21 51 20.5 55H43.5C43 51 39.3 49 38.6 45.8C37.8 42.2 39.5 38.5 43 34.5"))
    e.append(p("M24.6 41H39.4M24.9 45.5H39.1", H))
    e.append(p("M27.6 37.5C28.8 40.5 29.1 44 28.4 47", D))
    # foot
    e.append(p("M18 55H46V57.5C46 58.6 45.1 59.5 44 59.5H20C18.9 59.5 18 58.6 18 57.5Z", M))
    return e

# ---------------------------------------------------------------- vousy
def vousy():
    e = []
    # one beard silhouette: short sideburns with rounded tops, full rounded-point beard
    e.append(p("M43.6 28.6C45 24 45.8 19 46 14C46.1 11.8 47.3 10.5 48.9 10.5S51.7 11.8 51.7 14C51.8 22 51.6 29.5 49.5 37.5C47 48 40.5 56.5 32 60C23.5 56.5 17 48 14.5 37.5C12.4 29.5 12.2 22 12.3 14C12.3 11.8 13.5 10.5 15.1 10.5S17.9 11.8 18 14C18.2 19 19 24 20.4 28.6"))
    # handlebar moustache with curled ends
    e.append(p("M32 29C28.5 26.5 23 26.3 19.5 29.5C17.5 31.4 15 31.7 13.6 29.8C13.2 29.2 13.9 28.5 14.4 29C15 29.6 16 29.3 16 28.5C15 33.6 19.5 35.5 23.5 34.6C26.8 33.9 29.5 32.4 32 32.4C34.5 32.4 37.2 33.9 40.5 34.6C44.5 35.5 49 33.6 48 28.5C48 29.3 49 29.6 49.6 29C50.1 28.5 50.8 29.2 50.4 29.8C49 31.7 46.5 31.4 44.5 29.5C41 26.3 35.5 26.5 32 29Z"))
    e.append(p("M22 30.6C25 29.4 28.4 29.6 31 31M42 30.6C39 29.4 35.6 29.6 33 31", H))
    # strand texture, only inside the beard
    for d in ("M19.5 38C20 44 22.5 49 26.5 53", "M24.5 38.5C25 44.5 27.5 50 31 55.5",
              "M32 37.5V57", "M39.5 38.5C39 44.5 36.5 50 33 55.5", "M44.5 38C44 44 41.5 49 37.5 53",
              "M15.2 15V26", "M48.8 15V26", "M28 37C28.4 41 29 44 30 47", "M36 37C35.6 41 35 44 34 47"):
        e.append(p(d, H))
    return e

# ---------------------------------------------------------------- koruna
def koruna():
    e = []
    e.append(p("M13 45L8.5 20L21 31L32 13L43 31L55.5 20L51 45Z"))
    # orbs on points + cross on top
    e.append(c(8.2, 17.6, 2.1, D))
    e.append(c(55.8, 17.6, 2.1, D))
    e.append(p("M32 4.5V10.5M29.5 7.2H34.5", D))
    e.append(dot(8.2, 17.6, 0.8))
    e.append(dot(55.8, 17.6, 0.8))
    # inner jewels (teardrops) in each arch
    for x, y in ((17.5, 37), (32, 30), (46.5, 37)):
        e.append(p(f"M{f(x)} {f(y-3.4)}C{f(x+2.4)} {f(y)} {f(x+1.8)} {f(y+2.4)} {f(x)} {f(y+2.4)}S{f(x-2.4)} {f(y)} {f(x)} {f(y-3.4)}Z", D))
    # band
    e.append(p("M11 45H53C54.1 45 55 45.9 55 47V52C55 53.1 54.1 54 53 54H11C9.9 54 9 53.1 9 52V47C9 45.9 9.9 45 11 45Z"))
    e.append(p("M28.5 49.5L32 47L35.5 49.5L32 52Z", D))
    for x in (18, 46):
        e.append(c(x, 49.5, 1.7, D))
        e.append(dot(x, 49.5, 0.6))
    e.append(lines([(12.5 + i * 1.6, 47, 12.5 + i * 1.6, 52) for i in (0, 1)] +
                   [(22 + i * 1.6, 47, 22 + i * 1.6, 52) for i in (0, 1, 2)] +
                   [(39.2 + i * 1.6, 47, 39.2 + i * 1.6, 52) for i in (0, 1, 2)] +
                   [(49.9 + i * 1.6, 47, 49.9 + i * 1.6, 52) for i in (0, 1)], H))
    # hatching on right flank of each point (shade)
    e.append(p("M15.6 42.5L12.6 25.5L21.6 33.8L32 17L42.4 33.8L51.4 25.5L48.4 42.5", H))
    return e

# ---------------------------------------------------------------- kava
def kava():
    e = []
    # cup
    e.append(p("M11 30H43V35C43 44.5 37 50.5 27 50.5S11 44.5 11 35Z"))
    e.append(p("M11 30C11 31.6 18.2 32.8 27 32.8S43 31.6 43 30", D))
    # handle
    e.append(p("M43 34C48.5 32.5 52.5 34.5 52 39C51.5 43 47.5 45 41.6 44"))
    e.append(p("M43 37C46.5 36.3 48.8 37.2 48.6 39.3C48.4 41 46.4 41.8 42.6 41.4", D))
    # ornament band + shading hatch
    e.append(p("M11.4 37H42.6", H))
    for x in (15, 21, 27, 33, 39):
        e.append(dot(x, 39.3, 0.6))
    e.append(p("M39.6 40.5C39 44.6 36.4 47.3 32.6 48.3", H))
    # saucer
    e.append(p("M5 52.5C5 55.3 15 57.5 28.5 57.5S52 55.3 52 52.5"))
    e.append(p("M5 52.5C9 51 14 50.6 17.5 50.4M39.5 50.4C43 50.6 48 51 52 52.5", D))
    e.append(p("M14 55.2C20 56.2 37 56.2 43 55.2", H))
    # steam
    e.append(p("M21 26C18.5 23 23.5 20.5 21 17.5S20 11.5 22 9"))
    e.append(p("M28.5 25C26 22 31 19 28.5 15.5S27.5 8.5 29.5 5.5", D))
    e.append(p("M35.5 26C33 23 38 20.5 35.5 17.5S34.5 11.5 36.5 9"))
    return e

# ---------------------------------------------------------------- pomada
def pomada():
    e = []
    # lid top ellipse
    e.append(p("M10 23C10 19.1 19.8 16 32 16S54 19.1 54 23S44.2 30 32 30S10 26.9 10 23Z"))
    # lid skirt
    e.append(p("M10 23V28.5C10 32.4 19.8 35.5 32 35.5S54 32.4 54 28.5V23"))
    # knurled edge
    e.append(lines([(12.5 + i * 3.25, 27.2 + 2.5 * math.sin(math.pi * (i + 0.5) / 13) - 0.3, 12.5 + i * 3.25,
                     30.4 + 3.6 * math.sin(math.pi * (i + 0.5) / 13) - 0.3) for i in range(13)], H))
    # embossed medallion on lid with a little moustache
    e.append(p("M19 23C19 21 24.8 19.6 32 19.6S45 21 45 23S39.2 26.4 32 26.4S19 25 19 23Z", D))
    e.append(p("M32 22.6C30 21.5 27.5 21.6 26.3 22.8C25.6 23.5 24.6 23.4 24.4 22.6C24.6 24.5 27.5 24.6 29.5 24C30.6 23.7 31.3 23.5 32 23.5C32.7 23.5 33.4 23.7 34.5 24C36.5 24.6 39.4 24.5 39.6 22.6C39.4 23.4 38.4 23.5 37.7 22.8C36.5 21.6 34 21.5 32 22.6Z", H))
    # tin body
    e.append(p("M11.5 33V44.5C11.5 48.4 20.7 51.5 32 51.5S52.5 48.4 52.5 44.5V33"))
    e.append(p("M11.5 46.4C14 49.6 22 51.9 32 51.9", H))
    # label band + highlights
    e.append(p("M11.5 39.5C11.5 42.6 20.7 45 32 45S52.5 42.6 52.5 39.5", H))
    e.append(p("M16 37.6V45.5", D))
    e.append(p("M14 19.6C16 18.5 19 17.8 21.5 17.4", D))
    return e

# ---------------------------------------------------------------- sloup
def sloup():
    e = []
    # finial + top dome
    e.append(c(32, 5.2, 2.2, D))
    e.append(dot(32, 5.2, 0.7))
    e.append(p("M22.5 14.5C22.5 10.3 26.8 7.4 32 7.4S41.5 10.3 41.5 14.5Z"))
    e.append(p("M20.5 14.5H43.5V17.5H20.5Z", D))
    # glass cylinder
    e.append(p("M23.5 17.5V47.5M40.5 17.5V47.5"))
    # spiral stripes (3 bands, each with hatched fill)
    bands = []
    hatch = []
    for k in range(4):
        y0 = 15 + k * 9.5
        # band lower edge and upper edge as curved diagonals clipped to the column
        a = (23.5, y0 + 9.5, 40.5, y0 + 2.5)
        b = (23.5, y0 + 13, 40.5, y0 + 6)
        for seg in (a, b):
            x1, y1, x2, y2 = seg
            # clip to y in [17.5, 47.5]
            t1 = max(0.0, (y1 - 47.5) / (y1 - y2)) if y1 > 47.5 else 0.0
            t2 = min(1.0, (y1 - 17.5) / (y1 - y2)) if y2 < 17.5 else 1.0
            if t2 <= t1:
                continue
            X1, Y1 = x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1
            X2, Y2 = x1 + (x2 - x1) * t2, y1 + (y2 - y1) * t2
            mx, my = (X1 + X2) / 2, (Y1 + Y2) / 2 + 1.4
            bands.append(f"M{f(X1)} {f(Y1)}Q{f(mx)} {f(my)} {f(X2)} {f(Y2)}")
        for j in range(6):
            x = 25.5 + j * 2.8
            t = (x - 23.5) / 17
            ytop = y0 + 9.5 - 7 * t + 0.6
            ybot = y0 + 13 - 7 * t - 0.6
            ytop = max(ytop, 18.3); ybot = min(ybot, 46.7)
            if ybot - ytop > 0.8:
                hatch.append((x, ytop, x, ybot))
    e.append(p("".join(bands), D))
    e.append(lines(hatch, H))
    # glass highlight
    e.append(p("M37.6 19.5V45.5", H))
    # bottom collar + dome + finial
    e.append(p("M20.5 47.5H43.5V50.5H20.5Z", D))
    e.append(p("M22.5 50.5C22.5 54.7 26.8 57.6 32 57.6S41.5 54.7 41.5 50.5", M))
    e.append(c(32, 59.8, 1.8, D))
    return e


for name, fn in (("nuzky", nuzky), ("strojek", strojek), ("britva", britva), ("kreslo", kreslo),
                 ("hreben", hreben), ("rucnik", rucnik), ("stetka", stetka), ("vousy", vousy),
                 ("koruna", koruna), ("kava", kava), ("pomada", pomada), ("sloup", sloup)):
    ICONS[name] = fn()


def finish(el):
    # every stroked element gets pathLength="1"
    def add(m):
        tag = m.group(0)
        if 'stroke="none"' in tag or "pathLength" in tag:
            return tag
        return tag.replace("<path ", '<path pathLength="1" ').replace("<circle ", '<circle pathLength="1" ')
    return re.sub(r"<(path|circle)[^>]*/>", add, el)


HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
LABELS = {
    "nuzky": "Nůžky", "strojek": "Strojek", "britva": "Břitva", "kreslo": "Křeslo", "hreben": "Hřeben",
    "rucnik": "Horký ručník", "stetka": "Štětka", "vousy": "Vousy", "koruna": "Koruna", "kava": "Káva",
    "pomada": "Pomáda", "sloup": "Barber sloup",
}
svgs = {}
for name, els in ICONS.items():
    body = "\n  ".join(finish(x) for x in els)
    svg = f"{HEAD}\n  {body}\n</svg>\n"
    svgs[name] = svg
    open(os.path.join(OUT, f"{name}.svg"), "w").write(svg)

cards = []
for name, svg in svgs.items():
    inner = svg.replace(HEAD, "").replace("</svg>", "").strip()
    one = lambda s: f'<div class="s s{s}"><svg viewBox="0 0 64 64" width="{s}" height="{s}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{inner}</svg><span>{s} px</span></div>'
    cards.append(f'<article><h2>{LABELS[name]} <small>{name}.svg</small></h2><div class="row">{one(120)}{one(64)}{one(40)}</div></article>')

html = f"""<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ikony v2 (Claude)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&family=Playfair+Display:wght@400;600&display=swap" rel="stylesheet">
<style>
:root {{ color-scheme: dark; --bg: #0a0a0a; --gold: #e8c466; --muted: #a59d88; --card: #121110; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: var(--bg); color: var(--gold); font-family: Manrope, system-ui, sans-serif; }}
main {{ max-width: 1320px; margin: auto; padding: 48px 32px 64px; }}
h1 {{ margin: 0 0 8px; font: 600 clamp(30px, 4vw, 46px)/1.1 "Playfair Display", Georgia, serif; }}
.intro {{ margin: 0 0 36px; color: var(--muted); font-size: 15px; line-height: 1.6; max-width: 60ch; }}
.grid {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }}
article {{ background: var(--card); padding: 22px 22px 18px; }}
h2 {{ margin: 0 0 14px; font: 600 19px/1.3 "Playfair Display", Georgia, serif; }}
h2 small {{ font: 400 12px Manrope, sans-serif; color: var(--muted); margin-left: 6px; }}
.row {{ display: flex; align-items: flex-end; gap: 26px; }}
.s {{ display: flex; flex-direction: column; align-items: center; gap: 8px; }}
.s span {{ font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }}
@media (prefers-reduced-motion: no-preference) {{
  article:hover .s120 svg * {{ stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 1.6s ease forwards; }}
}}
@keyframes draw {{ to {{ stroke-dashoffset: 0; }} }}
@media (max-width: 1000px) {{ .grid {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }} }}
@media (max-width: 620px) {{ main {{ padding: 32px 16px; }} .grid {{ grid-template-columns: 1fr; }} .row {{ gap: 16px; }} }}
</style>
</head>
<body>
<main>
<h1>Ikony v2 pro Marcus Koky Barber</h1>
<p class="intro">Rytý styl: hlavní obrys 1,75, detaily 1 a šrafy 0,75. Každý tah má pathLength="1", takže se ikona dá kreslit animací (najeďte myší na kartu). Varianta od Clauda, velikosti 120, 64 a 40 px.</p>
<div class="grid">
{chr(10).join(cards)}
</div>
</main>
</body>
</html>
"""
open(os.path.join(OUT, "nahled.html"), "w").write(html)
print("ok", len(svgs))
