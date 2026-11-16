-- Slajderi i faqes së dyqanit (store.html), që ndryshohet nga paneli admin → "Слајдер".
-- Hape në Supabase → SQL Editor → ngjite të gjithë këtë tekst → Run. Mjafton një herë.

create table if not exists public.slides (
  id          bigint generated always as identity primary key,
  position    integer not null default 0,      -- radha (0 = i pari)
  kicker      text,                            -- etiketa e artë mbi titull
  title       text not null,                   -- titulli i madh
  text        text,                            -- rreshti i vogël poshtë titullit
  image_url   text,                            -- fotoja; bosh = merret vetë nga produktet
  link_group  text,                            -- kategoria kryesore që hapet me butonin
  link_cat    text,                            -- nënkategoria (opsionale)
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.slides enable row level security;

-- vizitorët e dyqanit shohin vetëm slajdet aktive
drop policy if exists "slides_public_read" on public.slides;
create policy "slides_public_read" on public.slides
  for select to anon using (active);

-- administratori i kyçur në panel i sheh dhe i ndryshon të gjitha
drop policy if exists "slides_admin_all" on public.slides;
create policy "slides_admin_all" on public.slides
  for all to authenticated using (true) with check (true);

-- 4 slajdet që janë sot në faqe (vetëm nëse tabela është bosh)
insert into public.slides (position, kicker, title, text, link_group, link_cat)
select * from (values
  (0, 'Ексклузивни модели', 'Накрајници за ауспух', 'Карбон, хром и црни завршници за секој стил.', 'ЕКСТЕРИЕР',     'НАКРАЈНИК ЗА АУСПУХ'),
  (1, 'Нова генерација',    'ЛЕД светла и барови',  'Посилна светлина, помала потрошувачка.',      'ОСВЕТЛУВАЊЕ',   'ЛЕД'),
  (2, 'Чистење и нега',     'Автокозметика',        'Сè што ви треба за возило што сјае.',         'АВТОКОЗМЕТИКА', null),
  (3, 'Ентериер',           'Волани и навлаки',     'Премиум допир при секое возење.',             'ИНТЕРИЕР',      'ВОЛАНИ')
) as v(position, kicker, title, text, link_group, link_cat)
where not exists (select 1 from public.slides);
