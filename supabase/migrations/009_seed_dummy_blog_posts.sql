-- Seed dummy blog posts for public Posts feature testing (#105)
-- 8 published posts (varied publish_date for newest-first ordering) + 1 draft post.
-- Safe to re-run: blogs insert uses on conflict (slug) do nothing, and blog_blocks
-- inserts are scoped by a select against the (unique) slug, so re-running this file
-- against a database that already has these rows will not duplicate blocks either,
-- as long as the blogs insert no-ops on conflict.

-- 1. Winter Hike Through Gatineau Park
insert into blogs (title, slug, excerpt, cover_image_url, author, location, publish_date, status)
values (
  'Winter Hike Through Gatineau Park',
  'winter-hike-through-gatineau-park',
  'A crisp December trek through snow-dusted trails, with a stop at a frozen lookout over the Ottawa Valley.',
  'https://picsum.photos/seed/gatineau-park/800/600',
  'Tarek Ferdous',
  'Gatineau, QC',
  '2026-02-14',
  'published'
)
on conflict (slug) do nothing;

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>The trailhead was quiet, blanketed in a fresh inch of snow from the night before. We started early to catch the light coming up over the ridge.</p>', null, 0
from blogs where slug = 'winter-hike-through-gatineau-park';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'photo', null, 'https://picsum.photos/seed/gatineau-lookout/800/600', 1
from blogs where slug = 'winter-hike-through-gatineau-park';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>By the time we reached the lookout, the lake below had frozen solid enough to reflect the pale winter sky. Worth every frozen toe.</p>', null, 2
from blogs where slug = 'winter-hike-through-gatineau-park';

-- 2. A Weekend in Old Montreal
insert into blogs (title, slug, excerpt, cover_image_url, author, location, publish_date, status)
values (
  'A Weekend in Old Montreal',
  'a-weekend-in-old-montreal',
  'Cobblestone streets, riverside cafes, and a lot of pastries in the heart of Montreal''s historic district.',
  'https://picsum.photos/seed/old-montreal/800/600',
  'Tarek Ferdous',
  'Montreal, QC',
  '2025-12-03',
  'published'
)
on conflict (slug) do nothing;

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>Old Montreal has a way of making you forget what century you''re in. Between the stone facades and the horse-drawn carriages, it felt like stepping into a postcard.</p>', null, 0
from blogs where slug = 'a-weekend-in-old-montreal';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'photo', null, 'https://picsum.photos/seed/montreal-cafe/800/600', 1
from blogs where slug = 'a-weekend-in-old-montreal';

-- 3. Debugging a Race Condition at 2am
insert into blogs (title, slug, excerpt, cover_image_url, author, location, publish_date, status)
values (
  'Debugging a Race Condition at 2am',
  'debugging-a-race-condition-at-2am',
  'A late-night war story about a flaky test suite, a subtle async bug, and the cup of coffee that saw it through.',
  'https://picsum.photos/seed/race-condition/800/600',
  'Tarek Ferdous',
  'Toronto, ON',
  '2025-10-21',
  'published'
)
on conflict (slug) do nothing;

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>The test only failed on CI, never locally. That should have been the first clue that timing, not logic, was the culprit.</p>', null, 0
from blogs where slug = 'debugging-a-race-condition-at-2am';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>Turned out two promises were racing to write the same cache key. Adding a mutex around the write fixed it in one line, after four hours of staring.</p>', null, 1
from blogs where slug = 'debugging-a-race-condition-at-2am';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'photo', null, 'https://picsum.photos/seed/late-night-code/800/600', 2
from blogs where slug = 'debugging-a-race-condition-at-2am';

-- 4. Notes from a Small Backyard Garden
insert into blogs (title, slug, excerpt, cover_image_url, author, location, publish_date, status)
values (
  'Notes from a Small Backyard Garden',
  'notes-from-a-small-backyard-garden',
  'What a season of tomatoes, basil, and one very persistent squirrel taught me about patience.',
  'https://picsum.photos/seed/backyard-garden/800/600',
  'Tarek Ferdous',
  'Ottawa, ON',
  '2025-08-09',
  'published'
)
on conflict (slug) do nothing;

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>I planted way too many tomato seedlings in April, convinced half of them wouldn''t make it. Naturally, all of them did.</p>', null, 0
from blogs where slug = 'notes-from-a-small-backyard-garden';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'photo', null, 'https://picsum.photos/seed/tomato-vines/800/600', 1
from blogs where slug = 'notes-from-a-small-backyard-garden';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'photo', null, 'https://picsum.photos/seed/backyard-harvest/800/600', 2
from blogs where slug = 'notes-from-a-small-backyard-garden';

-- 5. Building a Personal Portfolio with Next.js and Supabase
insert into blogs (title, slug, excerpt, cover_image_url, author, location, publish_date, status)
values (
  'Building a Personal Portfolio with Next.js and Supabase',
  'building-a-personal-portfolio-with-nextjs-and-supabase',
  'A behind-the-scenes look at the stack, the tradeoffs, and the small decisions that shaped this site.',
  'https://picsum.photos/seed/portfolio-build/800/600',
  'Tarek Ferdous',
  'Toronto, ON',
  '2025-06-17',
  'published'
)
on conflict (slug) do nothing;

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>I wanted a portfolio that felt like a real app, not a static template, so I reached for Next.js App Router and Supabase for the backend.</p>', null, 0
from blogs where slug = 'building-a-personal-portfolio-with-nextjs-and-supabase';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>Row Level Security ended up doing a lot of heavy lifting, letting the public site read published content while the admin panel keeps full control.</p>', null, 1
from blogs where slug = 'building-a-personal-portfolio-with-nextjs-and-supabase';

-- 6. Coffee Shops Worth the Detour in Vancouver
insert into blogs (title, slug, excerpt, cover_image_url, author, location, publish_date, status)
values (
  'Coffee Shops Worth the Detour in Vancouver',
  'coffee-shops-worth-the-detour-in-vancouver',
  'Three small roasters, one rainy afternoon, and a ranking nobody asked for but everybody needs.',
  'https://picsum.photos/seed/vancouver-coffee/800/600',
  'Priya Nair',
  'Vancouver, BC',
  '2025-04-02',
  'published'
)
on conflict (slug) do nothing;

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>Vancouver rain has a way of turning any coffee crawl into an endurance sport. Worth it every time.</p>', null, 0
from blogs where slug = 'coffee-shops-worth-the-detour-in-vancouver';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'photo', null, 'https://picsum.photos/seed/pourover/800/600', 1
from blogs where slug = 'coffee-shops-worth-the-detour-in-vancouver';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>My favorite of the three had a single window seat overlooking the harbor, which is exactly the kind of thing that ruins you for other coffee shops.</p>', null, 2
from blogs where slug = 'coffee-shops-worth-the-detour-in-vancouver';

-- 7. A Beginner's Guide to Sourdough
insert into blogs (title, slug, excerpt, cover_image_url, author, location, publish_date, status)
values (
  'A Beginner''s Guide to Sourdough',
  'a-beginners-guide-to-sourdough',
  'Everything I wish someone had told me before I named my starter and got emotionally invested in it.',
  'https://picsum.photos/seed/sourdough-guide/800/600',
  'Tarek Ferdous',
  'Halifax, NS',
  '2025-01-11',
  'published'
)
on conflict (slug) do nothing;

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>My starter took nine days to become reliably active, and I nearly gave up on day six. Glad I didn''t.</p>', null, 0
from blogs where slug = 'a-beginners-guide-to-sourdough';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'photo', null, 'https://picsum.photos/seed/sourdough-loaf/800/600', 1
from blogs where slug = 'a-beginners-guide-to-sourdough';

-- 8. Six Months of Running: What Actually Worked
insert into blogs (title, slug, excerpt, cover_image_url, author, location, publish_date, status)
values (
  'Six Months of Running: What Actually Worked',
  'six-months-of-running-what-actually-worked',
  'A no-nonsense recap of the habits, gear, and small tweaks that turned running into something I actually look forward to.',
  'https://picsum.photos/seed/running-recap/800/600',
  'Tarek Ferdous',
  'Calgary, AB',
  '2025-09-28',
  'published'
)
on conflict (slug) do nothing;

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>The biggest change wasn''t the shoes or the app, it was simply running slower than felt natural. Everything got easier after that.</p>', null, 0
from blogs where slug = 'six-months-of-running-what-actually-worked';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'photo', null, 'https://picsum.photos/seed/morning-run/800/600', 1
from blogs where slug = 'six-months-of-running-what-actually-worked';

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>By month six, a 10k on a Sunday morning felt less like a chore and more like the best part of the week.</p>', null, 2
from blogs where slug = 'six-months-of-running-what-actually-worked';

-- 9. Draft: Rethinking the Homepage Hero (draft, should stay hidden from public views)
insert into blogs (title, slug, excerpt, cover_image_url, author, location, publish_date, status)
values (
  'Rethinking the Homepage Hero',
  'rethinking-the-homepage-hero',
  'Early thoughts on simplifying the landing page hero section, not ready for publishing yet.',
  'https://picsum.photos/seed/homepage-hero-draft/800/600',
  'Tarek Ferdous',
  'Toronto, ON',
  '2026-02-20',
  'draft'
)
on conflict (slug) do nothing;

insert into blog_blocks (blog_id, block_type, content, image_url, display_order)
select id, 'text', '<p>Draft notes: the current hero has too much competing text. Considering cutting it down to a single sentence and a stronger visual.</p>', null, 0
from blogs where slug = 'rethinking-the-homepage-hero';
