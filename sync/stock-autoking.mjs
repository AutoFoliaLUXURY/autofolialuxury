// Lexon stokun sipas dyqaneve nga autoking.com.mk dhe e ruan në assets/stock.json.
// Autoking e tregon stokun vetëm brenda faqes së çdo produkti (tabela "Достапност по продавници"),
// prandaj hapet faqja e secilit produkt (4 njëkohësisht, me pushime, që të mos rëndohet serveri).
//
// stock.json: { "u": koha, "s": { "<source_id>": kodi } }
//   1 = ka në magazinë (Magacin Vizbegovo)
//   2 = ka në dyqan    (Autoking Vizbegovo)
//   3 = ka në të dyja
//   0 = nuk ka në asnjërën
// Produktet pa tabelë nuk shkruhen (faqja nuk tregon asgjë për to).
//
// Variablat: MAX_PRODUCTS (për testim), CONCURRENCY (parazgjedhur 4)

import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const API = 'https://autoking.com.mk/wp-json/wc/store/v1/products';
const UA = { 'User-Agent': 'Mozilla/5.0 (stock-sync)' };
const MAX = Number(process.env.MAX_PRODUCTS || 0);
const CONC = Number(process.env.CONCURRENCY || 4);
const OUT = 'assets/stock.json';
const WAREHOUSE = 'Magacin Vizbegovo';
const SHOP = 'Autoking Vizbegovo';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, as = 'json', tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return { body: as === 'json' ? await res.json() : await res.text(), headers: res.headers };
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(2500 * i);
    }
  }
}

// 1. lista e produkteve (id + lidhja e faqes)
async function listProducts() {
  const out = [];
  let pages = 1;
  for (let page = 1; page <= pages; page++) {
    const { body, headers } = await get(`${API}?per_page=100&page=${page}`);
    if (page === 1) pages = Number(headers.get('x-wp-totalpages') || 1);
    for (const p of body) if (p.permalink) out.push({ id: p.id, url: p.permalink });
    if (MAX && out.length >= MAX) return out.slice(0, MAX);
    await sleep(500);
  }
  return out;
}

// 2. tabela e stokut në faqen e produktit
const ROW = /<tr><td>([^<]+)<\/td><td><span class="apis-status-icon apis-status-(in|out)"/g;
function parseStock(html) {
  let found = false, code = 0;
  for (const m of html.matchAll(ROW)) {
    found = true;
    const name = m[1].trim(), inStock = m[2] === 'in';
    if (inStock && name === WAREHOUSE) code |= 1;
    if (inStock && name === SHOP) code |= 2;
  }
  return found ? code : null;
}

async function main() {
  const t0 = Date.now();
  const products = await listProducts();
  console.log(`Produkte te autoking: ${products.length}`);

  const stock = {};
  let i = 0, failed = 0, noTable = 0;
  async function worker() {
    while (i < products.length) {
      const p = products[i++];
      try {
        const { body } = await get(p.url, 'text', 3);
        const code = parseStock(body);
        if (code === null) noTable++; else stock[p.id] = code;
      } catch { failed++; }
      await sleep(250);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));

  const n = Object.keys(stock).length;
  const counts = [0, 1, 2, 3].map(c => Object.values(stock).filter(v => v === c).length);
  console.log(`Me stok: ${n} | pa tabelë: ${noTable} | gabime: ${failed} | ${Math.round((Date.now() - t0) / 60000)} min`);
  console.log(`Të dyja: ${counts[3]} | Vetëm magazinë: ${counts[1]} | Vetëm dyqan: ${counts[2]} | Asgjëkund: ${counts[0]}`);

  // mbrojtje: nëse autoking nuk u lexua si duhet, mos e prish skedarin e djeshëm
  if (!MAX && n < products.length * 0.5) {
    if (existsSync(OUT)) console.log('U lexuan shumë pak produkte – stock.json i vjetër mbetet.');
    throw new Error('Shumë pak të dhëna stoku.');
  }
  const sorted = Object.fromEntries(Object.entries(stock).sort((a, b) => a[0] - b[0]));
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).s : null;
  if (prev && JSON.stringify(prev) === JSON.stringify(sorted)) { console.log('Asnjë ndryshim.'); return; }
  writeFileSync(OUT, JSON.stringify({ u: new Date().toISOString(), s: sorted }));
  console.log('Gati ✔');
}

main().catch(e => { console.error('GABIM:', e.message); process.exit(1); });
