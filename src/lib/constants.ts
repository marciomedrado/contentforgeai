import type { Platform } from './types';

export const APP_NAME = "ContentForge AI";

export const PLATFORMS: Platform[] = ["Wordpress", "Instagram", "Facebook"];

export const DEFAULT_IMAGE_PROMPT_FREQUENCY = 200;

export const NAV_LINKS = [
  { href: "/", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/content/new", label: "Create Content", iconName: "PlusCircle" },
  { href: "/themes", label: "Theme Planner", iconName: "Lightbulb" },
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
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português (Portuguese)' },
  { value: 'es', label: 'Español (Spanish)' },
  { value: 'fr', label: 'Français (French)' },
  { value: 'de', label: 'Deutsch (German)' },
  // Add more languages as needed
];

export const DEFAULT_OUTPUT_LANGUAGE = 'en';
