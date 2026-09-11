import { createTranslator, type Locale } from './i18n';
import type { MessageKey } from './messages';

// Compatibility aliases are restricted to built-in demo data.
const demoKeys: Record<string, MessageKey> = {
  周一: 'ui.mon',
  Mon: 'ui.mon',
  '理科楼 A-302': 'ui.scienceA302',
  'Science A-302': 'ui.scienceA302',
  '2026 — 2027 · 秋季学期': 'demo.semester',
  '2026 — 2027 · Fall semester': 'demo.semester',
  '2026 — 2027 · 秋季學期': 'demo.semester',
  '2026 — 2027 Fall semester': 'demo.semester',
  '2026 — 2027 秋季学期': 'demo.semester',
  '2026 — 2027 秋季學期': 'demo.semester',
  '2026 - 2027 Fall semester': 'demo.semester',
  '2026 - 2027 秋季学期': 'demo.semester',
  '2026 - 2027 秋季學期': 'demo.semester',
  '高等数学 A': 'ui.calculusA',
  'Calculus A': 'ui.calculusA',
  大学英语: 'ui.collegeEnglish',
  'College English': 'ui.collegeEnglish',
  设计思维与创新: 'ui.designThinking',
  'Design Thinking': 'ui.designThinking',
  'Python 程序设计': 'ui.pythonProgramming',
  'Python Programming': 'ui.pythonProgramming',
  大学物理: 'ui.collegePhysics',
  'College Physics': 'ui.collegePhysics',
  '体育 · 羽毛球': 'ui.peBadminton',
  'PE · Badminton': 'ui.peBadminton',
  陈明: 'ui.chenMing',
  'Chen Ming': 'ui.chenMing',
  林悦: 'ui.linYue',
  'Lin Yue': 'ui.linYue',
  周嘉: 'ui.zhouJia',
  'Zhou Jia': 'ui.zhouJia',
  王宇: 'ui.wangYu',
  'Wang Yu': 'ui.wangYu',
  李教授: 'ui.profLi',
  'Prof. Li': 'ui.profLi',
  张帆: 'ui.zhangFan',
  'Zhang Fan': 'ui.zhangFan',
  '文科楼 B-201': 'ui.humanitiesB201',
  'Humanities B-201': 'ui.humanitiesB201',
  '创意工坊 203': 'ui.creativeStudio203',
  'Creative Studio 203': 'ui.creativeStudio203',
  '信息楼 405': 'ui.computing405',
  'Computing 405': 'ui.computing405',
  '理科楼 A-105': 'ui.scienceA105',
  'Science A-105': 'ui.scienceA105',
  '体育馆 2 号馆': 'ui.sportsHall2',
  'Sports Hall 2': 'ui.sportsHall2',
};
export function localizeDemoText(value: string, locale: Locale): string {
  const key = Object.hasOwn(demoKeys, value) ? demoKeys[value] : undefined;
  return key ? createTranslator(locale)(key) : value;
}
export function isDefaultSemester(value: string): boolean {
  return demoKeys[value] === 'demo.semester';
}
