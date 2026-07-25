import { fetchIntro, fetchIntroCoverPool } from '@/lib/actions/intro';
import { IntroEditorForm } from './IntroEditorForm';
import type { Intro, IntroCover } from '@/lib/supabase/types';

export default async function IntroPage() {
  let intro: Intro | null = null;
  let covers: IntroCover[] = [];
  let fetchError: string | null = null;
  try {
    [intro, covers] = await Promise.all([fetchIntro(), fetchIntroCoverPool()]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load intro.';
  }

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
      >
        Intro
      </h1>
      <IntroEditorForm initialIntro={intro} initialCovers={covers} fetchError={fetchError} />
    </div>
  );
}
