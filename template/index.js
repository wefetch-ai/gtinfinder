// gtinfinder — the 2027 product, powered by gtinfetch.ai. One door for gtinfinder.ai and every market node.
// gtinfinder holds no record of its own: every barcode page read here fetches that barcode live from gtinfetch.ai (section 9).
// Each barcode has one page, on its home market's node, in that market's language (section 5.1). The home is set by the rule below, the same rule the
// harvest (homes.py) used to write each node's own list into the store. A request for a barcode on a node that is not its home forwards to its home.
// No ads, no tracking, no analytics tag, no cookie, no price, no claim about stock (sections 2 and 6.2).
import { TEXTS, MARKETS, PREFIXES, RETAILERS } from "./data.js";

const ROOT = "gtinfinder.ai"; const GTINFETCH_MCP = "https://mcp.gtinfetch.ai/mcp"; const FORM = "https://formspree.io/f/xoedrpgb"; const CODE_URL = "https://github.com/wefetch-ai/gtinfinder";
const UA = "gtinfinder/1.0 (+https://gtinfinder.ai/)"; const BROWSE = 1000; const CHUNK = 5000; const SITEMAP_CHUNKS = 10;
const NODE = Object.fromEntries(MARKETS.map(m => [m.node, m])); const BY_ISO = Object.fromEntries(MARKETS.map(m => [m.iso, m]));
const RANGES = PREFIXES.map(([a, b, c]) => [Number(a), Number(b), c]);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const n = (x, lang = "en") => { try { return Number(x || 0).toLocaleString(lang === "en" ? "en-US" : lang); } catch { return Number(x || 0).toLocaleString("en-US"); } };
const day = s => (typeof s === "string" && s.length >= 10 ? s.slice(0, 10) : "");
const T = lang => ({ ...TEXTS.en, ...(TEXTS[lang] || {}) });
const nodeUrl = node => (node === "root" ? `https://${ROOT}` : `https://${node}.${ROOT}`);

// ---------- the barcode, its forms and its home ----------
function checkOk(d) { let s = 0; for (let i = 0; i < d.length - 1; i++) s += Number(d[d.length - 2 - i]) * (i % 2 === 0 ? 3 : 1); return (10 - (s % 10)) % 10 === Number(d[d.length - 1]); }
function shape(raw) { const d = String(raw || "").replace(/\D/g, ""); if (![8, 12, 13, 14].includes(d.length) || !checkOk(d)) return null; return d.padStart(14, "0"); }
const forms = g => ({ gtin14: g, ...(g[0] === "0" ? { gtin13: g.slice(1) } : {}), ...(g.startsWith("00") ? { gtin12: g.slice(2) } : {}) });
function issuer(g) {
  let p; if (g.startsWith("000000")) { p = g.slice(6, 9); if ("02".includes(p[0])) return null; } else if (g[0] === "9") return null; else p = g.slice(1, 4);
  const v = Number(p); for (const [a, b, c] of RANGES) if (v >= a && v <= b) return c; return null;
}
const norm = c => { c = String(c || "").trim().toUpperCase(); if (c === "UK") c = "GB"; return /^[A-Z]{2}$/.test(c) && !["EU", "XX", "ZZ"].includes(c) ? c : null; };
function home(g, rec, counts) {   // the rule of section 5.1, as homes.py has it
  const C = [...new Set((rec.seen_in || []).map(s => norm(s.market)).filter(Boolean))].sort(); const P = issuer(g); let h, how;
  if (C.length === 1) { h = C[0]; how = "record"; }
  else if (C.length > 1) { const cand = C.filter(c => BY_ISO[c]).length ? C.filter(c => BY_ISO[c]) : C;
    if (P && cand.includes(P)) { h = P; how = "record-digits"; } else { h = [...cand].sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || (a < b ? -1 : 1))[0]; how = "record-most"; } }
  else { h = P; how = "digits"; }
  return BY_ISO[h] ? { node: BY_ISO[h].node, how } : { node: "root", how: h ? how + "-no-node" : "no-issuer" };
}

