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
  color?: string;
  darkColor?: string;
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
      { name: 'Python', icon: SiPython, color: '#3776AB' },
      { name: 'TypeScript', icon: SiTypescript, color: '#3178C6' },
      { name: 'JavaScript', icon: SiJavascript, color: '#F7DF1E' },
      { name: 'SQL', icon: SiMysql, color: '#4479A1' },
    ],
  },
  {
    name: 'Frontend',
    skills: [
      { name: 'React', icon: SiReact, color: '#61DAFB' },
      { name: 'Next.js', icon: SiNextdotjs, color: '#000000', darkColor: '#ffffff' },
      { name: 'Tailwind CSS', icon: SiTailwindcss, color: '#06B6D4' },
    ],
  },
  {
    name: 'Backend',
    skills: [
      { name: 'Node.js', icon: SiNodedotjs, color: '#339933' },
      { name: 'FastAPI', icon: SiFastapi, color: '#009688' },
      { name: 'PostgreSQL', icon: SiPostgresql, color: '#4169E1' },
      { name: 'Redis', icon: SiRedis, color: '#FF4438' },
    ],
  },
  {
    name: 'ML / AI',
    skills: [
      { name: 'PyTorch', icon: SiPytorch, color: '#EE4C2C' },
      { name: 'scikit-learn', icon: SiScikitlearn, color: '#F7931E' },
      { name: 'Pandas', icon: SiPandas, color: '#150458' },
    ],
  },
  {
    name: 'Infra / DevOps',
    skills: [
      { name: 'Docker', icon: SiDocker, color: '#2496ED' },
      { name: 'Linux', icon: SiLinux, color: '#FCC624' },
      { name: 'Git', icon: SiGit, color: '#F05032' },
    ],
  },
];

export const languageCompetencies: LanguageCompetency[] = [
  { countryCode: 'ca', language: 'English', level: 'CELPIP 9' },
  { countryCode: 'fr', language: 'French', level: 'B1' },
];
