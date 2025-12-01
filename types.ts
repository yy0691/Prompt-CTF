
export enum ModelType {
  GeminiFlash = 'gemini-2.5-flash',
  GeminiPro = 'gemini-3-pro-preview',
}

export type Language = 'en' | 'zh';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  provider: 'google' | 'github' | 'email' | 'linuxdo';
  // Stats
  totalFlags: number;
  lastFlagAt?: number; // timestamp
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
}

export interface Level {
  id: string;
  chapterId: string;
  title: string;
  category: 'Basic' | 'Core' | 'Advanced' | 'Engineering' | 'Research' | 'Hardcore';
  difficulty: 1 | 2 | 3 | 4 | 5;
  description: string;
  missionBrief: string;
  badExample: {
    prompt: string;
    output: string;
  };
  startingPrompt: string; // Used as a "Hint" or Admin reference now, not pre-filled
  winCriteria: string; 
}

export interface RunResult {
  output: string;
  success: boolean;
  feedback: string;
  flag?: string;
}

export interface UserProgress {
  completedLevels: string[];
  currentLevelId: string;
}

export interface Submission {
  id: string;
  userId: string;
  levelId: string;
  prompt: string;
  output: string;
  success: boolean;
  feedback: string;
  timestamp: number;
  durationMs: number;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar?: string;
  flagCount: number;
  lastActive: number;
  rank: number;
}