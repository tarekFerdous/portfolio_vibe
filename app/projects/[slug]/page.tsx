import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProjectHero } from '@/components/projects/ProjectHero';
import { ProjectReadme } from '@/components/projects/ProjectReadme';
import { fetchVisibleProjectBySlug } from '@/lib/actions/projects';
import { getProjectReadme } from '@/lib/github/readme';

// README content is fetched live from GitHub; refresh roughly hourly.
export const revalidate = 3600;

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

  const readme = project.repo_url ? await getProjectReadme(project.repo_url) : null;
  const githubUrl = readme && !readme.isPrivate ? readme.htmlUrl : null;
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
          {readme?.markdown ? (
            <ProjectReadme
              markdown={readme.markdown}
              context={{
                owner: readme.owner,
                repo: readme.repo,
                branch: readme.branch,
                readmePath: readme.readmePath,
                isPrivate: readme.isPrivate,
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