// ---------- live reads: the record from gtinfetch.ai, the count of GTINs, the homes table ----------
async function record(env, g, serve) {
  const r = await fetch(GTINFETCH_MCP, { method: "POST", signal: AbortSignal.timeout(15000), headers: { "content-type": "application/json", accept: "application/json", "user-agent": UA, ...(env.FINDER_KEY ? { "x-hub-key": env.FINDER_KEY } : {}), ...(serve ? { "x-finder-region": serve } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "fetch_gtin", arguments: { gtin: g } } }) });
  const j = await r.json(); const res = j.result || {}; if (res.isError) throw new Error("gtinfetch answered an error");
  return res.structuredContent || JSON.parse(res.content[0].text);
}
let CNT = null, CNT_AT = 0;
async function gtins() {
  if (CNT_AT && Date.now() - CNT_AT < 600000) return CNT;
  try { const j = await (await fetch("https://gtinfetch.ai/counts.json", { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(5000) })).json(); if (j && j.served_n) CNT = j.served_n; } catch { /* the last read stands */ }
  CNT_AT = Date.now(); return CNT;
}
let HOMES = null, HOMES_AT = 0;
const EMPTY_HOMES = { market_counts: {}, nodes: {} };
async function homes(env) {
  if (HOMES && Date.now() - HOMES_AT < 600000) return HOMES;   // a table held is read again every ten minutes; until there is one, every request looks
  try { const h = await env.FINDER.get("_homes", "json"); if (h) { HOMES = h; HOMES_AT = Date.now(); } } catch { /* the last read stands */ }
  return HOMES || EMPTY_HOMES;
}

// ---------- the page frame: no logo, no cookie, no tag ----------
const CSS = `<style>:root{--bg:#fff;--fg:#14161a;--muted:#5b6270;--line:#e3e6eb;--link:#0b57d0;--card:#f6f7f9}@media(prefers-color-scheme:dark){:root{--bg:#0f1115;--fg:#e8eaee;--muted:#9aa3b2;--line:#262b33;--link:#8ab4f8;--card:#171a20}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif}main,footer,header{max-width:880px;margin:0 auto;padding:0 16px}
header{padding-top:18px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-weight:650}header a{color:var(--fg);text-decoration:none}h1{font-size:clamp(26px,4vw,38px);line-height:1.2;margin:28px 0 10px}h2{font-size:20px;margin:30px 0 8px}
a{color:var(--link);overflow-wrap:anywhere}.m{color:var(--muted);font-size:14px}.lead{font-size:20px;margin:8px 0 4px}.big{font-size:clamp(32px,6vw,52px);font-weight:750;letter-spacing:-.02em;margin:18px 0 0}
.codes{display:flex;flex-wrap:wrap;gap:8px 18px;margin:8px 0;font-variant-numeric:tabular-nums}.codes span{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:4px 10px}
ul.b{list-style:none;padding:0;columns:2 280px}ul.b li{break-inside:avoid;padding:3px 0;border-bottom:1px solid var(--line)}ul.n{columns:3 200px;padding-left:18px}
form{display:grid;gap:12px;max-width:560px}label{display:block;font-weight:600;font-size:14px;margin-bottom:4px}input,textarea{width:100%;font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--fg)}textarea{min-height:130px}
button{justify-self:start;font:inherit;font-weight:650;padding:10px 18px;border-radius:10px;border:1px solid var(--fg);background:var(--fg);color:var(--bg);cursor:pointer}
footer{margin-top:48px;padding-top:14px;padding-bottom:40px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}nav.p{display:flex;gap:16px;margin:16px 0}</style>`;
function frame({ lang, node, title, desc, canonical, body, ld = null, robots = "index,follow", alt = true }) {
  const t = T(lang); const dir = (TEXTS[lang] || {}).dir || "ltr"; const site = node === "root" ? ROOT : `${node}.${ROOT}`;
  return `<!doctype html><html lang="${esc(lang)}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>`
    + `<meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="${robots}"><meta http-equiv="content-language" content="${esc(lang)}">`
    + (alt ? `<link rel="alternate" type="application/json" href="${esc(canonical)}"><link rel="alternate" type="text/markdown" href="${esc(canonical)}">` : "")
    + `<meta property="og:title" content="${esc(title)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:locale" content="${esc(lang)}">${CSS}`
    + (ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : "") + `</head><body>`
    + `<header><a href="${nodeUrl(node)}/">gtinfinder${node === "root" ? "" : ` · ${esc(NODE[node].name)}`}</a><a href="https://${ROOT}/">${esc(t.all84)}</a></header><main>${body}</main>`
    + `<footer>© 2027 WeFetch AI Corp. · <a href="https://gtinfetch.ai/">${esc(t.powered)}</a> · <a href="https://${ROOT}/#contact">${esc(t.contact)}</a> · <a href="${CODE_URL}">Code</a> · 260-4611 Viking Way, Richmond, BC V6V 2K9, Canada</footer></body></html>`;
}
const HEADERS = (type, lang, extra = {}) => ({ "content-type": `${type}; charset=utf-8`, "content-language": lang, "cache-control": "public, max-age=300", "access-control-allow-origin": "*",
  "content-signal": "ai-train=yes, search=yes, ai-input=yes", link: `</llms.txt>; rel="describedby", <${GTINFETCH_MCP}>; rel="service"`, ...extra });
