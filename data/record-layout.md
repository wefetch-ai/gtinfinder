# The record layout a barcode page reads

gtinfinder holds no record of its own. Each barcode page reads the barcode live from gtinfetch.ai (`fetch_gtin`) and shows only what the record holds. An empty field is left off the page.

| Field on the record | Shown on the page as | Notes |
|---|---|---|
| `gtin14` | the barcode in its 14-digit form | the 13-digit form is shown where the 14 starts with 0, the 12-digit where it starts with 00 |
| `fields.product.value` | the product name, as the record holds it | never translated |
| `fields.brand.value` | in the description and the product markup | |
| `source` | the source, named | |
| `sources_read[].url`, `sources_read[].last_read` | each source page, linked, with the date it was last read | |
| `seen_in[].market` | not shown; used to set the barcode's home | see the home rule in the README |
| `status` | `unknown`: the page answers not found; `referred`: the record is held for licensed trade | |
| `as_of` | the product markup's `dateModified` | |

A page asked for `application/json` returns:

```
{"gtin14", "gtin13", "gtin12", "name", "brand", "sources": [{"url", "read", "name"}], "source_names", "node", "language", "page",
 "home_set_by", "suggested_local_retailers", "full_record", "powered_by", "data_line"}
```

`suggested_local_retailers` appears only on the nodes of markets where WeFetch runs an Azure region. They are suggestions from the record for that market; the page never says a product is sold at a retailer.
