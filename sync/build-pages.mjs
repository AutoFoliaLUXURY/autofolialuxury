// Krijon faqe statike për Google nga produktet në Supabase:
//   p/<emri>-<nr>.html   – një faqe për çdo produkt (titull, çmim, foto, tekst, të dhëna "Product" për Google)
//   c/<kategoria>.html   – një faqe për çdo kategori, me linke te të gjitha produktet
//   c/index.html         – të gjitha kategoritë
//   sitemap.xml          – lista e të gjitha faqeve për Google
// Faqet që s'kanë më produkt (p.sh. produkt i fshehur) fshihen.
//
// Variablat e ambientit:
//   SUPABASE_URL   (parazgjedhur: projekti i dyqanit)
//   SUPABASE_KEY   çelësi për lexim (në GitHub: SUPABASE_SERVICE_KEY); nëse mungon, merret çelësi publik nga store.html
//   SITE_URL       adresa e sajtit, me "/" në fund (parazgjedhur: https://autofolialuxury.github.io/autofolialuxury/)
//   OUT_DIR        ku shkruhen faqet (parazgjedhur: dosja aktuale = rrënja e repos)

import fs from 'node:fs';
import path from 'node:path';

const SB_URL = process.env.SUPABASE_URL || 'https://fzgnhfbsibskkuiwcrls.supabase.co';
const SITE = (process.env.SITE_URL || 'https://autofolialuxury.github.io/autofolialuxury/').replace(/\/?$/, '/');
const OUT = path.resolve(process.env.OUT_DIR || '.');
const PHONE = '+38970855355', PHONE_TXT = '+389 70 855 355';
let KEY = process.env.SUPABASE_KEY;
if (!KEY) {
  const m = fs.readFileSync(path.join(OUT, 'store.html'), 'utf8').match(/const SB_KEY = '([^']+)'/);
  KEY = m && m[1];
}
if (!KEY) throw new Error('Mungon çelësi i Supabase (SUPABASE_KEY).');

/* ---------- ndihmës (të njëjta rregulla si te store.html) ---------- */
const CYR2LAT = {а:'a',б:'b',в:'v',г:'g',д:'d',ѓ:'gj',е:'e',ё:'e',ж:'zh',з:'z',ѕ:'dz',и:'i',ј:'j',й:'j',к:'k',л:'l',љ:'lj',м:'m',н:'n',њ:'nj',о:'o',п:'p',р:'r',с:'s',т:'t',ќ:'kj',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',џ:'dzh',ш:'sh',щ:'sh',ъ:'',ы:'i',ь:'',э:'e',ю:'ju',я:'ja'};
const decode = s => String(s || '')
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// emri në adresë: latinisht, shkronja të vogla, me viza (p.sh. "ЛЕД АМБИЕНТ AUDI Q7" → "led-ambient-audi-q7")
export const slugify = s => decode(s).toLowerCase()
  .replace(/[а-яёѓѕјљњќџ]/g, c => CYR2LAT[c] ?? c)
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '');
export const productKey = p => p.source_id != null ? String(p.source_id) : String(p.id).replace(/-/g, '').slice(0, 10);
export const productPath = p => `p/${slugify(p.name) || 'proizvod'}-${productKey(p)}.html`;
const normCat = c => decode(c).replace(/–|—/g, '-').replace(/\s+/g, ' ').trim();
// çmime të rrumbullakëta (poshtë): ≥1000 → në 100, ≥10 → në 10
const roundPrice = v => { const n = Number(v) || 0; return n >= 1000 ? Math.floor(n / 100) * 100 : n >= 10 ? Math.floor(n / 10) * 10 : n; };
const money = n => Number(n).toLocaleString('en-US') + ' MKD';
const OUR_IMPORTER = 'Увозник: AutoLuxuryMK, Сарај, +38970855355';
const fixDesc = t => String(t || '')
  .replace(/Увозник\s*:\s*Карикс\s*Груп[\s\S]{0,90}?Скопје,?(\s*\+\s*389\s*78\s*\/?\s*394\s*-?\s*07\d?)?/gi, OUR_IMPORTER)
  .replace(/Увозник\s*:\s*(Мега\s+Ауто\s+Парц|МАТРИКС)\s*[–-]\s*Скопје/gi, OUR_IMPORTER)
  .replace(/Увозник\s*:\s*Макорбитал/gi, OUR_IMPORTER)
  .replace(/Карикс\s*Груп/gi, 'AutoLuxuryMK')
  .replace(/\+\s*389\s*78\s*\/?\s*394\s*-?\s*07\d?/g, '+38970855355');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cut = (s, n) => s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
