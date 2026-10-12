import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProjectHero } from '@/components/projects/ProjectHero';
import { ProjectReadme } from '@/components/projects/ProjectReadme';
import { fetchStoredReadme } from '@/lib/actions/projectReadmes';
import { fetchVisibleProjectBySlug } from '@/lib/actions/projects';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchVisibleProjectBySlug(slug);
  if (!project) return {};
  return { title: project.name, description: project.summary || undefined };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await fetchVisibleProjectBySlug(slug);
  if (!project) notFound();

  // Rendered from the stored copy only; the admin refreshes it from GitHub. A failed
  // read falls back to the description rather than erroring the page.
  const readme = project.repo_url ? await fetchStoredReadme(project.id).catch(() => null) : null;
  const githubUrl = readme?.is_private === false ? readme.html_url : null;
  const description = project.project_description.trim();

  return (
    <main className="pt-16 pb-24">
      <section className="relative w-full lg:w-[70vw] mx-auto px-4 lg:px-0">
        <Link
          href="/#projects"
          className="inline-block mb-6 text-gray-600 dark:text-gray-400 underline underline-offset-2 hover:opacity-70 transition-opacity"
          style={{ fontFamily: 'var(--font-recursive)', fontSize: '12pt' }}
        >
          ← Back to projects
        </Link>

        <ProjectHero project={project} githubUrl={githubUrl} />

        <div className="mt-12">
          {readme?.markdown && readme.owner && readme.repo && readme.branch ? (
            <ProjectReadme
              markdown={readme.markdown}
              context={{
                owner: readme.owner,
                repo: readme.repo,
                branch: readme.branch,
                readmePath: readme.readme_path ?? 'README.md',
                isPrivate: readme.is_private ?? true,
              }}
            />
          ) : (
            description && (
              <div
                data-testid="project-description"
                className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line"
                style={{
                  fontFamily: 'var(--font-recursive)',
                  fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 400, 'slnt' 0, 'CRSV' 0.5",
                  fontSize: '13pt',
                }}
              >
                {description}
              </div>
            )
          )}
        </div>
      </section>
    </main>
  );
}
