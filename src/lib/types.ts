
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
  generatedAt: string;
  manualReferences?: ManualReferenceItem[];
  // researchLinks?: ResearchLinkItem[]; // Removed
}

export interface ContentItem {
  id: string;
  title: string;
  topic: string;
  platform: Platform;
  content: string;
  imagePrompts: string[];
  wordCount?: number;
  imagePromptFrequency?: number;
  hashtags?: string[];
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  manualReferencesUsed?: Array<{ title?: string; content: string }>;
  // referenceLinksUsed?: Array<{ title: string; url: string; summary: string; abntCitation?: string }>; // Removed
}

export interface AppSettings {
  openAIKey: string;
  openAIAgentId?: string;
  outputLanguage?: string;
  perplexityApiKey?: string;
}

export interface GenerateContentForPlatformInput {
  platform: Platform;
  topic: string;
  wordCount?: number;
  apiKey: string;
  agentId?: string;
  outputLanguage?: string;
  manualReferenceTexts?: string[]; // Texts from manually added references
  // referenceItems?: Array<{ title: string; url: string; summary: string }>; // Removed: AI-found research items
}

export interface GenerateContentForPlatformOutput {
  content: string;
  imagePrompt: string;
}
