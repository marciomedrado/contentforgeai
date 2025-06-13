
import type { Platform, Departamento } from './types';

export const APP_NAME = "ContentForge AI";

export const PLATFORMS: Platform[] = ["Wordpress", "Instagram", "Facebook"];

export const DEFAULT_NUMBER_OF_IMAGES = 1;

export const NAV_LINKS = [
  { href: "/", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/themes", label: "Theme Planner", iconName: "Lightbulb" },
  { href: "/summarizer", label: "Summarizer", iconName: "FileText" },
  { href: "/content/new", label: "Create Content", iconName: "PlusCircle" },
  { href: "/empresas", label: "Empresas", iconName: "Building2" },
  { href: "/training", label: "Treinamento", iconName: "BrainCircuit" },
  { href: "/settings", label: "Settings", iconName: "SettingsIcon" },
];

export const CONTENT_STATUS_OPTIONS: { value: string, label: string }[] = [
  { value: "Draft", label: "Draft" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Published", label: "Published" },
];

export const PLATFORM_OPTIONS: { value: Platform, label: string }[] = [
  { value: "Wordpress", label: "Wordpress" },
  { value: "Instagram", label: "Instagram" },
  { value: "Facebook", label: "Facebook" },
];

export const LANGUAGE_OPTIONS: { value: string, label: string }[] = [
  { value: 'pt', label: 'Português (Portuguese)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español (Spanish)' },
  { value: 'fr', label: 'Français (French)' },
  { value: 'de', label: 'Deutsch (German)' },
  // Add more languages as needed
];

export const DEFAULT_OUTPUT_LANGUAGE = 'pt';

export const DEPARTAMENTOS: { value: Departamento; label: string }[] = [
  { value: "ContentCreation", label: "Criação de Conteúdo" },
  { value: "Summarizer", label: "Sumarizador" },
  { value: "ThemePlanner", label: "Planejador de Temas (e Sugestões de Palavra-chave/Hashtag)" },
];

// Storage Keys
export const CONTENT_STORAGE_KEY = 'contentForgeAi_contentItems';
export const SETTINGS_STORAGE_KEY = 'contentForgeAi_appSettings';
export const THEMES_STORAGE_KEY = 'contentForgeAi_themeSuggestions';
export const SUMMARIES_STORAGE_KEY = 'contentForgeAi_summaries';
export const REFINEMENT_PROMPTS_STORAGE_KEY = 'contentForgeAi_refinementPrompts';
export const FUNCIONARIOS_STORAGE_KEY = 'contentForgeAi_funcionarios';
export const ACTIVE_FUNCIONARIOS_STORAGE_KEY = 'contentForgeAi_activeFuncionarios';
export const EMPRESAS_STORAGE_KEY = 'contentForgeAi_empresas';
export const ACTIVE_EMPRESA_ID_STORAGE_KEY = 'contentForgeAi_activeEmpresaId';

export const ALL_EMPRESAS_OR_VISAO_GERAL_VALUE = '_ALL_EMPRESAS_';

// Funcionario List Filters (for TrainingClient.tsx local filter)
export const FUNCIONARIO_FILTER_CURRENT_WITH_AVAILABLE = '_CURRENT_EMPRESA_AND_AVAILABLE_';
export const FUNCIONARIO_FILTER_AVAILABLE_ONLY = '_AVAILABLE_ONLY_';
export const FUNCIONARIO_FILTER_ALL_WITH_AVAILABLE = '_ALL_EMPRESAS_AND_AVAILABLE_';
