# Slider banners for autoluxury.mk: instructions for Claude

> **For the user (Albanian):** When you want to change the slider products, on any PC, tell Claude:
> "Lexo https://github.com/AutoFoliaLUXURY/autofolialuxury/tree/main/dizajni-banerave dhe ndrysho produktet e sliderit."

This folder holds the approved banner design (approved 2026-11-19). Repeat it exactly. Do not ask the user how. The user is non-technical and speaks Albanian; the shop texts are Macedonian.

## Design
- **Left side:** dark navy panel (#0B1420→#13233A) with faint snow dots, and a gold kicker "❄ ЗИМСКА ОПРЕМА".
- **Title:** in a red skewed box (Fira Sans Extra Condensed, italic 900, uppercase), with a white subtitle under it.
- **Text:** a short lead with a red left border, then 4 feature chips with gold line icons.
- **Price and button:** price tag "ЦЕНА | xxx MKD" (red label, white value), then a gold pill CTA "НАРАЧАЈ СЕГА →".
- **Right side:** light icy panel with a diagonal gold seam. The product photo (white background) uses `mix-blend-mode:multiply`. An optional gold-outlined pill badge can go here.
- **Sizes:**
  - Desktop: **1920×720**.
  - Mobile: **1080×1000**. Use `?v=m`.
  - Format: JPG quality ~86, under ~200 KB.
- **Mobile layout:**
  - Product on top, text in the dark area below.
  - Keep the bottom-center ~100px free for the slider dots.
  - The product must stay above the seam, because multiply turns it black on the dark area.

## Files
- `TEMPLATE-me-madhesi.html`: template with size chips.
- `TEMPLATE-me-etikete.html`: template with a pill badge.
- `snow-socks.html`, `ice-scraper.html`, `snow-chains.html`, `car-heater.html`: the 4 finished slides.
- `render.ps1`: run `powershell -NoProfile -ExecutionPolicy Bypass -File render.ps1 -Html x.html -Name name`. It uses headless Edge and produces `name-kompjuter-1920x720.jpg` and `name-celular-1080x1000.jpg`.

To make a new banner:
1. Copy a template.
2. Swap the img src, texts, price and icons.
3. Tune `.banner.d .product` and `.banner.m .product` (left, top, width, height).
4. Render.
5. Look at both JPGs and fix any overlaps.

## Product and price
- Find the product through Supabase REST. SB_URL and SB_KEY (anon) are in the site's index.html.
- Price on the banner = shop display price = roundPrice(db price):
  - 1000 or more: floor to 100.
  - 10 or more: floor to 10.
- Check that the description and photo match what the user sent. Near-duplicate products exist with wrong descriptions. For example, "Греалка за греење и ладење 150W" has scraper text; the correct heater is "ГРЕАЛКА ЗА НА КОЛА N018".

## Upload
1. The user logs in to https://autoluxury.mk/admin.html. Claude never logs in or types passwords.
2. Go to Слајдер → Измени:
   - Clear kicker, text and category.
   - Set Наслов.
   - Search for and pick the product in "Производ".
3. The user picks the 2 banner files (desktop and mobile).
4. Verify the file names via JS, then click Зачувај.
5. Check the live site:
   - The `.slider.banners` class is present.
   - Clicking a banner opens the product.

All active slides must be banners for the full-size banner mode.

## Current slides (2026-11-19)
1. Чорапи за снег: RCHANG M, 1.100 MKD
2. Гребалка со ракавица: 110 MKD
3. Ланци за снег 9 мм: CHAINS FOR SNOW 50 9MM, 990 MKD
4. Греалка за авто 12V: N018, 440 MKD

## Site notes
- **Hosting:** GitHub Pages, repo AutoFoliaLUXURY/autofolialuxury, branch main.
- **Publishing:** done through the GitHub web upload page if git isn't installed. The user drags the files in.
- **Nightly sync** (`sync/sync-autoking.mjs`, 03:00 UTC): overwrites name, description, price, category and image of synced products, so manual edits are reverted.
- **"New" badge:** shown on products created after 2026-11-15, for 14 days. Controlled by NEW_DAYS and NEW_AFTER in index.html.
