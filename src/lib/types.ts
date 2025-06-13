
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
  createdByFuncionarioId?: string;
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
  createdByFuncionarioId?: string;
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
  createdByFuncionarioId?: string;
}

export interface SavedRefinementPrompt {
  id: string;
  name: string;
  promptText: string;
  createdAt: string; // ISO date string
}

export type FuncionarioStatus = 'Active' | 'Vacation';

export interface ApiConfigField {
  value?: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'password' | 'url';
}

export interface PlatformApiConfig {
  [key: string]: ApiConfigField | undefined; // e.g., apiUrl, username, password/token
}

export interface Empresa {
  id: string;
  nome: string;
  logoUrl?: string;
  createdAt: string; // ISO date string
  apiConfigs?: {
    wordpress?: PlatformApiConfig;
    instagram?: PlatformApiConfig;
    facebook?: PlatformApiConfig;
  };
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