const html = (s, lang, status = 200, extra = {}) => new Response(s, { status, headers: HEADERS("text/html", lang, extra) });
const wants = req => { const a = (req.headers.get("accept") || "").toLowerCase(); return a.includes("application/json") && !a.includes("text/html") ? "json" : a.includes("text/markdown") ? "md" : "html"; };

// ---------- the barcode page (section 6) ----------
async function barcode(req, env, node, raw) {
  const g = shape(raw); const here = node;
  const m = NODE[node]; const lang = m ? m.lang : "en"; const t = T(lang);
  if (!g) return html(frame({ lang, node, title: `${esc(raw)} · gtinfinder`, desc: t.not_found, canonical: `${nodeUrl(node)}/`, robots: "noindex,follow", alt: false, body: `<h1>${esc(String(raw).slice(0, 20))}</h1><p>${esc(t.not_found)}</p>` }), lang, 404);
  let rec; try { rec = await record(env, g, m ? m.serve : null); } catch { return html(frame({ lang, node, title: "gtinfinder", desc: "", canonical: `${nodeUrl(node)}/barcode/${g}`, robots: "noindex,follow", alt: false, body: `<h1>GTIN ${g}</h1><p>gtinfetch.ai did not answer. Nothing is guessed. Ask again.</p>` }), lang, 503, { "cache-control": "no-store", "retry-after": "30" }); }
  if (rec.status === "unknown" || !rec.status) return html(frame({ lang, node, title: `GTIN ${g} · gtinfinder`, desc: t.not_found, canonical: `${nodeUrl(node)}/barcode/${g}`, robots: "noindex,follow", alt: false, body: `<h1>GTIN ${g}</h1><p>${esc(t.not_found)}</p><p><a href="https://gtinfetch.ai/01/${g}">${esc(t.full_record)}</a></p>` }), lang, 404);
  const hm = home(g, rec, (await homes(env)).market_counts || {});
  const own = `${nodeUrl(hm.node)}/barcode/${g}`;
  if (hm.node !== here || String(raw) !== g) return Response.redirect(own, 301);   // one page per barcode: its home, in its 14-digit form
  const f = forms(g); const name = rec.fields?.product?.value || (rec.by_banner || []).map(b => b.fields?.product?.value).find(Boolean) || null; const brand = rec.fields?.brand?.value || null;
  const srcs = (rec.sources_read || []).slice(0, 10).map(s => ({ url: s.url, read: s.last_read || s.read_by || null, name: (() => { try { return new URL(s.url).hostname.replace(/^www\./, ""); } catch { return s.url; } })() }));
  const named = (rec.source || []).join(" · ");
  const ret = m && m.azure && RETAILERS[node] && RETAILERS[node].suggested && RETAILERS[node].suggested.length ? RETAILERS[node].suggested : null;
  const data = { ...f, name, brand, sources: srcs, source_names: rec.source || [], node: hm.node === "root" ? ROOT : `${hm.node}.${ROOT}`, language: lang, page: own, home_set_by: hm.how,
    suggested_local_retailers: ret ? ret.map(r => r.name) : undefined, full_record: `https://gtinfetch.ai/01/${g}`, powered_by: "https://gtinfetch.ai", data_line: TEXTS.en.data_line, referred: rec.status === "referred" || undefined };
  const kind = wants(req);
  if (kind === "json") return new Response(JSON.stringify(data, null, 1), { headers: HEADERS("application/json", lang, { vary: "accept" }) });
  const formsLine = `GTIN ${g}${f.gtin13 ? ` · EAN ${f.gtin13}` : ""}${f.gtin12 ? ` · UPC ${f.gtin12}` : ""}`;
  if (kind === "md") return new Response([`# ${name || `GTIN ${g}`}`, "", formsLine, "", ...(srcs.length ? [`## ${t.source}`, ...srcs.map(s => `- [${s.name}](${s.url})${s.read ? ` · ${t.last_read} ${day(s.read)}` : ""}`), ""] : []),
    ...(ret ? [`## ${t.retailers_h}`, t.retailers_note, ...ret.map(r => `- ${r.name}`), ""] : []), t.s11, "", t.s15, "", `${t.full_record} https://gtinfetch.ai/01/${g}`, "", t.powered, ""].join("\n"), { headers: HEADERS("text/markdown", lang, { vary: "accept" }) });
  const title = `${name ? name + " · " : ""}${formsLine} · gtinfinder`;
  const desc = `${name ? `${name}${brand && brand !== name ? `, ${brand}` : ""}. ` : ""}${t.barcode} ${g} (GTIN-14)${f.gtin13 ? `, ${f.gtin13} (EAN-13)` : ""}${f.gtin12 ? `, ${f.gtin12} (UPC-12)` : ""}. ${t.powered}.`;
  let b = `<h1>${esc(name || (rec.status === "referred" ? t.referred : t.no_name))}</h1><div class="codes"><span>GTIN-14 ${g}</span>${f.gtin13 ? `<span>EAN-13 ${f.gtin13}</span>` : ""}${f.gtin12 ? `<span>UPC-12 ${f.gtin12}</span>` : ""}</div>`;
  if (srcs.length) b += `<h2>${esc(t.source)}</h2>${named ? `<p>${esc(named)}</p>` : ""}<ul>${srcs.map(s => `<li><a href="${esc(s.url)}" rel="nofollow noopener">${esc(s.name)}</a>${s.read ? ` <span class="m">${esc(t.last_read)} ${esc(day(s.read))}</span>` : ""}</li>`).join("")}</ul>`;
  if (ret) b += `<h2>${esc(t.retailers_h)}</h2><p class="m">${esc(t.retailers_note)}</p><ul>${ret.map(r => `<li>${r.site ? `<a href="${esc(r.site)}" rel="nofollow noopener">${esc(r.name)}</a>` : esc(r.name)}</li>`).join("")}</ul>`;
  b += `<h2>${esc(t.h_problem)}</h2><p>${esc(t.s11)}</p><h2>${esc(t.h_invite)}</h2><p><a href="https://${ROOT}/#contact">${esc(t.s15)}</a></p>`
     + `<p><a href="https://gtinfetch.ai/01/${g}">${esc(t.full_record)}</a></p><p><a href="https://gtinfetch.ai/">${esc(t.powered)}</a></p>`;
  const ld = { "@context": "https://schema.org", "@type": "Product", ...f, gtin: f.gtin12 || f.gtin13 || g, url: own, ...(name ? { name } : {}), ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}), inLanguage: lang,
    subjectOf: { "@type": "Dataset", name: "gtinfetch record", url: `https://gtinfetch.ai/01/${g}`, ...(rec.as_of ? { dateModified: rec.as_of } : {}) } };
  return html(frame({ lang, node, title, desc, canonical: own, body: b, ld }), lang, 200, { vary: "accept", "cache-control": "no-store" });
}

