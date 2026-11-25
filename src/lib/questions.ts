import firstQuestion from '../data/questions.json';
import questions02to08 from '../data/questions/q02-08.json';
import questions09to15 from '../data/questions/q09-15.json';
import questions16to22 from '../data/questions/q16-22.json';
import type { Question } from '../types';

/** The full 22-task question bank, ordered by exam task number. */
export const questions = [
  ...firstQuestion,
  ...questions02to08,
  ...questions09to15,
  ...questions16to22,
].sort((a, b) => a.number - b.number) as unknown as Question[];

export function getQuestion(id: string): Question | undefined {
  return questions.find((question) => question.id === id);
}
