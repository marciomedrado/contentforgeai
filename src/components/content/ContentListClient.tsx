
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ContentItem, Empresa, Funcionario, ThemeSuggestion, SummarizationItem, SavedRefinementPrompt, AppSettings, Departamento } from '@/lib/types';
import {
  getStoredContentItems,
  deleteContentItemById,
  getEmpresas,
  getFuncionariosUnfiltered,
  getEmpresaById,
  getStoredThemeSuggestions,
  getStoredSummaries,
  getSavedRefinementPrompts,
  getStoredSettings,
  getActiveFuncionariosMap,
  getActiveEmpresaId,
  saveStoredContentItems,
  saveStoredThemeSuggestions,
  saveStoredSummaries,
  saveStoredRefinementPrompts,
  saveStoredSettings,
  saveActiveFuncionariosMap,
  setActiveEmpresaId,
  saveFuncionariosList, 
  saveEmpresasList, 
} from '@/lib/storageService';
import { ContentCard } from './ContentCard';
import { ContentFilters, type ContentFiltersState } from './ContentFilters';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import Image from 'next/image';
import { Bot, Building, Loader2, Download, Upload, AlertTriangleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { parseISO, startOfDay, endOfDay, format } from 'date-fns';
import {
  CONTENT_STORAGE_KEY,
  EMPRESAS_STORAGE_KEY,
  FUNCIONARIOS_STORAGE_KEY,
  ACTIVE_EMPRESA_ID_STORAGE_KEY,
  ALL_EMPRESAS_OR_VISAO_GERAL_VALUE,
  THEMES_STORAGE_KEY,
  SUMMARIES_STORAGE_KEY,
  REFINEMENT_PROMPTS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  ACTIVE_FUNCIONARIOS_STORAGE_KEY,
  DEPARTAMENTOS,
  BACKUP_FILENAME_PREFIX,
  CSV_DATA_TYPE_CONTENT_ITEM,
  CSV_DATA_TYPE_THEME_SUGGESTION,
  CSV_DATA_TYPE_SUMMARIZATION_ITEM,
  CSV_DATA_TYPE_FUNCIONARIO,
  CSV_DATA_TYPE_EMPRESA,
  CSV_DATA_TYPE_SAVED_REFINEMENT_PROMPT,
  CSV_DATA_TYPE_APP_SETTINGS,
  CSV_DATA_TYPE_ACTIVE_FUNCIONARIO_CONFIG,
  CSV_DATA_TYPE_ACTIVE_EMPRESA_ID,
} from '@/lib/constants';
import { useActiveEmpresa } from '@/hooks/useActiveEmpresa';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as DialogDesc,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as DialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


export function ContentListClient() {
  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  const [allEmpresas, setAllEmpresas] = useState<Empresa[]>([]);
  const [allFuncionarios, setAllFuncionarios] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [filters, setFilters] = useState<ContentFiltersState>({});
  const { toast } = useToast();
  const [activeEmpresaIdGlobal, _setActiveEmpresaIdGlobal] = useActiveEmpresa();
  const [currentActiveEmpresaDetails, setCurrentActiveEmpresaDetails] = useState<Empresa | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshData = useCallback(() => {
    setAllItems(getStoredContentItems());
    setAllEmpresas(getEmpresas());
    setAllFuncionarios(getFuncionariosUnfiltered());
  }, []);

  useEffect(() => {
    refreshData();
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === CONTENT_STORAGE_KEY ||
        event.key === EMPRESAS_STORAGE_KEY ||
        event.key === FUNCIONARIOS_STORAGE_KEY ||
        event.key === ACTIVE_EMPRESA_ID_STORAGE_KEY ||
        event.key === THEMES_STORAGE_KEY ||
        event.key === SUMMARIES_STORAGE_KEY ||
        event.key === REFINEMENT_PROMPTS_STORAGE_KEY ||
        event.key === SETTINGS_STORAGE_KEY ||
        event.key === ACTIVE_FUNCIONARIOS_STORAGE_KEY
      ) {
        refreshData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshData]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, empresaId: activeEmpresaIdGlobal }));
    if (activeEmpresaIdGlobal && activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
      setCurrentActiveEmpresaDetails(getEmpresaById(activeEmpresaIdGlobal));
    } else {
      setCurrentActiveEmpresaDetails(null);
    }
  }, [activeEmpresaIdGlobal]);

  const handleDelete = useCallback((id: string) => {
    deleteContentItemById(id);
    // refreshData(); // Will be called by storage event
    toast({
      title: "Conteúdo Excluído",
      description: "O item de conteúdo foi excluído com sucesso.",
    });
  }, [toast]);

  const filteredItems = useMemo(() => {
    let itemsToFilter = [...allItems];

    if (filters.empresaId && filters.empresaId !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
      const funcionariosDaEmpresa = allFuncionarios.filter(
        func => func.empresaId === filters.empresaId || !func.empresaId
      ).map(f => f.id);

      itemsToFilter = itemsToFilter.filter(item =>
        (item.createdByFuncionarioId && funcionariosDaEmpresa.includes(item.createdByFuncionarioId)) ||
        (!item.createdByFuncionarioId && !filters.empresaId) 
      );
    }

    return itemsToFilter.filter(item => {
      if (filters.searchTerm &&
          !item.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
          !item.topic.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      if (filters.platform && item.platform !== filters.platform) return false;
      if (filters.status && filters.status !== "all" && item.status !== filters.status) return false;
      const itemDate = parseISO(item.createdAt);
      if (filters.dateFrom && itemDate < startOfDay(filters.dateFrom)) return false;
      if (filters.dateTo && itemDate > endOfDay(filters.dateTo)) return false;
      return true;
    }).sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [allItems, filters, allFuncionarios]);

  const handleExportData = () => {
    setIsExporting(true);
    try {
      let csvContent = "data_type,data_json\n";

      getStoredContentItems().forEach(item => {
        csvContent += `${CSV_DATA_TYPE_CONTENT_ITEM},${JSON.stringify(item)}\n`;
      });
      getStoredThemeSuggestions().forEach(item => {
        csvContent += `${CSV_DATA_TYPE_THEME_SUGGESTION},${JSON.stringify(item)}\n`;
      });
      getStoredSummaries().forEach(item => {
        csvContent += `${CSV_DATA_TYPE_SUMMARIZATION_ITEM},${JSON.stringify(item)}\n`;
      });
      getFuncionariosUnfiltered().forEach(item => {
        csvContent += `${CSV_DATA_TYPE_FUNCIONARIO},${JSON.stringify(item)}\n`;
      });
      getEmpresas().forEach(item => {
        csvContent += `${CSV_DATA_TYPE_EMPRESA},${JSON.stringify(item)}\n`;
      });
      getSavedRefinementPrompts().forEach(item => {
        csvContent += `${CSV_DATA_TYPE_SAVED_REFINEMENT_PROMPT},${JSON.stringify(item)}\n`;
      });
      
      csvContent += `${CSV_DATA_TYPE_APP_SETTINGS},${JSON.stringify(getStoredSettings())}\n`;
      
      const activeFuncMap = getActiveFuncionariosMap();
      Object.entries(activeFuncMap).forEach(([dept, funcId]) => {
        csvContent += `${CSV_DATA_TYPE_ACTIVE_FUNCIONARIO_CONFIG},${JSON.stringify({ departamento: dept, funcionarioId: funcId })}\n`;
      });
      
      csvContent += `${CSV_DATA_TYPE_ACTIVE_EMPRESA_ID},${JSON.stringify(getActiveEmpresaId())}\n`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
        link.setAttribute("href", url);
        link.setAttribute("download", `${BACKUP_FILENAME_PREFIX}${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast({ title: "Exportação Concluída", description: "Backup dos dados baixado como CSV." });
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      toast({ title: "Erro de Exportação", description: `Falha ao exportar dados: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    }
    setIsExporting(false);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvString = e.target?.result as string;
        const lines = csvString.split('\n');
        lines.shift(); // Remove header

        const importedData: Record<string, any[]> = {
          [CSV_DATA_TYPE_CONTENT_ITEM]: [],
          [CSV_DATA_TYPE_THEME_SUGGESTION]: [],
          [CSV_DATA_TYPE_SUMMARIZATION_ITEM]: [],
          [CSV_DATA_TYPE_FUNCIONARIO]: [],
          [CSV_DATA_TYPE_EMPRESA]: [],
          [CSV_DATA_TYPE_SAVED_REFINEMENT_PROMPT]: [],
          activeFuncConfigs: [], // Special handling
        };
        let importedAppSettings: AppSettings | null = null;
        let importedActiveEmpresaId: string | null = null;

        for (const line of lines) {
          if (line.trim() === '') continue;
          const firstCommaIndex = line.indexOf(',');
          if (firstCommaIndex === -1) {
            console.warn("Linha malformada no CSV pulada:", line);
            continue;
          }
          const dataType = line.substring(0, firstCommaIndex).trim();
          const jsonData = line.substring(firstCommaIndex + 1).trim();
          
          if (!jsonData) {
            console.warn(`Dados JSON vazios para o tipo ${dataType} na linha:`, line);
            continue;
          }

          try {
            const obj = JSON.parse(jsonData);
            if (importedData[dataType]) {
              importedData[dataType].push(obj);
            } else if (dataType === CSV_DATA_TYPE_APP_SETTINGS) {
              importedAppSettings = obj;
            } else if (dataType === CSV_DATA_TYPE_ACTIVE_FUNCIONARIO_CONFIG) {
              importedData.activeFuncConfigs.push(obj);
            } else if (dataType === CSV_DATA_TYPE_ACTIVE_EMPRESA_ID) {
              importedActiveEmpresaId = obj;
            } else {
              console.warn("Tipo de dado desconhecido no CSV:", dataType);
            }
          } catch (parseError) {
             console.error(`Erro ao analisar JSON para o tipo ${dataType} na linha: ${line}`, parseError);
             toast({ title: "Erro de Importação", description: `Dado JSON inválido no arquivo para o tipo '${dataType}'. Verifique o console.`, variant: "destructive", duration: 7000 });
             setIsImporting(false);
             if (fileInputRef.current) fileInputRef.current.value = "";
             return;
          }
        }

        // Restore data
        saveStoredContentItems(importedData[CSV_DATA_TYPE_CONTENT_ITEM] || []);
        saveStoredThemeSuggestions(importedData[CSV_DATA_TYPE_THEME_SUGGESTION] || []);
        saveStoredSummaries(importedData[CSV_DATA_TYPE_SUMMARIZATION_ITEM] || []);
        saveFuncionariosList(importedData[CSV_DATA_TYPE_FUNCIONARIO] || []);
        saveEmpresasList(importedData[CSV_DATA_TYPE_EMPRESA] || []);
        saveStoredRefinementPrompts(importedData[CSV_DATA_TYPE_SAVED_REFINEMENT_PROMPT] || []);
        
        if (importedAppSettings) saveStoredSettings(importedAppSettings);
        
        const newActiveFuncMap: Record<string, string | null> = {};
        DEPARTAMENTOS.forEach(dep => newActiveFuncMap[dep.value] = null); // Initialize with nulls
        importedData.activeFuncConfigs.forEach((config: { departamento: string, funcionarioId: string | null }) => {
          if (DEPARTAMENTOS.some(d => d.value === config.departamento)) {
            newActiveFuncMap[config.departamento] = config.funcionarioId;
          }
        });
        saveActiveFuncionariosMap(newActiveFuncMap);
        
        setActiveEmpresaId(importedActiveEmpresaId);

        toast({ title: "Importação Concluída", description: "Backup dos dados restaurado com sucesso. A página será recarregada." });
        // refreshData(); // Data will refresh via storage events
        // A full page reload might be good here to ensure all states dependent on localStorage reset correctly.
        setTimeout(() => window.location.reload(), 1500);

      } catch (error) {
        console.error("Erro ao importar dados:", error);
        toast({ title: "Erro de Importação", description: `Falha ao importar dados: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      }
    };
    reader.readAsText(file);
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Backup</CardTitle>
          <CardDescription>Faça backup de todos os dados da aplicação ou restaure a partir de um arquivo CSV.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleExportData} disabled={isExporting || isImporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download Backup (CSV)
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
               <Button variant="outline" disabled={isExporting || isImporting}>
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Backup (CSV)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <DialogTitle className="flex items-center"><AlertTriangleIcon className="mr-2 h-5 w-5 text-destructive" />Confirmar Importação</DialogTitle>
                <DialogDesc>
                  Tem certeza de que deseja importar dados deste arquivo CSV?
                  <strong> Esta ação substituirá TODOS os dados existentes na aplicação (conteúdo, temas, sumários, funcionários, empresas, configurações, etc.).</strong>
                  Não é possível desfazer. Recomenda-se fazer um backup antes de importar, caso algo dê errado.
                </DialogDesc>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { if (fileInputRef.current) fileInputRef.current.value = ""; }}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Sim, Continuar e Escolher Arquivo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleImportData}
            className="hidden"
            disabled={isImporting}
          />
        </CardContent>
      </Card>

      {currentActiveEmpresaDetails && (
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
          <CardHeader className="flex flex-row items-center gap-4">
            {currentActiveEmpresaDetails.logoUrl ? (
              <Image
                src={currentActiveEmpresaDetails.logoUrl}
                alt={`Logo ${currentActiveEmpresaDetails.nome}`}
                width={60}
                height={60}
                className="rounded-lg border object-cover"
                data-ai-hint="logo company"
                onError={(e) => (e.currentTarget.src = 'https://placehold.co/60x60.png')}
              />
            ) : (
              <div className="p-3 bg-muted rounded-lg">
                <Building className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <div>
              <CardTitle className="text-2xl text-primary-foreground">{currentActiveEmpresaDetails.nome}</CardTitle>
              <p className="text-sm text-primary-foreground/80">Visualizando conteúdo relacionado a esta empresa.</p>
            </div>
          </CardHeader>
        </Card>
      )}

      <ContentFilters filters={filters} onFiltersChange={setFilters} />

      {filteredItems.length === 0 ? (
         <Alert className="mt-8 border-accent">
          <Bot className="h-5 w-5 text-accent-foreground" />
          <AlertTitle className="text-accent-foreground">Nenhum Conteúdo Encontrado</AlertTitle>
          <AlertDescription>
            {filters.empresaId && filters.empresaId !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE
              ? `Nenhum conteúdo encontrado para a empresa "${currentActiveEmpresaDetails?.nome || 'selecionada'}" com os filtros atuais.`
              : "Nenhum item de conteúdo corresponde aos filtros atuais, ou você ainda não criou nenhum conteúdo."}
            <br /> Tente ajustar seus filtros ou criar novo conteúdo.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <ContentCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
