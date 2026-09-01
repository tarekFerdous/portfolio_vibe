import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

/**
 * Tables gated by migration 010's owner-email RLS policy. Public commenter
 * sign-in (this PRD) intentionally adds no new tables, so this list should
 * never need to change as part of the comments feature.
 */
export const ADMIN_SCOPED_TABLES = [
  'intro',
  'intro_covers',
  'projects',
  'blogs',
  'blog_blocks',
  'contacts',
] as const;

export type AdminScopedTable = (typeof ADMIN_SCOPED_TABLES)[number];

const ADMIN_EMAIL_USING_CLAUSE = `auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com'`;

interface EffectivePolicy {
  name: string;
  using: string;
}

const STATEMENT_PATTERN =
  /drop\s+policy\s+if\s+exists\s+"([^"]+)"\s+on\s+(\w+)\s*;|create\s+policy\s+"([^"]+)"\s+on\s+(\w+)\s+for\s+all\s+using\s+\(([\s\S]*?)\)\s*;/gi;

/**
 * Replays every `drop policy` / `create policy ... for all` statement that
 * targets one of the six admin-scoped tables, across all migration files in
 * filename order, to determine the RLS `using` clause each table would
 * actually end up with if the migrations ran against a fresh database.
 *
 * This is a regression guard, not a live database check: it would catch
 * migration 010 being reverted, deleted, or edited to loosen its `using`
 * clause, without needing a real Postgres connection in this environment.
 */
export function getEffectiveAdminWritePolicies(
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR
): Record<AdminScopedTable, EffectivePolicy | null> {
  const state: Record<string, EffectivePolicy | null> = Object.fromEntries(
    ADMIN_SCOPED_TABLES.map((table) => [table, null])
  );

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    STATEMENT_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = STATEMENT_PATTERN.exec(sql)) !== null) {
      const [, dropName, dropTable, createName, createTable, using] = match;

      if (dropName) {
        if (dropTable in state) {
          state[dropTable] = null;
        }
        continue;
      }

      if (createTable in state) {
        state[createTable] = { name: createName, using: using.trim() };
      }
    }
  }

  return state as Record<AdminScopedTable, EffectivePolicy | null>;
}

/**
 * Returns the admin-scoped tables whose effective write policy does NOT gate
 * on the site owner's email — i.e. a regression that would let any
 * authenticated session (including a verified commenter, now that public
 * sign-in exists) write to that table.
 */
export function findAdminWriteScopingViolations(migrationsDir?: string): AdminScopedTable[] {
  const policies = getEffectiveAdminWritePolicies(migrationsDir);
  return ADMIN_SCOPED_TABLES.filter((table) => {
    const policy = policies[table];
    return !policy || policy.using !== ADMIN_EMAIL_USING_CLAUSE;
  });
}
