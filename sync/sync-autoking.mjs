// Sinkronizon produktet nga autoking.com.mk në tabelën "products" në Supabase.
// - çmimi = çmimi i autoking - ZBRITJA % (i rrumbullakuar në denar të plotë)
// - produktet e reja shtohen, ato që ndryshojnë përditësohen
// - produktet që zhduken nga autoking bëhen active=false (fshihen nga faqja)
// - produktet e tua (source_id bosh) nuk preken kurrë
//
// Variablat e ambientit:
//   SUPABASE_URL          p.sh. https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY  çelësi "service_role" (sekret! vetëm në GitHub Secrets)
//   DISCOUNT_PERCENT      parazgjedhur 4
//   DRY_RUN=1             vetëm shfaq çfarë do të bënte, pa shkruar asgjë
//   MAX_PAGES             (për testim) sa faqe të lexojë nga autoking

const SOURCE = 'https://autoking.com.mk/wp-json/wc/store/v1/products';
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const DISCOUNT = Number(process.env.DISCOUNT_PERCENT ?? 1);
const DRY_RUN = process.env.DRY_RUN === '1' || !SB_KEY;
const MAX_PAGES = Number(process.env.MAX_PAGES || 0);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = s => (s || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&#8211;/g, '–').replace(/&#8217;/g, '’')
  .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();
// tekst me rreshta (përshkrimi): ruan paragrafët dhe listat si te autoking
const decodeAll = s => s
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const stripText = s => decodeAll((s || '')
    .replace(/\s*\r?\n\s*/g, ' ') // kalimet e rreshtit brenda HTML nuk kanë rëndësi; rreshtat vijnë nga <br>, <p>, <div>
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ''))
  .split('\n').map(l => l.replace(/[ \t ]+/g, ' ').trim()).join('\n')
  .replace(/\n{3,}/g, '\n\n').trim();
// të dy tekstet e autoking: i shkurtri (shpesh: për cilat makina, p.sh. "A/CLA Class 2013-2017") + i plotë
const fullDescription = p => {
  const parts = [stripText(p.short_description), stripText(p.description)].filter(Boolean);
  return [...new Set(parts)].join('\n\n');
};
// rrumbullakim në denar të plotë (me rrumbullakim në 10 den, 1% humbet te çmimet e vogla, p.sh. 300 → 297 → 300)
// gjithmonë të paktën 1 den më lirë (te çmimet nën 50 den, 1% rrumbullakohet në 0)
const newPrice = orig => Math.max(1, Math.min(Math.round(orig * (1 - DISCOUNT / 100)), orig - 1));

async function getJson(url, opts = {}, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`.slice(0, 300));
      return { data: await res.json(), headers: res.headers };
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(2000 * i);
    }
  }
}

// ---------- 1. Lexo të gjitha produktet nga autoking ----------
async function fetchSource() {
  const all = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const { data, headers } = await getJson(`${SOURCE}?per_page=100&page=${page}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (product-sync)' }
    });
    if (page === 1) totalPages = Number(headers.get('x-wp-totalpages') || 1);
    if (MAX_PAGES) totalPages = Math.min(totalPages, MAX_PAGES);
    all.push(...data);
    await sleep(700); // mos e rëndo serverin
  }
  const rows = new Map();
  for (const p of all) {
    const orig = Number(p.prices?.price || 0);
    if (!orig) continue;
    rows.set(p.id, {
      source_id: p.id,
      name: strip(p.name),
      description: fullDescription(p),
      price: newPrice(orig),
      category: strip(p.categories?.[0]?.name).replace(/–/g, '-'),
      image_url: p.images?.[0]?.src || '',
      active: p.is_in_stock !== false
    });
  }
  return rows;
}

// ---------- 2. Supabase ----------
const sbHeaders = () => ({ apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' });

async function fetchExisting() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await getJson(
      `${SB_URL}/rest/v1/products?select=id,source_id,name,description,price,category,image_url,active&order=id&offset=${from}&limit=1000`,
      { headers: sbHeaders() });
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function sbWrite(method, path, body) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method, headers: { ...sbHeaders(), Prefer: 'return=minimal,resolution=merge-duplicates' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
}

// ---------- 3. Krahaso dhe shkruaj ----------
const FIELDS = ['name', 'description', 'price', 'category', 'image_url', 'active'];
const differs = (a, b) => FIELDS.some(f => String(a[f] ?? '') !== String(b[f] ?? ''));

async function main() {
  console.log(`Zbritja: ${DISCOUNT}%  ${DRY_RUN ? '(DRY RUN – asgjë nuk shkruhet)' : ''}`);
  const source = await fetchSource();
  console.log(`Autoking: ${source.size} produkte me çmim`);
  if (source.size < 100 && !MAX_PAGES) throw new Error('Shumë pak produkte – ndalova që të mos fshihen produktet gabimisht.');

  if (!SB_URL || DRY_RUN && !SB_KEY) {
    const sample = [...source.values()].slice(0, 5);
    console.log('Shembuj:', sample.map(r => `${r.name} → ${r.price} den`).join('\n  '));
    return;
  }

  const existing = await fetchExisting();
  const linked = new Map(existing.filter(r => r.source_id != null).map(r => [Number(r.source_id), r]));

  // Lidh produktet e importuara më parë me CSV (pa source_id) sipas emrit.
  // Vetëm ato me figurë nga autoking ose pa figurë – produktet e tua me figura në Supabase nuk preken.
  const byName = new Map();
  for (const r of source.values()) if (!byName.has(r.name)) byName.set(r.name, r);
  const toLink = [];
  for (const r of existing) {
    if (r.source_id != null) continue;
    const fromAutoking = !r.image_url || r.image_url.startsWith('https://autoking.com.mk/');
    const match = fromAutoking && byName.get(r.name);
    if (match && !linked.has(match.source_id)) {
      toLink.push({ id: r.id, source_id: match.source_id });
      linked.set(match.source_id, { ...r, source_id: match.source_id });
    }
  }

  const upserts = [];
  let added = 0, changed = 0;
  for (const [sid, row] of source) {
    const cur = linked.get(sid);
    if (!cur) { upserts.push(row); added++; }
    else if (differs(cur, row)) { upserts.push(row); changed++; }
  }
  // Me MAX_PAGES (testim) nuk e kemi listën e plotë, prandaj nuk fshehim asgjë.
  const hide = MAX_PAGES ? [] : [...linked.values()].filter(r => !source.has(Number(r.source_id)) && r.active).map(r => r.source_id);

  console.log(`Lidhje me CSV të vjetër: ${toLink.length} | Të reja: ${added} | Të ndryshuara: ${changed} | Për t'u fshehur: ${hide.length}`);
  if (DRY_RUN) return;

  for (const l of toLink) await sbWrite('PATCH', `products?id=eq.${l.id}`, { source_id: l.source_id });
  for (let i = 0; i < upserts.length; i += 500)
    await sbWrite('POST', 'products?on_conflict=source_id', upserts.slice(i, i + 500));
  for (let i = 0; i < hide.length; i += 200)
    await sbWrite('PATCH', `products?source_id=in.(${hide.slice(i, i + 200).join(',')})`, { active: false });
  console.log('Gati ✔');
}

main().catch(e => { console.error('GABIM:', e.message); process.exit(1); });
