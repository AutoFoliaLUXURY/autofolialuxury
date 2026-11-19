-- Banera të gatshme për slajderin (foto e plotë me tekst, çmim e buton brenda saj).
-- Hape në Supabase → SQL Editor → ngjite këtë tekst → Run. Mjafton një herë.
--   banner_url        = fotoja për kompjuter  (1920 × 720 px)
--   banner_mobile_url = fotoja për celular    (1080 × 1000 px)
--   link_product      = produkti që hapet kur klikohet slajdi (id nga tabela products)

alter table public.slides add column if not exists banner_url        text;
alter table public.slides add column if not exists banner_mobile_url text;
alter table public.slides add column if not exists link_product      text;

notify pgrst, 'reload schema';
