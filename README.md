# gtinfinder

84M GTINs, in text the AI can read. Powered by [gtinfetch.ai](https://gtinfetch.ai).

## The problem

All the AI labs, including Meta, Google, OpenAI, Anthropic and xAI, do AI shopping from a large language model or text footing, where GTINs are what assist brands with sales and commerce.

The evidence, 25 November 2026. Meta AI and Gemini were each given a real barcode and found no product. ChatGPT, Claude, Gemini and Grok named 45,535 products, and under 4% could be tied to one barcode.

## What we did

We found the gap between GTINs and the language-based approach was not closing fast enough, so we reached back out to web training data to bridge the divide.

## What it is

gtinfetch has 84M GTINs for AI shopping, and can see that language-based training means an AI only learns what it can read as text. gtinfinder puts those 84M GTINs into text the AI can read, in every market and every language, powered by gtinfetch.ai.

## What it makes

The next generation of gtinfetch: where brands are found when consumers look to connect with products through the AI labs.

## The invitation

If you are a brand, or a company with brands, and you see your GTIN here, please connect with us to discuss improvements, changes and AI shopping positioning across all your assets.

This is open. The code is available under the MIT licence, and the data is free to use with credit to gtinfetch.ai.

A GTIN is a Global Trade Item Number, the number under a product barcode. The MIT licence is the open-source software licence of that name.

---

## How it works

- **One page per barcode.** Each barcode on the gtinfetch record has one page, on its home market's node (`fr.gtinfinder.ai`, `de.gtinfinder.ai`, …), in that market's language. A barcode with no home among the markets lives on `gtinfinder.ai` in English.
- **The home rule** (`data/homes.py`, and the same rule in `template/index.js`):
  1. One country on the record: that market.
  2. Several countries on the record: the one that matches the barcode's opening digits; if none matches, the one with the most barcodes on the record.
  3. No country on the record: the market whose barcode issuer the opening digits belong to.
  4. No home among the markets: `gtinfinder.ai` itself.
- **No record of its own.** Every barcode page fetches that barcode live from gtinfetch.ai. The full record is at `https://gtinfetch.ai/01/{gtin14}`.
- **For machines.** Ask a barcode page for `application/json` or `text/markdown` and you get the same facts as data.

## What is in this repository

| Path | What it is |
|---|---|
| `template/index.js` | The page template and the door: barcode pages, node home pages, browse pages, sitemaps, robots.txt, llms.txt |
| `data/markets.json` | The markets, their node addresses and languages, and the barcode issuer prefixes |
| `data/texts.json` | The page text in every node language |
| `data/homes.py` | How each barcode gets its one home |
| `data/record-layout.md` | The record layout a barcode page reads |
| `client/gtin.py` | A small client that looks up a barcode on gtinfetch.ai |
| `examples/calls.md` | Sample calls |

## Data

Free to use for AI shopping. Credit gtinfetch.ai.

## Licence

The code is under the MIT licence: see `LICENSE`.

© 2027 WeFetch AI Corp. · 260-4611 Viking Way, Richmond, BC V6V 2K9, Canada