const jsonld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// grupet kryesore (si te store.html), për faqen me të gjitha kategoritë
const GROUPS = [
  { name: 'АВТО ОПРЕМА', cats: ['АВТО ОПРЕМА', 'АЛАТИ', 'БРИШАЧИ', 'ПАТУВАЊЕ', 'ЦЕРАДИ'] },
  { name: 'АВТОКОЗМЕТИКА', cats: ['89 AROMATIC', 'BRIO', 'DTR', 'K2', 'АВТОКОЗМЕТИКА', 'АРЕОН', 'АУТОЛАНД', 'КЛИ', 'МОТИП', 'ПАРФЕМИ IMAO', 'ТУРТЛЕ', 'ЧЕТКИ, КРПИ И СУНЃЕРИ'] },
  { name: 'ЕКСТЕРИЕР', cats: ['THOR', 'БОДИ КИТОВИ', 'ДИФУЗЕРИ', 'ЕКСТЕРИЕР', 'КАПАЦИ ЗА СТРАНИЧНИ РЕТРОВИЗОРИ', 'НАКРАЈНИК ЗА АУСПУХ', 'ПРАГОВИ', 'ПРЕДЕН ЛИП СПОЈЛЕР', 'ПРЕДНА МАСКА', 'ПРЕДНИ/ЗАДНИ БРАНИЦИ', 'РАТКАПНИ', 'СПОЈЛЕР'] },
  { name: 'ИНТЕРИЕР', cats: ['ВОЛАНИ', 'ИНТЕРИЕР', 'НАВЛАКИ ЗА ВОЛАН', 'НАВЛАКИ ЗА СЕДИШТИ', 'ПАТОСНИЦИ', 'РАЧКА ЗА МЕНУВАЧ', 'РАЧКИ ЗА ВРАТИ'] },
  { name: 'ОСВЕТЛУВАЊЕ', cats: ['PHOTON СИЈАЛИЦИ', 'КСЕНОН', 'ЛЕД', 'ОСВЕТЛУВАЊЕ', 'ТРАФОА', 'ФАРОВИ', 'ХАЛОГЕН', 'ШТОПОВИ'] },
  { name: 'ЕЛЕКТРИКА', cats: ['АКУМУЛАТОРИ - БАТЕРИИ', 'ДРУГО', 'ЕЛЕКТРИКА', 'КАМЕРА ЗА КОЛА', 'МП3 ТРАНСМИТЕРИ', 'ПАРКИНГ СЕНЗОРИ', 'ПРЕКИДАЧИ', 'РАДИО И ОПРЕМА'] },
  { name: 'АВТО ДОДАТОЦИ', cats: ['АВТО ДОДАТОЦИ', 'ГАЛАНТЕРИЈА', 'КЛУЧЕВИ', 'МОБИЛНА ГАЛАНТЕРИЈА', 'ПАНЦИР ЦРЕВА', 'ПРИВЕЗОК', 'СТАКЛО ЗА РЕТРОВИЗОР', 'СТИКЕРИ', 'ФОЛИЈА'] },
];

