import { type IconType } from 'react-icons';
import {
  SiPython,
  SiTypescript,
  SiJavascript,
  SiMysql,
  SiReact,
  SiNextdotjs,
  SiTailwindcss,
  SiNodedotjs,
  SiFastapi,
  SiPostgresql,
  SiRedis,
  SiPytorch,
  SiScikitlearn,
  SiPandas,
  SiDocker,
  SiLinux,
  SiGit,
} from 'react-icons/si';

export type Skill = {
  name: string;
  icon: IconType;
};

export type SkillCategory = {
  name: string;
  skills: Skill[];
};

export type LanguageCompetency = {
  countryCode: string;
  language: string;
  level: string;
};

export const skillCategories: SkillCategory[] = [
  {
    name: 'Languages',
    skills: [
      { name: 'Python', icon: SiPython },
      { name: 'TypeScript', icon: SiTypescript },
      { name: 'JavaScript', icon: SiJavascript },
      { name: 'SQL', icon: SiMysql },
    ],
  },
  {
    name: 'Frontend',
    skills: [
      { name: 'React', icon: SiReact },
      { name: 'Next.js', icon: SiNextdotjs },
      { name: 'Tailwind CSS', icon: SiTailwindcss },
    ],
  },
  {
    name: 'Backend',
    skills: [
      { name: 'Node.js', icon: SiNodedotjs },
      { name: 'FastAPI', icon: SiFastapi },
      { name: 'PostgreSQL', icon: SiPostgresql },
      { name: 'Redis', icon: SiRedis },
    ],
  },
  {
    name: 'ML / AI',
    skills: [
      { name: 'PyTorch', icon: SiPytorch },
      { name: 'scikit-learn', icon: SiScikitlearn },
      { name: 'Pandas', icon: SiPandas },
    ],
  },
  {
    name: 'Infra / DevOps',
    skills: [
      { name: 'Docker', icon: SiDocker },
      { name: 'Linux', icon: SiLinux },
      { name: 'Git', icon: SiGit },
    ],
  },
];

export const languageCompetencies: LanguageCompetency[] = [
  { countryCode: 'ca', language: 'English', level: 'CELPIP 9' },
  { countryCode: 'fr', language: 'French', level: 'B1' },
];
