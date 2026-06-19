import { fetchIntro, fetchIntroCoverPool } from '@/lib/actions/intro';
import { IntroEditorForm } from './IntroEditorForm';

export default async function IntroPage() {
  const [intro, covers] = await Promise.all([fetchIntro(), fetchIntroCoverPool()]);

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
      >
        Intro
      </h1>
      <IntroEditorForm initialIntro={intro} initialCovers={covers} />
    </div>
  );
}