/* ---------- 1. merr produktet ---------- */
async function getAll() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const url = `${SB_URL}/rest/v1/products?select=id,source_id,name,description,price,category,image_url&active=eq.true&order=source_id.desc.nullsfirst,id&offset=${from}&limit=1000`;
    let res;
    for (let i = 1; ; i++) {
      res = await fetch(url, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
      if (res.ok) break;
      if (i >= 4) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
      await new Promise(r => setTimeout(r, 2000 * i));
    }
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

/* ---------- 2. pjesët e përbashkëta të faqeve ---------- */
const head = ({ title, desc, url, image, type = 'website', extra = '' }) => `<!DOCTYPE html>
<html lang="mk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#111111">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23C8A45D'/%3E%3Ctext x='32' y='42' font-family='Arial,sans-serif' font-size='28' font-weight='800' text-anchor='middle' fill='%23111'%3EAL%3C/text%3E%3C/svg%3E">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Auto Luxury">
<meta property="og:locale" content="mk_MK">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
${image ? `<meta property="og:image" content="${esc(image)}">\n<meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}
<link rel="stylesheet" href="../assets/pages.css">
${extra}
</head>
<body>
<header class="top">
  <div class="wrap bar">
    <a class="logo" href="../store.html">AUTO<span>LUXURY</span></a>
    <search class="srch">
      <form action="../store.html" method="get">
        <label for="q" class="sr-only">Пребарај производи</label>
        <input id="q" name="q" type="search" placeholder="Пребарај… (пр. F10, ambient)" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="search">
        <button type="submit" aria-label="Пребарај">🔍</button>
      </form>
    </search>
    <a class="call" href="tel:${PHONE}">☎ ${PHONE_TXT}</a>
  </div>
  <nav class="nav" aria-label="Главна навигација"><div class="wrap">
    <a href="../store.html">Почетна</a><a href="../c/index.html">Сите категории</a><a href="../store.html#contact">Контакт</a>
  </div></nav>
</header>`;
const foot = `<footer class="foot"><div class="wrap">
  <p><b>Auto Luxury</b> – авто опрема и додатоци, Сарај, Скопје. Телефон: <a href="tel:${PHONE}">${PHONE_TXT}</a></p>
  <p><a href="../c/index.html">Сите категории</a> · <a href="../store.html">Онлајн продавница</a></p>
</div></footer>
</body>
</html>
`;
const breadcrumbs = items => `<nav class="crumbs" aria-label="Патека"><ol>${items.map((it, i) =>
  `<li>${it.href && i < items.length - 1 ? `<a href="${esc(it.href)}">${esc(it.name)}</a>` : `<span aria-current="page">${esc(it.name)}</span>`}</li>`).join('')}</ol></nav>`;
const breadcrumbLd = items => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.abs })),
});
const card = (p, prefix) => `<li><a class="pc" href="${prefix}${esc(p.path)}">${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.dname)}" loading="lazy" decoding="async" width="300" height="300">` : '<span class="ph">AUTO LUXURY</span>'}<span class="n">${esc(p.dname)}</span><b>${money(p.price)}</b></a></li>`;

/* ---------- 3. faqja e produktit ---------- */
function productPage(p, related) {
  const url = SITE + p.path;
  const catUrl = p.catPath ? SITE + p.catPath : SITE + 'c/index.html';
  const desc = p.desc
    ? cut(p.desc.replace(/\s+/g, ' '), 155)
    : `Купете ${p.dname} по цена од ${money(p.price)} во Auto Luxury, Сарај. Брза достава низ Македонија.`;
  const crumbs = [
    { name: 'Почетна', href: '../store.html', abs: SITE + 'store.html' },
    { name: p.category || 'Производи', href: p.catPath ? '../' + p.catPath : '../c/index.html', abs: catUrl },
    { name: p.dname, abs: url },
  ];
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.dname, sku: productKey(p), category: p.category || undefined,
    image: p.image_url ? [p.image_url] : undefined,
    description: p.desc ? cut(p.desc, 4900) : undefined,
    url,
    offers: {
      '@type': 'Offer', url, price: p.price, priceCurrency: 'MKD',
      availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Auto Luxury' },
    },
  };
  return head({
    title: cut(`${p.dname} – ${money(p.price)} | Auto Luxury`, 70), desc, url, image: p.image_url, type: 'product',
    extra: jsonld(ld) + '\n' + jsonld(breadcrumbLd(crumbs)),
  }) + `
<main class="wrap">
  ${breadcrumbs(crumbs)}
  <article class="prod">
    <div class="pimg">${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.dname)}" width="600" height="600" fetchpriority="high">` : '<span class="ph">AUTO LUXURY</span>'}</div>
    <div class="pinfo">
      ${p.category ? `<a class="pcat" href="../${esc(p.catPath)}">${esc(p.category)}</a>` : ''}
      <h1>${esc(p.dname)}</h1>
      <p class="price">${money(p.price)}</p>
      <p class="actions">
        <a class="btn" href="../store.html?p=${esc(productKey(p))}">Нарачај онлајн</a>
        <a class="btn2" href="tel:${PHONE}">☎ Јави се: ${PHONE_TXT}</a>
      </p>
      <ul class="facts">
        <li>✓ Достава низ цела Македонија</li>
        <li>✓ Шифра: ${esc(productKey(p))}</li>
      </ul>
      <h2>Опис</h2>
      <div class="desc">${p.desc ? esc(p.desc) : `За повеќе информации јавете се на ${PHONE_TXT}.`}</div>
    </div>
  </article>
  ${related.length ? `<section class="rel" aria-labelledby="relT"><h2 id="relT">Слични производи${p.category ? ' од ' + esc(p.category) : ''}</h2><ul class="grid">${related.map(r => card(r, '../')).join('')}</ul></section>` : ''}
