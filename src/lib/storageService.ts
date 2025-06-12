
import type { ContentItem, AppSettings, ThemeSuggestion, ManualReferenceItem, SummarizationItem, SavedRefinementPrompt, Funcionario, Departamento } from './types';
import {
  DEFAULT_OUTPUT_LANGUAGE,
  CONTENT_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  THEMES_STORAGE_KEY,
  SUMMARIES_STORAGE_KEY,
  REFINEMENT_PROMPTS_STORAGE_KEY,
  FUNCIONARIOS_STORAGE_KEY // New key
} from './constants';

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
    const themeToSave = { ...theme, suggestedKeywords: theme.suggestedKeywords || [], manualReferences: theme.manualReferences || [] };
    saveStoredThemeSuggestions([themeToSave, ...themes]);
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
    themes[themeIndex].manualReferences!.unshift(reference);
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

export const updateThemeWithSuggestedKeywords = (themeId: string, keywords: string[]): void => {
  const themes = getStoredThemeSuggestions();
  const themeIndex = themes.findIndex(t => t.id === themeId);
  if (themeIndex > -1) {
    themes[themeIndex].suggestedKeywords = keywords;
    saveStoredThemeSuggestions(themes);
  }
};

export const deleteKeywordFromTheme = (themeId: string, keywordToDelete: string): void => {
  const themes = getStoredThemeSuggestions();
  const themeIndex = themes.findIndex(t => t.id === themeId);
  if (themeIndex > -1 && themes[themeIndex].suggestedKeywords) {
    themes[themeIndex].suggestedKeywords = themes[themeIndex].suggestedKeywords?.filter(kw => kw !== keywordToDelete);
    saveStoredThemeSuggestions(themes);
  }
};


// Summarization Items
export const getStoredSummaries = (): SummarizationItem[] => {
  return safeLocalStorageGet<SummarizationItem[]>(SUMMARIES_STORAGE_KEY, []).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const saveStoredSummaries = (items: SummarizationItem[]): void => {
  safeLocalStorageSet<SummarizationItem[]>(SUMMARIES_STORAGE_KEY, items.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
};

export const addSummarizationItem = (item: SummarizationItem): void => {
  const items = getStoredSummaries();
  saveStoredSummaries([item, ...items]);
};

export const updateSummarizationItem = (updatedItem: SummarizationItem): void => {
  let items = getStoredSummaries();
  items = items.map(item => item.id === updatedItem.id ? updatedItem : item);
  saveStoredSummaries(items);
};

export const deleteSummarizationItemById = (id: string): void => {
  let items = getStoredSummaries();
  items = items.filter(item => item.id !== id);
  saveStoredSummaries(items);
};

export const clearAllSummaries = (): void => {
  safeLocalStorageSet<SummarizationItem[]>(SUMMARIES_STORAGE_KEY, []);
};

// Saved Refinement Prompts
export const getSavedRefinementPrompts = (): SavedRefinementPrompt[] => {
  return safeLocalStorageGet<SavedRefinementPrompt[]>(REFINEMENT_PROMPTS_STORAGE_KEY, []).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const saveStoredRefinementPrompts = (prompts: SavedRefinementPrompt[]): void => {
  safeLocalStorageSet<SavedRefinementPrompt[]>(REFINEMENT_PROMPTS_STORAGE_KEY, prompts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
};

export const addSavedRefinementPrompt = (prompt: SavedRefinementPrompt): void => {
  const prompts = getSavedRefinementPrompts();
  const existingIndex = prompts.findIndex(p => p.name.toLowerCase() === prompt.name.toLowerCase());
  if (existingIndex > -1) {
    // Update existing prompt if name matches
    prompts[existingIndex] = { ...prompt, id: prompts[existingIndex].id }; // Keep original id
  } else {
    prompts.unshift(prompt);
  }
  saveStoredRefinementPrompts(prompts);
};

export const deleteSavedRefinementPromptById = (id: string): void => {
  const prompts = getSavedRefinementPrompts();
  saveStoredRefinementPrompts(prompts.filter(p => p.id !== id));
};


// Funcionarios (New)
export const getFuncionarios = (): Funcionario[] => {
  return safeLocalStorageGet<Funcionario[]>(FUNCIONARIOS_STORAGE_KEY, []).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const saveFuncionario = (funcionario: Funcionario): void => {
  let funcionarios = getFuncionarios();
  const existingIndex = funcionarios.findIndex(f => f.departamento === funcionario.departamento);

  if (existingIndex > -1) {
    // Update existing funcionario for the department
    funcionarios[existingIndex] = { ...funcionario, id: funcionarios[existingIndex].id, createdAt: funcionarios[existingIndex].createdAt };
  } else {
    // Add new funcionario
    funcionarios.unshift(funcionario);
  }
  safeLocalStorageSet<Funcionario[]>(FUNCIONARIOS_STORAGE_KEY, funcionarios.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
};

export const getFuncionarioByDepartamento = (departamento: Departamento): Funcionario | undefined => {
  const funcionarios = getFuncionarios();
  return funcionarios.find(f => f.departamento === departamento);
};

export const deleteFuncionarioById = (id: string): void => {
  const funcionarios = getFuncionarios();
  safeLocalStorageSet<Funcionario[]>(FUNCIONARIOS_STORAGE_KEY, funcionarios.filter(f => f.id !== id));
};

export const clearAllFuncionarios = (): void => {
  safeLocalStorageSet<Funcionario[]>(FUNCIONARIOS_STORAGE_KEY, []);
}

// General Data Clearing
export const clearAllData = (): void => {
  clearAllContentItems();
  clearAllThemeSuggestions();
  clearAllSummaries();
  saveStoredRefinementPrompts([]);
  clearAllFuncionarios(); // Add this line
};
