# Sample calls

## A barcode page, as a person or a crawler reads it

```
curl https://gtinfinder.ai/barcode/3017620422003
```

gtinfinder.ai forwards to the barcode's home node, here `https://fr.gtinfinder.ai/barcode/03017620422003`, in French.

## The same facts as data

```
curl -H "accept: application/json" https://fr.gtinfinder.ai/barcode/03017620422003
curl -H "accept: text/markdown" https://fr.gtinfinder.ai/barcode/03017620422003
```

## The full record on gtinfetch.ai

```
curl -s https://mcp.gtinfetch.ai/mcp -H "content-type: application/json" -H "accept: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"fetch_gtin","arguments":{"gtin":"3017620422003"}}}'
```

## A node's own barcodes

```
curl https://fr.gtinfinder.ai/sitemap.xml
curl https://fr.gtinfinder.ai/browse/1
```

## With the client

```
python client/gtin.py 3017620422003
python client/gtin.py 3017620422003 --page
```