// ---------- a node's own list (the store: c:<node>:<NNNNN>, 5,000 lines "gtin14<TAB>name") ----------
async function lines(env, node, from, count) {
  const out = []; let i = from;
  while (out.length < count) { const k = Math.floor(i / CHUNK) + 1; const s = await env.FINDER.get(`c:${node}:${String(k).padStart(5, "0")}`); if (!s) break;
    const L = s.split("\n").filter(Boolean); const start = i % CHUNK; const take = L.slice(start, start + (count - out.length)); out.push(...take); i += take.length; if (start + take.length < L.length || !take.length) break; }
  return out.map(l => { const [g, ...r] = l.split("\t"); return [g, r.join("\t")]; });
}
const listHtml = (node, L, t) => `<ul class="b">${L.map(([g, nm]) => `<li><a href="${nodeUrl(node)}/barcode/${g}">${esc(nm || `GTIN ${g}`)}</a> <span class="m">${g}</span></li>`).join("")}</ul>`;
async function browse(req, env, node, page) {
  const m = NODE[node]; const lang = m ? m.lang : "en"; const t = T(lang); const meta = (await homes(env)).nodes?.[node] || { count: 0 }; const pages = Math.max(1, Math.ceil((meta.count || 0) / BROWSE));
  if (!(page >= 1 && page <= pages)) return Response.redirect(`${nodeUrl(node)}/browse/1`, 302);
  const L = await lines(env, node, (page - 1) * BROWSE, BROWSE); const head = node === "root" ? t.browse_root : t.browse.replace("{market}", m.name);
  const body = `<h1>${esc(head)}</h1><p class="m">${esc(t.page)} ${n(page, lang)} / ${n(pages, lang)}</p>${listHtml(node, L, t)}<nav class="p">${page > 1 ? `<a href="${nodeUrl(node)}/browse/${page - 1}">${esc(t.prev)}</a>` : ""}${page < pages ? `<a href="${nodeUrl(node)}/browse/${page + 1}">${esc(t.next)}</a>` : ""}</nav>`;
  return html(frame({ lang, node, title: `${head} · ${t.page} ${page} · gtinfinder`, desc: head, canonical: `${nodeUrl(node)}/browse/${page}`, body, alt: false, robots: "noindex,follow" }), lang);
}

