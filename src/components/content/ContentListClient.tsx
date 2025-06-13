
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ContentItem, Empresa, Funcionario } from '@/lib/types';
import { getStoredContentItems, deleteContentItemById, getEmpresas, getFuncionariosUnfiltered, getEmpresaById } from '@/lib/storageService';
import { ContentCard } from './ContentCard';
import { ContentFilters, type ContentFiltersState } from './ContentFilters';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Image from 'next/image';
import { Bot, Building, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseISO, startOfDay, endOfDay } from 'date-fns';
import { CONTENT_STORAGE_KEY, EMPRESAS_STORAGE_KEY, FUNCIONARIOS_STORAGE_KEY, ACTIVE_EMPRESA_ID_STORAGE_KEY, ALL_EMPRESAS_OR_VISAO_GERAL_VALUE } from '@/lib/constants';
import { useActiveEmpresa } from '@/hooks/useActiveEmpresa';

export function ContentListClient() {
  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  const [allEmpresas, setAllEmpresas] = useState<Empresa[]>([]);
  const [allFuncionarios, setAllFuncionarios] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ContentFiltersState>({});
  const { toast } = useToast();
  const [activeEmpresaIdGlobal, _setActiveEmpresaIdGlobal] = useActiveEmpresa();
  const [currentActiveEmpresaDetails, setCurrentActiveEmpresaDetails] = useState<Empresa | null>(null);

  const refreshData = useCallback(() => {
    setAllItems(getStoredContentItems());
    setAllEmpresas(getEmpresas());
    setAllFuncionarios(getFuncionariosUnfiltered());
  }, []);

  useEffect(() => {
    refreshData();
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CONTENT_STORAGE_KEY || event.key === EMPRESAS_STORAGE_KEY || event.key === FUNCIONARIOS_STORAGE_KEY || event.key === ACTIVE_EMPRESA_ID_STORAGE_KEY) {
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
    refreshData();
    toast({
      title: "Conteúdo Excluído",
      description: "O item de conteúdo foi excluído com sucesso.",
    });
  }, [refreshData, toast]);

  const filteredItems = useMemo(() => {
    let itemsToFilter = [...allItems];

    // Global Empresa Filter (from AppHeader)
    if (filters.empresaId && filters.empresaId !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
      const funcionariosDaEmpresa = allFuncionarios.filter(
        func => func.empresaId === filters.empresaId || !func.empresaId // Include "Available"
      ).map(f => f.id);
      
      itemsToFilter = itemsToFilter.filter(item => 
        item.createdByFuncionarioId && funcionariosDaEmpresa.includes(item.createdByFuncionarioId)
      );
    }

    return itemsToFilter.filter(item => {
      if (filters.searchTerm && 
          !item.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
          !item.topic.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      // Platform filter is removed from local state, as it's part of global empresa context now implicitly or not primary.
      if (filters.status && filters.status !== "all" && item.status !== filters.status) return false;
      
      const itemDate = parseISO(item.createdAt);
      if (filters.dateFrom && itemDate < startOfDay(filters.dateFrom)) return false;
      if (filters.dateTo && itemDate > endOfDay(filters.dateTo)) return false;
      
      return true;
    }).sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [allItems, filters, allFuncionarios]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
