"""homes.py — how each barcode gets its one home on gtinfinder. The same rule the page template applies (template/index.js, home()).

    from homes import home
    home("03017620422003", ["FR"], counts)  ->  ("fr", "record")

The rule, in order:
  1 one country on the record                -> that market                                          how: record
  2 several countries on the record          -> the one matching the barcode's opening digits        how: record-digits
                                                else the one with the most barcodes on the record    how: record-most
                                                (among the countries that have a node, when any has one)
  3 no country on the record                 -> the market whose barcode issuer the opening digits belong to   how: digits
  4 no home among the markets                -> gtinfinder.ai itself, in English                     node: root
`counts` is the number of barcodes on the record that carry each country, as {"FR": 1299435, ...}. MIT licence."""
import json, pathlib, re

M = json.loads((pathlib.Path(__file__).parent / "markets.json").read_text(encoding="utf-8"))
NODE = {m["iso"]: m["node"] for m in M["markets"]}
RANGES = [(int(a), int(b), c) for a, b, c in M["gs1_prefixes"]]


def issuer(g):
    """the market whose barcode issuer the opening digits belong to; None for restricted, coupon, book and serial ranges"""
    if g.startswith("000000"):
        p = g[6:9]                       # GTIN-8
        if p[0] in "02":
            return None
    elif g[0] == "9":
        return None                      # variable measure
    else:
        p = g[1:4]                       # the GTIN-13 body; a UPC-12 reads as 0xx
    v = int(p)
    for a, b, c in RANGES:
        if a <= v <= b:
            return c
    return None


def norm(c):
    c = (c or "").strip().upper()
    if c == "UK":
        c = "GB"
    return c if re.fullmatch(r"[A-Z]{2}", c) and c not in ("EU", "XX", "ZZ") else None


def home(gtin14, countries, counts):
    C = sorted({c for c in (norm(x) for x in countries) if c})
    P = issuer(gtin14)
    if len(C) == 1:
        h, how = C[0], "record"
    elif len(C) > 1:
        cand = [c for c in C if c in NODE] or C
        if P in cand:
            h, how = P, "record-digits"
        else:
            h, how = sorted(cand, key=lambda c: (-counts.get(c, 0), c))[0], "record-most"
    else:
        h, how = P, "digits"
    if h not in NODE:
        return "root", (how + "-no-node") if h else "no-issuer"
    return NODE[h], how