// ---------- the home pages (section 7) ----------
function statements(t) {
  return `<h2>${esc(t.h_problem)}</h2><p>${esc(t.s11)}</p><p class="m">${esc(t.s11e)}</p><h2>${esc(t.h_did)}</h2><p>${esc(t.s12)}</p><h2>${esc(t.h_is)}</h2><p>${esc(t.s13)}</p>`
    + `<h2>${esc(t.h_makes)}</h2><p>${esc(t.s14)}</p><h2>${esc(t.h_invite)}</h2><p>${esc(t.s15)}</p><p>${esc(t.s15b)}</p><p class="m">${esc(t.gloss)}</p>`;
}
const formHtml = t => `<form id="contact" action="${FORM}" method="POST"><div><label for="f-name">${esc(t.form_name)}</label><input id="f-name" name="name" required autocomplete="name"></div>`
  + `<div><label for="f-email">${esc(t.form_email)}</label><input id="f-email" name="email" type="email" required autocomplete="email"></div><div><label for="f-company">${esc(t.form_company)}</label><input id="f-company" name="company" autocomplete="organization"></div>`
  + `<div><label for="f-gtin">${esc(t.form_gtin)}</label><input id="f-gtin" name="gtin" inputmode="numeric"></div><div><label for="f-msg">${esc(t.form_message)}</label><textarea id="f-msg" name="message" required></textarea></div>`
  + `<input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off"><button type="submit">${esc(t.form_send)}</button></form>`;
