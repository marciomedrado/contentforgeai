
import type { Platform } from './types';

export const APP_NAME = "ContentForge AI";

export const PLATFORMS: Platform[] = ["Wordpress", "Instagram", "Facebook"];

export const DEFAULT_NUMBER_OF_IMAGES = 1; // New constant

export const NAV_LINKS = [
  { href: "/", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/content/new", label: "Create Content", iconName: "PlusCircle" },
  { href: "/themes", label: "Theme Planner", iconName: "Lightbulb" },
  { href: "/summarizer", label: "Summarizer", iconName: "FileText" },
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

export const DEFAULT_OUTPUT_LANGUAGE = 'pt'; // Changed to Portuguese

// Storage Keys
export const CONTENT_STORAGE_KEY = 'contentForgeAi_contentItems';
export const SETTINGS_STORAGE_KEY = 'contentForgeAi_appSettings';
export const THEMES_STORAGE_KEY = 'contentForgeAi_themeSuggestions';
export const SUMMARIES_STORAGE_KEY = 'contentForgeAi_summaries';
