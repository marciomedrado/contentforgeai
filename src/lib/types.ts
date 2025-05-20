export type Platform = "Wordpress" | "Instagram" | "Facebook";
export type ContentStatus = "Draft" | "Scheduled" | "Published";

export interface ContentItem {
  id: string;
  title: string;
  topic: string;
  platform: Platform;
  content: string; // HTML for Wordpress, text for others
  imagePrompts: string[];
  wordCount?: number; // Approximate word count if specified during generation
  imagePromptFrequency?: number; // For Wordpress, default 200
  hashtags?: string[]; // For Instagram/Facebook
  status: ContentStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  scheduledAt?: string; // ISO date string for future publishing
}

export interface AppSettings {
  openAIKey: string;
  openAIAgentId?: string;
  outputLanguage?: string; // e.g., 'en', 'pt', 'es'
}

export interface ThemeSuggestion {
  id: string;
  topic: string; // The original topic that generated this theme
  theme: string; // The suggested theme
  generatedAt: string; // ISO date string
}