async function homePage(req, env, node) {
  const m = NODE[node]; const lang = m ? m.lang : "en"; const t = T(lang); const g = await gtins(env); const H = await homes(env); const meta = H.nodes?.[node] || { count: 0 };
  const first = await lines(env, node, 0, 100); const name = m ? m.name : null;
  let b = `<h1>gtinfinder${name ? ` · ${esc(name)}` : ""}</h1><p class="lead">84M GTINs</p><p class="big">${g ? n(g, lang) : "84M"}</p><p class="m">${esc(t.count_label)} · <a href="https://gtinfetch.ai/">gtinfetch.ai</a></p>`;
  b += statements(t);
  if (node === "root") {
    b += formHtml(t) + `<h2>${esc(t.h_principles)}</h2><p>${esc(t.principles)}</p><h2>${esc(t.nodes)}</h2><ul class="n">${MARKETS.map(x => `<li><a href="${nodeUrl(x.node)}/">${esc(x.name)}</a> <span class="m">${n((H.nodes?.[x.node] || {}).count, "en")}</span></li>`).join("")}</ul>`;
    b += `<h2>${esc(t.browse_root)}</h2><p class="m">${n(meta.count, lang)} ${esc(t.here_label)}</p>${listHtml(node, first, t)}<p><a href="${nodeUrl(node)}/browse/1">${esc(t.browse_root)} →</a></p>`;
  } else {
    b += `<h2>${esc(t.browse.replace("{market}", name))}</h2><p class="m">${n(meta.count, lang)} ${esc(t.here_label)}</p>${listHtml(node, first, t)}<p><a href="${nodeUrl(node)}/browse/1">${esc(t.browse.replace("{market}", name))} →</a></p>`
       + `<p><a href="https://${ROOT}/">${esc(t.all84)}</a> · <a href="https://${ROOT}/#contact">${esc(t.contact)}</a></p>`;
  }
  const title = node === "root" ? "gtinfinder · 84M GTINs, in text the AI can read" : `gtinfinder · ${name} · 84M GTINs`;
  const ld = { "@context": "https://schema.org", "@type": "WebSite", name: "gtinfinder", url: `${nodeUrl(node)}/`, inLanguage: lang, publisher: { "@type": "Organization", name: "WeFetch AI Corp." } };
  return html(frame({ lang, node, title, desc: `84M GTINs. ${t.s13}`, canonical: `${nodeUrl(node)}/`, body: b, ld, alt: false }), lang, 200, { "cache-control": "public, max-age=300" });
}

