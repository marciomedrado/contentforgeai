
export type Platform = "Wordpress" | "Instagram" | "Facebook";
export type ContentStatus = "Draft" | "Scheduled" | "Published";

export interface ManualReferenceItem {
  id: string;
  title?: string;
  content: string;
  createdAt: string; // ISO date string
}

export interface ThemeSuggestion {
  id: string;
  userInputTopic: string;
  title: string;
  description: string;
  keywords?: string[]; // Keywords generated during initial theme suggestion
  suggestedKeywords?: string[]; // AI-generated keywords/long-tail search terms for "general" platform
  generatedAt: string;
  manualReferences?: ManualReferenceItem[];
}

export interface ContentItem {
  id: string;
  title: string;
  topic: string;
  platform: Platform;
  content: string;
  imagePrompts: string[]; // Parsed prompts from AI, especially if multiple for WordPress
  wordCount?: number;
  numberOfImagesRequested?: number; // Replaces imagePromptFrequency
  hashtags?: string[];
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  manualReferencesUsed?: Array<{ title?: string; content: string }>;
}

export interface AppSettings {
  openAIKey: string;
  openAIAgentId?: string;
  outputLanguage?: string;
  perplexityApiKey?: string;
}

export interface SummarizationItem {
  id: string;
  inputText: string;
  summaryOutput: string;
  language: string;
  createdAt: string; // ISO date string
}
