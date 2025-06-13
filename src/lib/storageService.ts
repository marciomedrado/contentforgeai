
import type { ContentItem, AppSettings, ThemeSuggestion, ManualReferenceItem, SummarizationItem, SavedRefinementPrompt, Funcionario, Departamento, FuncionarioStatus, Empresa } from './types';
import {
  DEFAULT_OUTPUT_LANGUAGE,
  CONTENT_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  THEMES_STORAGE_KEY,
  SUMMARIES_STORAGE_KEY,
  REFINEMENT_PROMPTS_STORAGE_KEY,
  FUNCIONARIOS_STORAGE_KEY,
  ACTIVE_FUNCIONARIOS_STORAGE_KEY,
  DEPARTAMENTOS,
  EMPRESAS_STORAGE_KEY,
  ACTIVE_EMPRESA_ID_STORAGE_KEY,
  ALL_EMPRESAS_OR_VISAO_GERAL_VALUE
} from './constants';

// Helper to safely interact with localStorage
const safeLocalStorageGet = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage`, error);
    return defaultValue;
  }
};

const safeLocalStorageSet = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const oldValue = window.localStorage.getItem(key);
    window.localStorage.setItem(key, JSON.stringify(value));
    // Dispatch a storage event so other hooks/components can react
    window.dispatchEvent(new StorageEvent('storage', {
      key: key,
      oldValue: oldValue,
      newValue: JSON.stringify(value),
      storageArea: window.localStorage,
      url: window.location.href, // Added for more complete event
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
  saveStoredContentItems([]);
};


// App Settings
export const getStoredSettings = (): AppSettings => {
  const defaultSettings: AppSettings = {
    openAIKey: '',
    openAIAgentId: '',
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
    const themeToSave: ThemeSuggestion = {
      ...theme,
      suggestedKeywords: theme.suggestedKeywords || [],
      manualReferences: theme.manualReferences || [],
      createdByFuncionarioId: theme.createdByFuncionarioId,
    };
    saveStoredThemeSuggestions([themeToSave, ...themes]);
  }
};

export const deleteThemeSuggestionById = (id: string): void => {
  const themes = getStoredThemeSuggestions();
  saveStoredThemeSuggestions(themes.filter(theme => theme.id !== id));
};

export const clearAllThemeSuggestions = (): void => {
  saveStoredThemeSuggestions([]);
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
  const itemToSave: SummarizationItem = {
    ...item,
    createdByFuncionarioId: item.createdByFuncionarioId,
  };
  saveStoredSummaries([itemToSave, ...items]);
};

export const updateSummarizationItem = (updatedItem: SummarizationItem): void => {
  let items = getStoredSummaries();
  const itemToSave: SummarizationItem = {
    ...updatedItem,
    createdByFuncionarioId: updatedItem.createdByFuncionarioId,
  };
  items = items.map(item => item.id === itemToSave.id ? itemToSave : item);
  saveStoredSummaries(items);
};

export const deleteSummarizationItemById = (id: string): void => {
  let items = getStoredSummaries();
  items = items.filter(item => item.id !== id);
  saveStoredSummaries(items);
};

export const clearAllSummaries = (): void => {
  saveStoredSummaries([]);
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
    prompts[existingIndex] = { ...prompt, id: prompts[existingIndex].id };
  } else {
    prompts.unshift(prompt);
  }
  saveStoredRefinementPrompts(prompts);
};

export const deleteSavedRefinementPromptById = (id: string): void => {
  const prompts = getSavedRefinementPrompts();
  saveStoredRefinementPrompts(prompts.filter(p => p.id !== id));
};


// Funcionarios
export const getFuncionariosUnfiltered = (): Funcionario[] => {
  return safeLocalStorageGet<Funcionario[]>(FUNCIONARIOS_STORAGE_KEY, []).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const getFuncionarios = (activeEmpresaId?: string | null): Funcionario[] => {
  let funcionarios = getFuncionariosUnfiltered();
  if (activeEmpresaId && activeEmpresaId !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
    // Filter for funcionarios belonging to the active empresa OR those who are "Available" (no empresaId)
    funcionarios = funcionarios.filter(f => f.empresaId === activeEmpresaId || !f.empresaId);
  }
  // If no activeEmpresaId or it's "Visão Geral", all funcionarios are returned by getFuncionariosUnfiltered initially
  return funcionarios;
};

export const saveFuncionario = (funcionario: Funcionario): void => {
  let funcionarios = getFuncionariosUnfiltered();
  const existingIndex = funcionarios.findIndex(f => f.id === funcionario.id);
  const funcionarioToSave: Funcionario = {
     ...funcionario,
     status: funcionario.status || 'Active',
     empresaId: funcionario.empresaId === '_SEM_EMPRESA_' || funcionario.empresaId === '' ? undefined : funcionario.empresaId,
   };

  if (existingIndex > -1) {
    funcionarios[existingIndex] = funcionarioToSave;
  } else {
    funcionarios.unshift(funcionarioToSave);
  }
  safeLocalStorageSet<Funcionario[]>(FUNCIONARIOS_STORAGE_KEY, funcionarios.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
};

export const getFuncionarioById = (id: string): Funcionario | undefined => {
  const funcionarios = getFuncionariosUnfiltered();
  return funcionarios.find(f => f.id === id);
};

export const deleteFuncionarioById = (id: string): void => {
  const funcionarios = getFuncionariosUnfiltered();
  safeLocalStorageSet<Funcionario[]>(FUNCIONARIOS_STORAGE_KEY, funcionarios.filter(f => f.id !== id));

  const activeFuncionarios = getActiveFuncionariosMap();
  let changed = false;
  DEPARTAMENTOS.forEach(depInfo => {
    const dep = depInfo.value as Departamento;
    if (activeFuncionarios[dep] === id) {
      activeFuncionarios[dep] = null;
      changed = true;
    }
  });
  if (changed) {
    saveActiveFuncionariosMap(activeFuncionarios);
  }
};

export const clearAllFuncionarios = (): void => {
  safeLocalStorageSet<Funcionario[]>(FUNCIONARIOS_STORAGE_KEY, []);
  safeLocalStorageSet<Record<string, string | null>>(ACTIVE_FUNCIONARIOS_STORAGE_KEY, {});
};

export const setFuncionarioStatus = (funcionarioId: string, status: FuncionarioStatus): void => {
  let funcionarios = getFuncionariosUnfiltered();
  const funcionarioIndex = funcionarios.findIndex(f => f.id === funcionarioId);
  if (funcionarioIndex > -1) {
    funcionarios[funcionarioIndex].status = status;
    safeLocalStorageSet<Funcionario[]>(FUNCIONARIOS_STORAGE_KEY, funcionarios);

    if (status === 'Vacation') {
      const activeMap = getActiveFuncionariosMap();
      let activeMapChanged = false;
      DEPARTAMENTOS.forEach(depInfo => {
        const departamento = depInfo.value as Departamento;
        if (activeMap[departamento] === funcionarioId) {
          activeMap[departamento] = null;
          activeMapChanged = true;
        }
      });
      if (activeMapChanged) {
        saveActiveFuncionariosMap(activeMap);
      }
    }
  }
};


// Active Funcionarios Management
const getActiveFuncionariosMap = (): Record<string, string | null> => {
  return safeLocalStorageGet<Record<string, string | null>>(ACTIVE_FUNCIONARIOS_STORAGE_KEY, {});
};

const saveActiveFuncionariosMap = (map: Record<string, string | null>): void => {
  safeLocalStorageSet<Record<string, string | null>>(ACTIVE_FUNCIONARIOS_STORAGE_KEY, map);
}

export const setActiveFuncionarioForDepartamento = (departamento: Departamento, funcionarioId: string | null): void => {
  const activeMap = getActiveFuncionariosMap();
  if (funcionarioId === null || funcionarioId === '') {
    activeMap[departamento] = null;
  } else {
    activeMap[departamento] = funcionarioId;
  }
  saveActiveFuncionariosMap(activeMap);
};

export const getActiveFuncionarioIdForDepartamento = (departamento: Departamento): string | null => {
  const activeMap = getActiveFuncionariosMap();
  return activeMap[departamento] || null;
};

export const getActiveFuncionarioForDepartamento = (departamento: Departamento, globalActiveEmpresaId?: string | null): Funcionario | null => {
  const activeFuncIdForDept = getActiveFuncionarioIdForDepartamento(departamento);
  if (!activeFuncIdForDept) return null;

  const funcionario = getFuncionarioById(activeFuncIdForDept);

  // If no funcionario found by ID, or if funcionario is on vacation, return null
  if (!funcionario || funcionario.status === 'Vacation') {
     // If the active Funcionario ID pointed to someone on vacation, clear it for the department
    if (funcionario && funcionario.status === 'Vacation' ) {
        const activeMap = getActiveFuncionariosMap();
        if (activeMap[departamento] === activeFuncIdForDept) {
          activeMap[departamento] = null;
          saveActiveFuncionariosMap(activeMap);
        }
    }
    return null;
  }

  // If a global company context is active (not "Visão Geral")
  if (globalActiveEmpresaId && globalActiveEmpresaId !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
    // Funcionario must belong to the active company OR be "Available" (no empresaId)
    if (funcionario.empresaId && funcionario.empresaId !== globalActiveEmpresaId) {
      return null; // Funcionario belongs to a different company, not valid in this context
    }
    // If funcionario.empresaId is undefined, it's "Available" and valid.
    // If funcionario.empresaId === globalActiveEmpresaId, it's a match and valid.
  }
  // If no global company context (Visão Geral), or if funcionario is "Available" or matches the active company, return it.
  return funcionario;
};

// Empresas
export const getEmpresas = (): Empresa[] => {
  return safeLocalStorageGet<Empresa[]>(EMPRESAS_STORAGE_KEY, []).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const saveEmpresa = (empresa: Empresa): void => {
  let empresas = getEmpresas();
  const existingIndex = empresas.findIndex(e => e.id === empresa.id);
  const empresaToSave: Empresa = {
    ...empresa,
    apiConfigs: empresa.apiConfigs || {}, // Ensure apiConfigs is initialized
  };

  if (existingIndex > -1) {
    empresas[existingIndex] = empresaToSave;
  } else {
    empresas.unshift(empresaToSave);
  }
  safeLocalStorageSet<Empresa[]>(EMPRESAS_STORAGE_KEY, empresas.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
};

export const getEmpresaById = (id: string): Empresa | undefined => {
  const empresas = getEmpresas();
  return empresas.find(e => e.id === id);
};

export const deleteEmpresaById = (id: string): void => {
  const empresas = getEmpresas();
  safeLocalStorageSet<Empresa[]>(EMPRESAS_STORAGE_KEY, empresas.filter(e => e.id !== id));

  let funcionarios = getFuncionariosUnfiltered();
  let funcionariosChanged = false;
  funcionarios = funcionarios.map(f => {
    if (f.empresaId === id) {
      funcionariosChanged = true;
      return { ...f, empresaId: undefined }; // Make them "Available"
    }
    return f;
  });
  if (funcionariosChanged) {
    safeLocalStorageSet<Funcionario[]>(FUNCIONARIOS_STORAGE_KEY, funcionarios);
  }

  // If the deleted empresa was the active one, reset active empresa
  const currentActiveEmpresaId = getActiveEmpresaId();
  if (currentActiveEmpresaId === id) {
    setActiveEmpresaId(null);
  }
};

export const clearAllEmpresas = (): void => {
  saveEmpresaList([]);
  let funcionarios = getFuncionariosUnfiltered();
  let funcionariosChanged = false;
  funcionarios = funcionarios.map(f => {
    if (f.empresaId) {
      funcionariosChanged = true;
      return { ...f, empresaId: undefined };
    }
    return f;
  });
  if (funcionariosChanged) {
    safeLocalStorageSet<Funcionario[]>(FUNCIONARIOS_STORAGE_KEY, funcionarios);
  }
   setActiveEmpresaId(null);
};
const saveEmpresaList = (empresas: Empresa[]): void => {
  safeLocalStorageSet<Empresa[]>(EMPRESAS_STORAGE_KEY, empresas);
};

// Active Empresa Global
export const getActiveEmpresaId = (): string | null => {
  return safeLocalStorageGet<string | null>(ACTIVE_EMPRESA_ID_STORAGE_KEY, null);
};

export const setActiveEmpresaId = (empresaId: string | null): void => {
  safeLocalStorageSet<string | null>(ACTIVE_EMPRESA_ID_STORAGE_KEY, empresaId === ALL_EMPRESAS_OR_VISAO_GERAL_VALUE ? null : empresaId);
};


// General Data Clearing
export const clearAllData = (): void => {
  clearAllContentItems();
  clearAllThemeSuggestions();
  clearAllSummaries();
  saveStoredRefinementPrompts([]);
  clearAllFuncionarios();
  clearAllEmpresas();
  setActiveEmpresaId(null); // Also clear active empresa
};