</main>
` + foot;
}

/* ---------- 4. faqja e kategorisë ---------- */
function categoryPage(cat, items) {
  const url = SITE + items[0].catPath;
  const crumbs = [
    { name: 'Почетна', href: '../store.html', abs: SITE + 'store.html' },
    { name: 'Категории', href: 'index.html', abs: SITE + 'c/index.html' },
    { name: cat, abs: url },
  ];
  const prices = items.map(p => p.price).filter(Boolean);
  const min = prices.length ? Math.min(...prices) : 0;
  const desc = `${cat}: ${items.length} производи${min ? ` од ${money(min)}` : ''} во Auto Luxury, Сарај. Брза достава низ Македонија. ☎ ${PHONE_TXT}`;
  return head({ title: cut(`${cat} – ${items.length} производи | Auto Luxury`, 70), desc, url, image: items.find(p => p.image_url)?.image_url,
    extra: jsonld(breadcrumbLd(crumbs)) }) + `
<main class="wrap">
  ${breadcrumbs(crumbs)}
  <h1>${esc(cat)}</h1>
  <p class="lead">${items.length} производи во категоријата ${esc(cat)}${min ? `, со цени од ${money(min)}` : ''}. Нарачајте онлајн или јавете се на <a href="tel:${PHONE}">${PHONE_TXT}</a>.</p>
  <ul class="grid">${items.map(p => card(p, '../')).join('')}</ul>
</main>
` + foot;
}

/* ---------- 5. faqja me të gjitha kategoritë ---------- */
function categoriesIndex(byCat) {
  const url = SITE + 'c/index.html';
  const known = new Set();
  const sections = GROUPS.map(g => {
    const cats = g.cats.map(normCat).filter(c => byCat.has(c));
    cats.forEach(c => known.add(c));
    return { name: g.name, cats };
  });
  const other = [...byCat.keys()].filter(c => !known.has(c)).sort();
  if (other.length) sections.push({ name: 'ДРУГИ КАТЕГОРИИ', cats: other });
  const total = [...byCat.values()].reduce((s, a) => s + a.length, 0);
  return head({ title: 'Сите категории – авто опрема | Auto Luxury', url,
    desc: `Сите категории на Auto Luxury: ${total} производи – ЛЕД, волани, навлаки, спојлери, автокозметика и додатоци. Брза достава низ Македонија.` }) + `
<main class="wrap">
  ${breadcrumbs([{ name: 'Почетна', href: '../store.html' }, { name: 'Категории' }])}
  <h1>Сите категории</h1>
  <p class="lead">${total} производи за вашето возило, поделени по категории.</p>
  ${sections.filter(s => s.cats.length).map(s => `<section class="cats"><h2>${esc(s.name)}</h2><ul>${s.cats.map(c =>
    `<li><a href="../${esc(byCat.get(c)[0].catPath)}">${esc(c)} <small>${byCat.get(c).length}</small></a></li>`).join('')}</ul></section>`).join('')}
