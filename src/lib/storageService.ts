
import type { ContentItem, AppSettings, ThemeSuggestion, ManualReferenceItem } from './types';
import { DEFAULT_OUTPUT_LANGUAGE, CONTENT_STORAGE_KEY, SETTINGS_STORAGE_KEY, THEMES_STORAGE_KEY } from './constants';

// Helper to safely interact with localStorage
const safeLocalStorageGet = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage`, error);
    return defaultValue;
  }
};

const safeLocalStorageSet = <T,>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    const oldValue = window.localStorage.getItem(key);
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new StorageEvent('storage', { 
      key: key,
      oldValue: oldValue,
      newValue: JSON.stringify(value),
      storageArea: window.localStorage
    }));
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
  saveStoredContentItems([item, ...items].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
};

export const updateContentItem = (updatedItem: ContentItem): void => {
  const items = getStoredContentItems();
  saveStoredContentItems(items.map(item => item.id === updatedItem.id ? updatedItem : item).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
};

export const getContentItemById = (id: string): ContentItem | undefined => {
  const items = getStoredContentItems();
  return items.find(item => item.id === id);
};

export const deleteContentItemById = (id: string): void => {
  const items = getStoredContentItems();
  saveStoredContentItems(items.filter(item => item.id !== id));
};

export const clearAllContentItems = (): void => {
  safeLocalStorageSet<ContentItem[]>(CONTENT_STORAGE_KEY, []);
};


// App Settings
export const getStoredSettings = (): AppSettings => {
  const defaultSettings: AppSettings = {
    openAIKey: '',
    outputLanguage: DEFAULT_OUTPUT_LANGUAGE, 
    perplexityApiKey: '',
  };
  const stored = safeLocalStorageGet<Partial<AppSettings>>(SETTINGS_STORAGE_KEY, {});
  return { ...defaultSettings, ...stored };
};

export const saveStoredSettings = (settings: AppSettings): void => {
  safeLocalStorageSet<AppSettings>(SETTINGS_STORAGE_KEY, settings);
};

// Theme Suggestions
export const getStoredThemeSuggestions = (): ThemeSuggestion[] => {
  return safeLocalStorageGet<ThemeSuggestion[]>(THEMES_STORAGE_KEY, []).sort((a,b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
};

export const saveStoredThemeSuggestions = (themes: ThemeSuggestion[]): void => {
  safeLocalStorageSet<ThemeSuggestion[]>(THEMES_STORAGE_KEY, themes.sort((a,b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()));
};

export const addThemeSuggestion = (theme: ThemeSuggestion): void => {
  const themes = getStoredThemeSuggestions();
  if (!themes.some(t => t.userInputTopic === theme.userInputTopic && t.title === theme.title && t.description === theme.description)) {
    saveStoredThemeSuggestions([theme, ...themes]);
  }
};

export const deleteThemeSuggestionById = (id: string): void => {
  const themes = getStoredThemeSuggestions();
  saveStoredThemeSuggestions(themes.filter(theme => theme.id !== id));
};

export const clearAllThemeSuggestions = (): void => {
  safeLocalStorageSet<ThemeSuggestion[]>(THEMES_STORAGE_KEY, []);
};

export const addManualReferenceToTheme = (themeId: string, reference: ManualReferenceItem): void => {
  const themes = getStoredThemeSuggestions();
  const themeIndex = themes.findIndex(t => t.id === themeId);
  if (themeIndex > -1) {
    if (!themes[themeIndex].manualReferences) {
      themes[themeIndex].manualReferences = [];
    }
    themes[themeIndex].manualReferences!.unshift(reference); // Add to the beginning
    saveStoredThemeSuggestions(themes);
  }
};

export const deleteManualReferenceFromTheme = (themeId: string, referenceId: string): void => {
  const themes = getStoredThemeSuggestions();
  const themeIndex = themes.findIndex(t => t.id === themeId);
  if (themeIndex > -1 && themes[themeIndex].manualReferences) {
    themes[themeIndex].manualReferences = themes[themeIndex].manualReferences?.filter(ref => ref.id !== referenceId);
    saveStoredThemeSuggestions(themes);
  }
};

export const clearAllData = (): void => {
  clearAllContentItems();
  clearAllThemeSuggestions();
};
