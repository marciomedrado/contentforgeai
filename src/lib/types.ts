
export type Platform = "Wordpress" | "Instagram" | "Facebook";
export type ContentStatus = "Draft" | "Scheduled" | "Published";

export type Departamento = "ContentCreation" | "Summarizer" | "ThemePlanner";

export interface ManualReferenceItem {
  id: string;
  title?: string;
  content: string;
  createdAt: string; // ISO date string
}

export interface ThemeSuggestion {
  id:string;
  userInputTopic: string;
  title: string;
  description: string;
  keywords?: string[];
  suggestedKeywords?: string[];
  generatedAt: string;
  manualReferences?: ManualReferenceItem[];
}

export interface ContentItem {
  id: string;
  title: string;
  topic: string;
  platform: Platform;
  content: string;
  imagePrompts: string[];
  wordCount?: number;
  numberOfImagesRequested?: number;
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

export interface SavedRefinementPrompt {
  id: string;
  name: string;
  promptText: string;
  createdAt: string; // ISO date string
}

export type FuncionarioStatus = 'Active' | 'Vacation';

export interface Empresa {
  id: string;
  nome: string;
  logoUrl?: string;
  createdAt: string; // ISO date string
}

export interface Funcionario {
  id: string;
  nome: string;
  instrucoes: string;
  departamento: Departamento;
  empresaId?: string; // ID da empresa à qual o funcionário está associado
  createdAt: string; // ISO date string
  status?: FuncionarioStatus;
}