</main>
` + foot;
}

const CSS = `:root{--gold:#C8A45D;--text:#141414;--muted:#5d6168;--border:#e4e4e1;--bg:#f6f6f4;--surface:#fff}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--text);background:var(--bg);line-height:1.5}
a{color:inherit}img{max-width:100%;height:auto}.wrap{max-width:1240px;margin:0 auto;padding:0 20px}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.top{background:#fff;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:5}
.bar{display:flex;align-items:center;gap:18px;min-height:68px;flex-wrap:wrap;padding-top:10px;padding-bottom:10px}
.logo{font-weight:800;font-size:20px;text-decoration:none;display:inline-flex;gap:6px;align-items:center}
.logo span{background:var(--gold);color:#111;padding:3px 9px;border-radius:8px}
.srch{flex:1 1 280px;max-width:520px}.srch form{display:flex;border:2px solid var(--gold);border-radius:999px;overflow:hidden;background:#fff}
.srch input{flex:1;min-width:0;border:0;padding:10px 14px;font:inherit;font-size:14px;outline:none}
.srch button{border:0;background:var(--gold);padding:0 18px;cursor:pointer;font-size:15px}
.call{margin-left:auto;font-weight:700;color:#8a7240;text-decoration:none;white-space:nowrap}
.nav{background:#111}.nav .wrap{display:flex;gap:22px;height:42px;align-items:center;overflow-x:auto}
.nav a{color:#fff;text-decoration:none;font-size:13px;font-weight:700;text-transform:uppercase;white-space:nowrap}.nav a:hover{color:var(--gold)}
.crumbs ol{list-style:none;display:flex;flex-wrap:wrap;gap:6px;padding:0;margin:18px 0;font-size:13px;color:var(--muted)}
.crumbs li+li::before{content:"›";margin-right:6px}.crumbs a{text-decoration:none}.crumbs a:hover{color:#8a7240}
h1{font-size:clamp(24px,3vw,34px);line-height:1.2;margin:0 0 10px}h2{font-size:20px;margin:28px 0 12px}
.lead{color:var(--muted);margin:0 0 22px;max-width:75ch}
.prod{display:grid;grid-template-columns:1fr 1fr;gap:32px;background:#fff;border:1px solid var(--border);border-radius:12px;padding:24px}
.pimg{display:flex;align-items:center;justify-content:center;background:#fff;aspect-ratio:1/1}.pimg img{width:100%;height:100%;object-fit:contain}
.ph{color:#d6d3cb;font-weight:800}.pcat{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-decoration:none}
.price{font-size:28px;font-weight:800;color:#8a7240;margin:6px 0 16px}
.actions{display:flex;gap:10px;flex-wrap:wrap}.btn,.btn2{display:inline-block;padding:13px 22px;border-radius:999px;font-weight:700;text-decoration:none;font-size:14px}
.btn{background:var(--gold);color:#111}.btn2{border:1px solid var(--border);background:#fff}.btn:hover{filter:brightness(.95)}.btn2:hover{border-color:var(--gold)}
.facts{list-style:none;padding:0;margin:16px 0;color:var(--muted);font-size:14px}
.desc{white-space:pre-line;color:#33363b;font-size:15px}
.grid{list-style:none;padding:0;margin:0 0 30px;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px}
.pc{display:flex;flex-direction:column;gap:8px;height:100%;background:#fff;border:1px solid var(--border);border-radius:10px;overflow:hidden;text-decoration:none}
.pc:hover{border-color:var(--gold)}.pc img,.pc .ph{width:100%;aspect-ratio:1/1;object-fit:contain;display:flex;align-items:center;justify-content:center}
.pc .n{padding:0 10px;font-size:13px;font-weight:600}.pc b{padding:0 10px 10px;margin-top:auto;color:#8a7240}
.cats ul{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
.cats a{display:flex;justify-content:space-between;background:#fff;border:1px solid var(--border);border-radius:8px;padding:10px 14px;text-decoration:none;font-weight:600;font-size:14px}
.cats a:hover{border-color:var(--gold)}.cats small{color:var(--muted)}
.foot{border-top:1px solid var(--border);margin-top:40px;padding:24px 0;color:var(--muted);font-size:14px;background:#fff}
@media(max-width:760px){.prod{grid-template-columns:1fr;padding:16px}.call{margin-left:0}.grid{grid-template-columns:repeat(2,1fr)}}
`;

/* ---------- 6. ndërto gjithçka ---------- */
async function main() {
  const rows = await getAll();
  console.log(`Produkte nga Supabase: ${rows.length}`);
  if (rows.length < 1000) throw new Error('Shumë pak produkte – ndalova, që të mos fshihen faqet gabimisht.');

  const products = rows.map(r => ({
    ...r,
    dname: decode(r.name).replace(/\s+[–-]\s*$/, '').trim(), // pa "–" bosh në fund të emrit
    category: normCat(r.category),
    price: roundPrice(r.price),
    desc: fixDesc(decode(r.description)).trim(),
  }));
  // adresa unike për çdo produkt
  const seen = new Set();
  for (const p of products) {
    let rel = productPath(p);
    for (let i = 2; seen.has(rel); i++) rel = productPath(p).replace(/\.html$/, `-${i}.html`);
    seen.add(rel); p.path = rel;
  }
  // kategoritë
  const byCat = new Map();
  for (const p of products) if (p.category) { if (!byCat.has(p.category)) byCat.set(p.category, []); byCat.get(p.category).push(p); }
  const catSeen = new Set();
  for (const [cat, items] of byCat) {
    let rel = `c/${slugify(cat) || 'kategorija'}.html`;
    for (let i = 2; catSeen.has(rel) || rel === 'c/index.html'; i++) rel = `c/${slugify(cat) || 'kategorija'}-${i}.html`;
    catSeen.add(rel); items.forEach(p => { p.catPath = rel; });
  }

  // shkruaj (vetëm kur ndryshon, që git të shohë vetëm ndryshimet e vërteta)
  let written = 0;
  const write = (rel, content) => {
    const f = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    if (fs.existsSync(f) && fs.readFileSync(f, 'utf8') === content) return;
    fs.writeFileSync(f, content); written++;
  };
  write('assets/pages.css', CSS);
  write('.nojekyll', ''); // GitHub Pages: shërbeji skedarët ashtu siç janë (më shpejt me shumë faqe)

  for (const p of products) {
    const list = byCat.get(p.category) || [];
    const i = list.indexOf(p);
    // 12 produkte fqinje nga e njëjta kategori (më të rejat përreth këtij produkti)
    const related = list.length > 1 ? [...list.slice(i + 1, i + 7), ...list.slice(Math.max(0, i - 6), i)].slice(0, 12) : [];
    if (related.length < 12) related.push(...list.filter(x => x !== p && !related.includes(x)).slice(0, 12 - related.length));
    write(p.path, productPage(p, related));
  }
  for (const [cat, items] of byCat) write(items[0].catPath, categoryPage(cat, items));
  write('c/index.html', categoriesIndex(byCat));

  // sitemap
  const urls = [SITE + 'store.html', SITE + 'c/index.html',
    ...[...byCat.values()].map(items => SITE + items[0].catPath),
    ...products.map(p => SITE + p.path)];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>\n`);

  // fshi faqet e vjetra që s'kanë më produkt / kategori
  const keep = new Set([...products.map(p => p.path), ...[...byCat.values()].map(i => i[0].catPath), 'c/index.html'].map(r => path.join(OUT, r)));
  let removed = 0;
  for (const dir of ['p', 'c']) {
    const d = path.join(OUT, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      if (f.endsWith('.html') && !keep.has(full)) { fs.unlinkSync(full); removed++; }
    }
  }
  console.log(`Faqe produktesh: ${products.length} | Kategori: ${byCat.size} | Skedarë të ndryshuar: ${written} | Të fshirë: ${removed} | URL në sitemap: ${urls.length}`);
}

main().catch(e => { console.error('GABIM:', e.message); process.exit(1); });
