-- ============================================================
-- FIX: leje/grants për tabelat products dhe orders
-- Ekzekuto te Supabase -> SQL Editor -> New query -> Run
-- ============================================================

-- Lejo rolin "anon" (vizitorët e faqes publike) të lexojë produktet
grant select on public.products to anon, authenticated;

-- Lejo rolin "anon" të krijojë porosi (checkout)
grant insert on public.orders to anon, authenticated;

-- I kyquri (authenticated = ti/vëllai) ka qasje të plotë
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.orders  to authenticated;

-- Sigurohu që skema publike është e qasshme (zakonisht e vendosur tashmë)
grant usage on schema public to anon, authenticated;
