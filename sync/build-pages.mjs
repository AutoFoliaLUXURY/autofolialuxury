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
<meta name="theme-color" content="#15181C">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23C8A45D'/%3E%3Ctext x='32' y='42' font-family='Arial,sans-serif' font-size='28' font-weight='800' text-anchor='middle' fill='%23111'%3EAL%3C/text%3E%3C/svg%3E">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Auto Luxury">
<meta property="og:locale" content="mk_MK">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
${image ? `<meta property="og:image" content="${esc(image)}">\n<meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fira+Sans+Extra+Condensed:ital,wght@0,700;0,800;1,800&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/pages.css">
${extra}
</head>
<body>
<div class="tb"><div class="wrap tb-row">
  <span><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>Сарај, Скопје</span>
  <a href="tel:${PHONE}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>${PHONE_TXT}</a>
  <span class="tb-hide"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M1 5h14v11H1z"/><path d="M15 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>Достава низ цела Македонија</span>
</div></div>
<header class="top">
  <div class="wrap bar">
    <a class="logo" href="../store.html" aria-label="Auto Luxury – почетна"><span class="lx-auto">Auto</span><span class="lx-lux">Luxury</span></a>
    <search class="srch">
      <form action="../store.html" method="get">
        <label for="q" class="sr-only">Пребарај производи</label>
        <input id="q" name="q" type="search" placeholder="Пребарај производ, модел или шифра…" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="search">
        <button type="submit" aria-label="Пребарај"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button>
      </form>
    </search>
    <a class="call" href="tel:${PHONE}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg><span>Јави се</span></a>
    <a class="call" href="../store.html" aria-label="Кошничка"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/></svg><span>Кошничка</span></a>
  </div>
  <nav class="nav" aria-label="Главна навигација"><div class="wrap">
    <a class="allc" href="../c/index.html">Сите категории</a><a href="../store.html">Почетна</a><a href="../store.html#products">Производи</a><a href="../store.html#brands">Брендови</a><a href="../store.html#contact">Контакт</a>
  </div></nav>
</header>`;
const foot = `<footer class="foot"><div class="wrap foot-in">
  <div><a class="logo" href="../store.html"><span class="lx-auto">Auto</span><span class="lx-lux">Luxury</span></a>
  <p>Авто опрема и додатоци, Сарај, Скопје. Брза достава низ цела Македонија.</p></div>
  <div><p><b>Контакт</b><br><a href="tel:${PHONE}">${PHONE_TXT}</a></p>
  <p><a href="../c/index.html">Сите категории</a><br><a href="../store.html">Онлајн продавница</a></p></div>
</div></footer>
<a class="fab" href="tel:${PHONE}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>Јави се</a>
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
        <a class="btn" href="../store.html?p=${esc(productKey(p))}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/></svg>Нарачај онлајн</a>
        <a class="btn2" href="tel:${PHONE}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>Јави се: ${PHONE_TXT}</a>
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

const CSS = `:root{--ink:#15181C;--ink-2:#1F242A;--gold:#D2AE62;--gold-2:#E3C485;--gold-deep:#8C6A2B;--gold-soft:rgba(210,174,98,.16);--text:#191C20;--muted:#5E6570;--border:#DCE0E5;--bg:#ECEEF1;--surface:#fff;--surface-2:#F4F5F7;--r:12px;--shadow:0 1px 2px rgba(21,24,28,.06),0 8px 24px rgba(21,24,28,.06);--shadow-lift:0 2px 4px rgba(21,24,28,.06),0 18px 40px rgba(21,24,28,.12);--display:'Fira Sans Extra Condensed','Arial Narrow',sans-serif;--carbon:repeating-linear-gradient(45deg,rgba(255,255,255,.028) 0 3px,transparent 3px 6px),repeating-linear-gradient(-45deg,rgba(0,0,0,.28) 0 3px,transparent 3px 6px)}
*{box-sizing:border-box}body{margin:0;font-family:Manrope,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:15px;color:var(--text);background:var(--bg);line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:inherit}img{max-width:100%;height:auto}.wrap{max-width:1240px;margin:0 auto;padding:0 24px}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.ico{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}
:focus-visible{outline:2px solid var(--gold-deep);outline-offset:2px}
.tb{background:var(--ink);color:#A3AAB3;font-size:13px}.tb-row{display:flex;align-items:center;gap:26px;height:38px}
.tb-row>*{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;text-decoration:none}.tb .ico{width:15px;height:15px;color:var(--gold)}.tb a:hover{color:#fff}
.top{background:#fff;position:sticky;top:0;z-index:5;box-shadow:0 1px 0 var(--border)}
.bar{display:flex;align-items:center;gap:22px;min-height:80px;flex-wrap:wrap;padding-top:10px;padding-bottom:10px}
.logo{position:relative;display:inline-flex;align-items:baseline;gap:9px;padding:4px 0 9px;font-family:var(--display);font-style:italic;font-weight:800;text-transform:uppercase;line-height:.9;color:var(--text);text-decoration:none;flex:0 0 auto}
.lx-auto,.lx-lux{font-size:36px}.lx-auto{letter-spacing:.015em}
.lx-lux{letter-spacing:.05em;padding-right:.12em;background:linear-gradient(105deg,#6E4F1C 0%,#B88C3E 14%,#F8E7B0 28%,#D2AE62 40%,#8A672A 52%,#E8C97E 66%,#FFF4CF 74%,#B4883A 86%,#7A5A22 100%);background-size:240% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 1px 0 rgba(90,64,20,.25))}
.logo::after{content:"";position:absolute;left:2px;right:0;bottom:0;height:2px;border-radius:2px;background:linear-gradient(90deg,currentColor 0 33%,transparent 33% 36%,#B88C3E 36%,#F8E7B0 62%,rgba(210,174,98,0) 100%)}
@media (prefers-reduced-motion:no-preference){.lx-lux{animation:lx-shine 2.4s cubic-bezier(.4,0,.2,1) .4s both}.logo:hover .lx-lux{animation:lx-shine 1.4s cubic-bezier(.4,0,.2,1) both}}
@keyframes lx-shine{from{background-position:100% 0}to{background-position:0 0}}
.srch{flex:1 1 300px;max-width:580px}.srch form{display:flex;height:48px;border:1.5px solid var(--border);border-radius:var(--r);overflow:hidden;background:#fff;transition:border-color .2s,box-shadow .2s}
.srch form:focus-within{border-color:var(--gold);box-shadow:0 0 0 4px var(--gold-soft)}
.srch input{flex:1;min-width:0;border:0;padding:0 16px;font:inherit;font-size:14px;outline:none;background:transparent}
.srch button{border:0;background:var(--gold);padding:0 20px;cursor:pointer;display:flex;align-items:center;color:var(--ink)}.srch button:hover{background:var(--gold-2)}
.srch button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.4}
.call{display:inline-flex;align-items:center;gap:9px;font-weight:700;font-size:14px;text-decoration:none;white-space:nowrap;padding:10px 12px;border-radius:var(--r)}.call:hover{background:var(--surface-2)}
.call .ico{width:21px;height:21px}.srch+.call{margin-left:auto}
.nav{background:var(--ink-2)}.nav .wrap{display:flex;gap:4px;height:50px;align-items:center;overflow-x:auto;scrollbar-width:none}
.nav a{color:#F3F4F6;text-decoration:none;font-size:14px;font-weight:600;white-space:nowrap;padding:8px 12px;border-radius:8px}.nav a:hover{background:rgba(255,255,255,.07)}
.nav a.allc{background:var(--gold);color:var(--ink);font-family:var(--display);font-size:17px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;border-radius:0;height:100%;display:flex;align-items:center;padding:0 20px;margin-right:16px}.nav a.allc:hover{background:var(--gold-2)}
.crumbs ol{list-style:none;display:flex;flex-wrap:wrap;gap:6px;padding:0;margin:22px 0;font-size:13px;color:var(--muted)}
.crumbs li+li::before{content:"›";margin-right:6px}.crumbs a{text-decoration:none;font-weight:600}.crumbs a:hover{color:var(--gold-deep)}
h1,h2{font-family:var(--display);font-weight:800;line-height:1.08;letter-spacing:.005em}
h1{font-size:clamp(28px,3.4vw,42px);margin:0 0 12px}h2{font-size:24px;margin:30px 0 14px;text-transform:uppercase}
.lead{color:var(--muted);margin:0 0 24px;max-width:75ch}.lead a{color:var(--gold-deep);font-weight:700}
.prod{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0;background:#fff;border-radius:20px;overflow:hidden;box-shadow:var(--shadow)}
.pimg{display:flex;align-items:center;justify-content:center;background:#fff;aspect-ratio:1/1;padding:28px;border-right:1px solid var(--surface-2)}.pimg img{width:100%;height:100%;object-fit:contain}
.pinfo{padding:36px 34px}.pinfo h2{font-size:20px}
.ph{color:var(--border);font-family:var(--display);font-style:italic;font-weight:800;font-size:22px}
.pcat{font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--gold-deep);text-decoration:none}.pcat:hover{text-decoration:underline}
.price{font-family:var(--display);font-size:40px;font-weight:800;line-height:1;margin:8px 0 22px}
.actions{display:flex;gap:10px;flex-wrap:wrap}
.btn,.btn2{display:inline-flex;align-items:center;gap:9px;padding:14px 22px;border-radius:var(--r);font-weight:800;text-decoration:none;font-size:15px;transition:background-color .2s,border-color .2s}
.btn{background:var(--gold);color:var(--ink);box-shadow:0 12px 30px -10px rgba(210,174,98,.6)}.btn:hover{background:var(--gold-2)}
.btn2{border:1.5px solid var(--border);background:#fff}.btn2:hover{border-color:var(--gold)}
.facts{list-style:none;padding:16px 0 0;margin:22px 0 0;color:var(--muted);font-size:14px;border-top:1px solid var(--surface-2);display:flex;flex-direction:column;gap:6px}
.desc{white-space:pre-line;color:#3A3F46;font-size:15px}
.grid{list-style:none;padding:0;margin:0 0 30px;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
.pc{display:flex;flex-direction:column;gap:8px;height:100%;background:#fff;border:1.5px solid transparent;border-radius:var(--r);overflow:hidden;text-decoration:none;box-shadow:var(--shadow);transition:border-color .2s,box-shadow .2s}
.pc:hover{border-color:var(--gold);box-shadow:var(--shadow-lift)}
.pc img,.pc .ph{width:100%;aspect-ratio:1/1;object-fit:contain;display:flex;align-items:center;justify-content:center;padding:12px}
.pc .n{padding:0 14px;font-size:13px;font-weight:700;line-height:1.4}
.pc b{padding:10px 14px 14px;margin-top:auto;font-family:var(--display);font-size:21px;font-weight:800;border-top:1px solid var(--surface-2)}
.cats ul{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
.cats a{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1.5px solid transparent;border-radius:10px;padding:12px 16px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:var(--shadow)}
.cats a:hover{border-color:var(--gold)}.cats small{color:var(--gold-deep);font-weight:800}
.foot{margin-top:56px;padding:44px 0 90px;color:#A3AAB3;font-size:14px;background-color:var(--ink);background-image:var(--carbon)}
.foot-in{display:grid;grid-template-columns:1.4fr 1fr;gap:32px}.foot .logo{color:#fff;margin-bottom:14px}.foot p{margin:0 0 12px;line-height:1.7}
.foot b{color:#fff}.foot a:not(.logo){color:var(--gold);font-weight:700;text-decoration:none}.foot a:not(.logo):hover{color:var(--gold-2)}
.fab{position:fixed;right:22px;bottom:22px;z-index:9;display:inline-flex;align-items:center;gap:10px;background:var(--gold);color:var(--ink);padding:14px 22px;border-radius:999px;font-weight:800;font-size:15px;text-decoration:none;box-shadow:0 14px 34px -8px rgba(21,24,28,.45),0 0 0 4px rgba(210,174,98,.25)}
.fab:hover{background:var(--gold-2)}.fab .ico{width:20px;height:20px}
@media(max-width:860px){.call span{display:none}}
@media(max-width:760px){.wrap{padding:0 16px}.tb{display:none}.bar{gap:8px;min-height:0}.lx-auto,.lx-lux{font-size:28px}.logo{gap:7px}
.srch{order:3;flex:1 1 100%;max-width:none}.srch form{height:46px}
.prod{grid-template-columns:1fr}.pimg{border-right:0;border-bottom:1px solid var(--surface-2);padding:18px}.pinfo{padding:22px}.price{font-size:34px}
.actions .btn,.actions .btn2{flex:1 1 100%;justify-content:center}
.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.foot-in{grid-template-columns:1fr}.fab{right:14px;bottom:14px;padding:13px 18px}}
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
