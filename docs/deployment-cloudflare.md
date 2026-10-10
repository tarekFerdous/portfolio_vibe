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

## Supabase Authentication URL Configuration

Magic-link sign-in (admin and commenter) only lands back on the site if Supabase allows the
redirect. Set these in the Supabase dashboard → Authentication → URL Configuration:

- **Site URL**: `https://tarekferdous.me`. Supabase silently falls back to this when a
  requested redirect isn't on the allow-list, so it must never be left as
  `http://localhost:3000` (that leftover sent production magic links to localhost).
- **Redirect URLs**:
  - `https://tarekferdous.me/auth/callback**`
  - `http://localhost:3000/auth/callback**`

  The trailing `**` is required: both flows redirect to `/auth/callback?next=…` (admin uses
  `next=/me`, commenters use `next=<current post path>`), and without the wildcard the query
  string makes the URL fail the allow-list check, triggering the Site URL fallback.

### Auth email delivery (Resend custom SMTP)

Supabase's built-in email sender is capped at ~2 auth emails per hour across the whole
project (admin and commenter sign-ins share it), which surfaces as "email rate limit
exceeded". Auth emails go through Resend instead (free tier: 3,000/month, 100/day):

1. Resend: add the domain `tarekferdous.me`, add its DNS records in Cloudflare
   (DNS only, not proxied) until it shows **Verified**, then create an API key.
2. Supabase → Authentication → Emails → SMTP Settings → enable custom SMTP:
   host `smtp.resend.com`, port `465`, username `resend`, password = the Resend API key,
   sender `login@tarekferdous.me`.
3. Supabase → Authentication → Rate Limits → "Email sent": raise from the 30/hour custom-SMTP
   default if needed. The effective cap is the lower of this and Resend's plan limit.

A separate per-address cooldown (one request per 60 seconds) still applies.

The admin magic-link Server Action builds the redirect from the browser's
`window.location.origin` (validated server-side: `https` anywhere, `http` only for
`localhost`/`127.0.0.1`), not from request headers, because behind Workers the host/proto
headers don't reliably match the public URL.

### Worker runtime secrets

`ADMIN_EMAIL` and `GITHUB_TOKEN` are read at request time by the Worker, so they must be set
as **Worker runtime secrets** (Worker → Settings → Variables and Secrets, or
`npx wrangler secret put <NAME>`), not only as Workers Builds build variables. Build
variables are only available during `opennextjs-cloudflare build`; without the runtime
secret, admin sign-in returns "Sign-in is not configured." and project README fetches fall
back to unauthenticated GitHub API calls (low rate limit).

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