// ---------- machine files (section 7.3) ----------
function robots(node) { return ["User-agent: *", "Allow: /", "", "Content-Signal: search=yes, ai-input=yes, ai-train=yes", `Sitemap: ${nodeUrl(node)}/sitemap.xml`, ""].join("\n"); }
function llms(node) {
  const m = NODE[node]; const t = T(m ? m.lang : "en");
  return [`# gtinfinder${m ? ` · ${m.name}` : ""}`, "", `> 84M GTINs. ${TEXTS.en.s13}`, "", m ? `This node holds the barcodes whose home market is ${m.name}, in ${(TEXTS[m.lang] || {}).name || m.lang}. Every barcode has one page, on its home market's node.` : "This is the home of gtinfinder and of the barcodes with no home market among its markets.", "",
    "## A barcode page", `- ${nodeUrl(node)}/barcode/{gtin14} (the 13 and 12 digit forms reach the same page; a barcode whose home is another node forwards there)`, "- Ask for application/json or text/markdown at the same address for the same facts as data.",
    "", "## The full record", "- https://gtinfetch.ai/01/{gtin14}", `- The gtinfetch Model Context Protocol (MCP) server: ${GTINFETCH_MCP}`, "", "## Data", `- ${TEXTS.en.data_line}`, `- Code: ${CODE_URL} (MIT licence)`, "",
    "## Every market", ...MARKETS.map(x => `- ${x.name}: ${nodeUrl(x.node)}/`), "- No home market: https://gtinfinder.ai/", ""].join("\n");
}
const XML = { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" };
async function sitemap(env, node, p) {
  const meta = (await homes(env)).nodes?.[node] || { chunks: 0 }; const files = Math.ceil((meta.chunks || 0) / SITEMAP_CHUNKS);
  if (p === "/sitemap.xml") return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<sitemap><loc>${nodeUrl(node)}/sitemaps/site.xml</loc></sitemap>\n${Array.from({ length: files }, (_, i) => `<sitemap><loc>${nodeUrl(node)}/sitemaps/${String(i + 1).padStart(4, "0")}.xml</loc></sitemap>`).join("\n")}\n</sitemapindex>\n`, { headers: XML });
  if (p === "/sitemaps/site.xml") return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${nodeUrl(node)}/</loc></url>\n</urlset>\n`, { headers: XML });
  const mm = /^\/sitemaps\/(\d{4})\.xml$/.exec(p); if (!mm) return null; const k = Number(mm[1]); if (!(k >= 1 && k <= files)) return new Response("not found", { status: 404 });
  const L = await lines(env, node, (k - 1) * SITEMAP_CHUNKS * CHUNK, SITEMAP_CHUNKS * CHUNK);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${L.map(([g]) => `<url><loc>${nodeUrl(node)}/barcode/${g}</loc></url>`).join("\n")}\n</urlset>\n`, { headers: XML });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url); const host = url.hostname.toLowerCase(); const p = url.pathname;
    if (host === `www.${ROOT}`) return Response.redirect(`https://${ROOT}${p}${url.search}`, 301);
    let node = null;
    if (host === ROOT) node = "root"; else if (host.endsWith(`.${ROOT}`)) { const sub = host.slice(0, -ROOT.length - 1); if (NODE[sub]) node = sub; }
    if (!node) return Response.redirect(`https://${ROOT}${p}${url.search}`, 301);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, HEAD, OPTIONS", "access-control-allow-headers": "accept" } });
    if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    const lang = node === "root" ? "en" : NODE[node].lang;
    if (p === "/robots.txt") return new Response(robots(node), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
    if (p === "/llms.txt") return new Response(llms(node), { headers: HEADERS("text/plain", lang) });
    if (p === "/sitemap.xml" || p.startsWith("/sitemaps/")) { const r = await sitemap(env, node, p); if (r) return r; }
    if (p === "/health.json") { const H = await homes(env); return new Response(JSON.stringify({ ok: true, host, node, language: lang, barcodes_here: (H.nodes?.[node] || {}).count || 0, homes_made: H.made || null, gtins: await gtins(), reads_from: "https://gtinfetch.ai" }), { headers: HEADERS("application/json", lang, { "cache-control": "no-store" }) }); }
    const bm = /^\/barcode\/([0-9]{1,20})\/?$/.exec(p); if (bm) return barcode(req, env, node, bm[1]);
    const br = /^\/browse\/(\d{1,7})\/?$/.exec(p); if (br) return browse(req, env, node, Number(br[1]));
    if (p === "/" || p === "/index.html") return homePage(req, env, node);
    const t = T(lang); return html(frame({ lang, node, title: "gtinfinder", desc: "", canonical: `${nodeUrl(node)}/`, robots: "noindex,follow", alt: false, body: `<h1>404</h1><p><a href="${nodeUrl(node)}/">gtinfinder</a> · <a href="https://${ROOT}/">${esc(t.all84)}</a></p>` }), lang, 404);
  },
};
