/**
 * How long a Supabase Auth session cookie should be kept, in seconds.
 * Set explicitly (rather than relying on @supabase/ssr's own default) so the
 * "sessions persist for 30 days" guarantee is verifiable in code, not just
 * inherited from a library default that could change.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
