import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ADMIN_SCOPED_TABLES,
  findAdminWriteScopingViolations,
  getEffectiveAdminWritePolicies,
} from '@/lib/supabase/rls-admin-write-scoping';

const ADMIN_EMAIL_USING_CLAUSE = `auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com'`;

const tempDirs: string[] = [];

function makeMigrationsDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'rls-admin-write-scoping-'));
  tempDirs.push(dir);
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), contents);
  }
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('findAdminWriteScopingViolations against the real migrations directory', () => {
  it('has no violations: every admin-scoped table is still gated on the owner email', () => {
    expect(findAdminWriteScopingViolations()).toEqual([]);
  });

  it('resolves each of the six admin-scoped tables to the owner-email using clause', () => {
    const policies = getEffectiveAdminWritePolicies();
    for (const table of ADMIN_SCOPED_TABLES) {
      expect(policies[table]?.using).toBe(ADMIN_EMAIL_USING_CLAUSE);
    }
  });
});

describe('findAdminWriteScopingViolations regression detection', () => {
  it('flags a table if migration 010 is reverted, leaving the original migration 001 policy in effect', () => {
    const dir = makeMigrationsDir({
      '001_initial_schema.sql': `
        create policy "Auth write intro" on intro for all using (auth.role() = 'authenticated');
      `,
      // 010_scope_admin_writes_to_owner_email.sql intentionally absent — simulates a revert.
    });

    const violations = findAdminWriteScopingViolations(dir);

    expect(violations).toContain('intro');
  });

  it('flags a table if a later migration loosens the using clause instead of scoping it', () => {
    const dir = makeMigrationsDir({
      '001_initial_schema.sql': `
        create policy "Auth write projects" on projects for all using (auth.role() = 'authenticated');
      `,
      '010_scope_admin_writes_to_owner_email.sql': `
        drop policy if exists "Auth write projects" on projects;
        create policy "Auth write projects" on projects for all
          using (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com');
      `,
      '011_oops_reopen_it.sql': `
        drop policy if exists "Auth write projects" on projects;
        create policy "Auth write projects" on projects for all using (auth.role() = 'authenticated');
      `,
    });

    const violations = findAdminWriteScopingViolations(dir);

    expect(violations).toContain('projects');
  });

  it('flags a table whose write policy is dropped and never recreated', () => {
    const dir = makeMigrationsDir({
      '001_initial_schema.sql': `
        create policy "Auth write blogs" on blogs for all
          using (auth.jwt() ->> 'email' = 'tarekferdous3@gmail.com');
      `,
      '002_drop_it.sql': `
        drop policy if exists "Auth write blogs" on blogs;
      `,
    });

    const violations = findAdminWriteScopingViolations(dir);

    expect(violations).toContain('blogs');
  });

  it('has no violations when every admin-scoped table is correctly owner-email scoped', () => {
    const files: Record<string, string> = {};
    for (const table of ADMIN_SCOPED_TABLES) {
      files['001_initial_schema.sql'] =
        (files['001_initial_schema.sql'] ?? '') +
        `create policy "Auth write ${table}" on ${table} for all using (${ADMIN_EMAIL_USING_CLAUSE});\n`;
    }
    const dir = makeMigrationsDir(files);

    expect(findAdminWriteScopingViolations(dir)).toEqual([]);
  });
});
