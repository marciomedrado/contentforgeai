
"use client";

import { useState, useEffect, useRef } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { PlusCircle, Building, DatabaseBackup, Download, Upload, Loader2, AlertTriangleIcon } from 'lucide-react';
import Link from 'next/link';
import { useActiveEmpresa } from '@/hooks/useActiveEmpresa';
import {
  getEmpresas,
  getEmpresaById,
  getStoredContentItems,
  getStoredThemeSuggestions,
  getStoredSummaries,
  getFuncionariosUnfiltered,
  getSavedRefinementPrompts,
  getStoredSettings,
  getActiveFuncionariosMap,
  getActiveEmpresaId,
  saveStoredContentItems,
  saveStoredThemeSuggestions,
  saveStoredSummaries,
  saveFuncionariosList,
  saveEmpresasList,
  saveStoredRefinementPrompts,
  saveStoredSettings,
  saveActiveFuncionariosMap,
  setActiveEmpresaId as setStoredActiveEmpresaId, // Renamed to avoid conflict with local setActiveEmpresaId
} from '@/lib/storageService';
import type { Empresa, AppSettings, Departamento } from '@/lib/types';
import {
  EMPRESAS_STORAGE_KEY,
  ALL_EMPRESAS_OR_VISAO_GERAL_VALUE,
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
  DEPARTAMENTOS
} from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AppHeaderProps {
  title: string;
  showCreateButton?: boolean;
}

export function AppHeader({ title, showCreateButton = false }: AppHeaderProps) {
  const [activeEmpresaId, setActiveEmpresaIdGlobally] = useActiveEmpresa();
  const [allEmpresasState, setAllEmpresasState] = useState<Empresa[]>([]); // Renamed to avoid conflict
  // const [currentSelectedEmpresaName, setCurrentSelectedEmpresaName] = useState<string>("Visão Geral");

  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchEmpresas = () => {
      setAllEmpresasState(getEmpresas());
    };
    fetchEmpresas();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === EMPRESAS_STORAGE_KEY) {
        fetchEmpresas();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // useEffect(() => {
  //   if (activeEmpresaId && activeEmpresaId !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
  //     const empresa = getEmpresaById(activeEmpresaId);
  //     setCurrentSelectedEmpresaName(empresa ? empresa.nome : "Visão Geral");
  //   } else {
  //     setCurrentSelectedEmpresaName("Visão Geral");
  //   }
  // }, [activeEmpresaId]);

  const handleEmpresaChange = (value: string) => {
    if (value === ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
      setActiveEmpresaIdGlobally(null);
    } else {
      setActiveEmpresaIdGlobally(value);
    }
  };

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
      getEmpresas().forEach(item => { // Use getEmpresas() which is already available
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
        lines.shift(); 

        const importedData: Record<string, any[]> = {
          [CSV_DATA_TYPE_CONTENT_ITEM]: [],
          [CSV_DATA_TYPE_THEME_SUGGESTION]: [],
          [CSV_DATA_TYPE_SUMMARIZATION_ITEM]: [],
          [CSV_DATA_TYPE_FUNCIONARIO]: [],
          [CSV_DATA_TYPE_EMPRESA]: [],
          [CSV_DATA_TYPE_SAVED_REFINEMENT_PROMPT]: [],
          activeFuncConfigs: [],
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

        saveStoredContentItems(importedData[CSV_DATA_TYPE_CONTENT_ITEM] || []);
        saveStoredThemeSuggestions(importedData[CSV_DATA_TYPE_THEME_SUGGESTION] || []);
        saveStoredSummaries(importedData[CSV_DATA_TYPE_SUMMARIZATION_ITEM] || []);
        saveFuncionariosList(importedData[CSV_DATA_TYPE_FUNCIONARIO] || []);
        saveEmpresasList(importedData[CSV_DATA_TYPE_EMPRESA] || []);
        saveStoredRefinementPrompts(importedData[CSV_DATA_TYPE_SAVED_REFINEMENT_PROMPT] || []);
        
        if (importedAppSettings) saveStoredSettings(importedAppSettings);
        
        const newActiveFuncMap: Record<string, string | null> = {};
        DEPARTAMENTOS.forEach(dep => newActiveFuncMap[dep.value as Departamento] = null);
        importedData.activeFuncConfigs.forEach((config: { departamento: string, funcionarioId: string | null }) => {
          if (DEPARTAMENTOS.some(d => d.value === config.departamento)) {
            newActiveFuncMap[config.departamento] = config.funcionarioId;
          }
        });
        saveActiveFuncionariosMap(newActiveFuncMap);
        
        setStoredActiveEmpresaId(importedActiveEmpresaId);

        toast({ title: "Importação Concluída", description: "Backup dos dados restaurado com sucesso. A página será recarregada." });
        setTimeout(() => window.location.reload(), 1500);

      } catch (error) {
        console.error("Erro ao importar dados:", error);
        toast({ title: "Erro de Importação", description: `Falha ao importar dados: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };


  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      <h1 className="text-xl font-semibold whitespace-nowrap">{title}</h1>
      
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-muted-foreground hidden sm:block" />
          <Select
            value={activeEmpresaId || ALL_EMPRESAS_OR_VISAO_GERAL_VALUE}
            onValueChange={handleEmpresaChange}
          >
            <SelectTrigger className="w-[150px] sm:w-[200px] md:w-[250px] h-9 text-sm">
              <SelectValue placeholder="Selecionar Empresa..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_EMPRESAS_OR_VISAO_GERAL_VALUE}>Visão Geral / Todas</SelectItem>
              {allEmpresasState.map(empresa => (
                <SelectItem key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showCreateButton && (
          <Button asChild size="sm" className="hidden sm:flex">
            <Link href="/content/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Content
            </Link>
          </Button>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Gerenciamento de Backup" className="h-9 w-9">
              <DatabaseBackup className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 mr-2 sm:mr-4" side="bottom" align="end">
            <div className="grid gap-4">
              <div className="space-y-1">
                <h4 className="font-medium leading-none">Gerenciamento de Backup</h4>
                <p className="text-xs text-muted-foreground">
                  Faça backup ou restaure os dados da sua aplicação.
                </p>
              </div>
              <div className="grid gap-2">
                <Button 
                  onClick={handleExportData} 
                  disabled={isExporting || isImporting}
                  variant="outline"
                  size="sm"
                >
                  {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
                  Download Backup (CSV)
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isExporting || isImporting}>
                      {isImporting ? <Loader2 className="animate-spin" /> : <Upload />}
                      Upload Backup (CSV)
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <DialogTitle className="flex items-center">
                        <AlertTriangleIcon className="mr-2 h-5 w-5 text-destructive" />Confirmar Importação
                      </DialogTitle>
                      <DialogDesc>
                        Tem certeza de que deseja importar dados deste arquivo CSV?
                        <strong> Esta ação substituirá TODOS os dados existentes na aplicação.</strong>
                        Não é possível desfazer. Recomenda-se fazer um backup antes de importar.
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
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
