"""gtin.py — look up a barcode on gtinfetch.ai. No key needed. Python 3.8+, standard library only.

    python gtin.py 3017620422003
    python gtin.py 3017620422003 --page      # the gtinfinder page address for it (its home node)

The answer is the signed record gtinfetch.ai holds: every field with the pages it was read on and the date it was read.
Free to use for AI shopping. Credit gtinfetch.ai. MIT licence."""
import json, sys, urllib.request

MCP = "https://mcp.gtinfetch.ai/mcp"


def gtin14(code):
    d = "".join(ch for ch in str(code) if ch.isdigit())
    if len(d) not in (8, 12, 13, 14):
        raise ValueError("a GTIN has 8, 12, 13 or 14 digits")
    return d.zfill(14)


def lookup(code, market=None):
    args = {"gtin": gtin14(code), **({"market": market} if market else {})}
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "fetch_gtin", "arguments": args}}).encode()
    req = urllib.request.Request(MCP, body, {"content-type": "application/json", "accept": "application/json", "user-agent": "gtinfinder-client/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        res = json.loads(r.read())["result"]
    return res.get("structuredContent") or json.loads(res["content"][0]["text"])


def page(code):
    """the barcode's page on gtinfinder: gtinfinder.ai forwards any barcode to its home node"""
    req = urllib.request.Request(f"https://gtinfinder.ai/barcode/{gtin14(code)}", method="HEAD", headers={"user-agent": "gtinfinder-client/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.geturl()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if "--page" in sys.argv:
        print(page(sys.argv[1]))
    else:
        rec = lookup(sys.argv[1])
        print(json.dumps({k: rec.get(k) for k in ("gtin14", "status", "answer", "reason", "as_of", "fields", "sources_read")}, indent=1, ensure_ascii=False))
