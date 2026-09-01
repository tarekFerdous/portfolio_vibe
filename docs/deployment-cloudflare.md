# Deploying to tarekferdous.me via Cloudflare Workers

Status as of 2026-07-25: app is scaffolded and building successfully via OpenNext;
Workers Builds is connected and deploying; custom domain (apex) is live; `www` redirect
is not working yet (see Open issue below).

## What's done

1. **OpenNext adapter scaffolded** (commit `6629a6a`, pushed to `main`):
   - Ran `npx @opennextjs/cloudflare@latest migrate`
   - Added/updated: `wrangler.jsonc`, `open-next.config.ts`, `public/_headers`, `next.config.js`
     (added `initOpenNextCloudflareForDev()`), `package.json` scripts (`preview`, `deploy`,
     `upload`, `cf-typegen`), `.gitignore` (`.open-next`, `.wrangler`, `.dev.vars*`)
   - `wrangler.jsonc` route: `{ "pattern": "tarekferdous.me", "custom_domain": true }`
   - `.dev.vars` created locally (gitignored) with `NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_EMAIL` copied from `.env.local`, for local
     `wrangler dev` / `npm run preview` testing.
   - Verified locally: `npx opennextjs-cloudflare build` succeeds; `wrangler dev` served
     `/` (200), `/me/login` (200), `/me` (307 → login) correctly against the Workers runtime.

2. **Cloudflare dashboard — Workers Builds connected**:
   - Workers & Pages → Create → Import repository → `tarekFerdous/portfolio_vibe`, branch `main`
   - Build command: `npx @opennextjs/cloudflare build`
   - Deploy command: `npx @opennextjs/cloudflare deploy`
   - Env vars set under Build variables and secrets: `NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_EMAIL`
   - "Build non-production branches" left unchecked (only `main` matters here)
   - Note: the dashboard's Deploy button was unresponsive at first — fixed by a hard
     refresh of the setup page before re-submitting. If this recurs, also check that the
     Cloudflare GitHub App has access to `portfolio_vibe` under
     https://github.com/settings/installations.

3. **Custom domain (apex) attached**: `tarekferdous.me` → Worker, via
   Worker → Settings → Domains & Routes → Add Custom Domain. DNS + SSL auto-provisioned
   since the zone is already in this Cloudflare account. **Working.**

## Open issue: www.tarekferdous.me

Goal: `www.tarekferdous.me` → 301 redirect → `https://tarekferdous.me`.

Steps taken:
- Added a DNS record: `CNAME www → tarekferdous.me`, **Proxied** (orange cloud) — required,
  since Redirect Rules only fire for traffic actually routed through Cloudflare's edge.
- Added a Redirect Rule (zone → Rules → Redirect Rules): hostname equals
  `www.tarekferdous.me` → dynamic redirect to
  `concat("https://tarekferdous.me", http.request.uri.path)`, 301.

Current symptom: visiting `www.tarekferdous.me` returns **"origin unreachable" (Cloudflare
523)**. This means the redirect rule is not intercepting the request before Cloudflare
tries to reach an origin — and there's no real origin behind that CNAME (the apex's DNS
entry is a Workers Custom Domain, not a normal server), so it 523s instead.

### Next things to check
1. In Rules → Redirect Rules, confirm the rule is **Enabled**, the match is exactly
   `Hostname equals www.tarekferdous.me` (no scheme, no trailing slash), and the redirect
   type/expression/status code are as above.
2. If that all looks right, wait a couple of minutes for propagation and retest in an
   incognito window (rules out local DNS/browser caching of the failed attempt).
3. **Fallback if still broken**: stop relying on the dashboard Redirect Rule. Instead:
   - Add a second custom domain route in `wrangler.jsonc`:
     `{ "pattern": "www.tarekferdous.me", "custom_domain": true }`
   - Add the www→apex redirect directly in `middleware.ts` (which already runs on every
     request) — check `request.nextUrl.hostname === 'www.tarekferdous.me'` and return
     `NextResponse.redirect` to the apex with the same path.
   - Add the domain in the dashboard the same way the apex was added, then redeploy.
   This avoids the Rules product entirely and is easier to reason about since it's just
   code already covered by the existing local build/test loop.

## Remaining verification (once www is fixed)

- `https://tarekferdous.me`: public pages render, Supabase-hosted images load,
  `/me/login` magic-link flow works, an admin Server Action succeeds (e.g. edit intro/projects).
- `https://www.tarekferdous.me`: redirects to apex.
- Check Worker logs in the Cloudflare dashboard for runtime errors.
