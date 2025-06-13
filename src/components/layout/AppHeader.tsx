
"use client";

import { useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Building } from 'lucide-react';
import Link from 'next/link';
import { useActiveEmpresa } from '@/hooks/useActiveEmpresa';
import { getEmpresas, getEmpresaById } from '@/lib/storageService';
import type { Empresa } from '@/lib/types';
import { EMPRESAS_STORAGE_KEY, ALL_EMPRESAS_OR_VISAO_GERAL_VALUE } from '@/lib/constants';

interface AppHeaderProps {
  title: string;
  showCreateButton?: boolean;
}

export function AppHeader({ title, showCreateButton = false }: AppHeaderProps) {
  const [activeEmpresaId, setActiveEmpresaIdGlobally] = useActiveEmpresa();
  const [allEmpresas, setAllEmpresas] = useState<Empresa[]>([]);
  const [currentSelectedEmpresaName, setCurrentSelectedEmpresaName] = useState<string>("Visão Geral");

  useEffect(() => {
    const fetchEmpresas = () => {
      setAllEmpresas(getEmpresas());
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

  useEffect(() => {
    if (activeEmpresaId && activeEmpresaId !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
      const empresa = getEmpresaById(activeEmpresaId);
      setCurrentSelectedEmpresaName(empresa ? empresa.nome : "Visão Geral");
    } else {
      setCurrentSelectedEmpresaName("Visão Geral");
    }
  }, [activeEmpresaId]);

  const handleEmpresaChange = (value: string) => {
    if (value === ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
      setActiveEmpresaIdGlobally(null);
    } else {
      setActiveEmpresaIdGlobally(value);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      <h1 className="text-xl font-semibold whitespace-nowrap">{title}</h1>
      
      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-muted-foreground" />
          <Select
            value={activeEmpresaId || ALL_EMPRESAS_OR_VISAO_GERAL_VALUE}
            onValueChange={handleEmpresaChange}
          >
            <SelectTrigger className="w-[180px] sm:w-[250px] h-9 text-sm">
              <SelectValue placeholder="Selecionar Empresa..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_EMPRESAS_OR_VISAO_GERAL_VALUE}>Visão Geral / Todas</SelectItem>
              {allEmpresas.map(empresa => (
                <SelectItem key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showCreateButton && (
          <Button asChild size="sm">
            <Link href="/content/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Content
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
