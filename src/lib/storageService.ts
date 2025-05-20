
import type { ContentItem, AppSettings, ThemeSuggestion } from './types';
import { DEFAULT_OUTPUT_LANGUAGE } from './constants';

const CONTENT_STORAGE_KEY = 'contentForgeAi_contentItems';
const SETTINGS_STORAGE_KEY = 'contentForgeAi_appSettings';
const THEMES_STORAGE_KEY = 'contentForgeAi_themeSuggestions';

// Helper to safely interact with localStorage
const safeLocalStorageGet = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage`, error);
    return defaultValue;
  }
};

const safeLocalStorageSet = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    // Dispatch a storage event so other components using the same key can update
    window.dispatchEvent(new StorageEvent('storage', { key }));
  } catch (error) {
    console.error(`Error setting item ${key} in localStorage`, error);
  }
};

// Content Items
export const getStoredContentItems = (): ContentItem[] => {
  return safeLocalStorageGet<ContentItem[]>(CONTENT_STORAGE_KEY, []);
};

export const saveStoredContentItems = (items: ContentItem[]): void => {
  safeLocalStorageSet<ContentItem[]>(CONTENT_STORAGE_KEY, items);
};

export const addContentItem = (item: ContentItem): void => {
  const items = getStoredContentItems();
  saveStoredContentItems([item, ...items]);
};

export const updateContentItem = (updatedItem: ContentItem): void => {
  const items = getStoredContentItems();
  saveStoredContentItems(items.map(item => item.id === updatedItem.id ? updatedItem : item));
};

export const getContentItemById = (id: string): ContentItem | undefined => {
  const items = getStoredContentItems();
  return items.find(item => item.id === id);
};

export const deleteContentItemById = (id: string): void => {
  const items = getStoredContentItems();
  saveStoredContentItems(items.filter(item => item.id !== id));
};


// App Settings
export const getStoredSettings = (): AppSettings => {
  const defaultSettings: AppSettings = {
    openAIKey: '',
    outputLanguage: DEFAULT_OUTPUT_LANGUAGE, 
  };
  const stored = safeLocalStorageGet<Partial<AppSettings>>(SETTINGS_STORAGE_KEY, {});
  return { ...defaultSettings, ...stored };
};

export const saveStoredSettings = (settings: AppSettings): void => {
  safeLocalStorageSet<AppSettings>(SETTINGS_STORAGE_KEY, settings);
};

// Theme Suggestions
export const getStoredThemeSuggestions = (): ThemeSuggestion[] => {
  return safeLocalStorageGet<ThemeSuggestion[]>(THEMES_STORAGE_KEY, []);
};

export const saveStoredThemeSuggestions = (themes: ThemeSuggestion[]): void => {
  safeLocalStorageSet<ThemeSuggestion[]>(THEMES_STORAGE_KEY, themes);
};

export const addThemeSuggestion = (theme: ThemeSuggestion): void => {
  const themes = getStoredThemeSuggestions();
  // Avoid duplicates by title and description for the same user input topic
  if (!themes.some(t => t.userInputTopic === theme.userInputTopic && t.title === theme.title && t.description === theme.description)) {
    saveStoredThemeSuggestions([theme, ...themes].sort((a,b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()));
  }
};

export const deleteThemeSuggestionById = (id: string): void => {
  const themes = getStoredThemeSuggestions();
  saveStoredThemeSuggestions(themes.filter(theme => theme.id !== id));
};

