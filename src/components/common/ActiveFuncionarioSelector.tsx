
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Departamento, Funcionario } from '@/lib/types';
import { DEPARTAMENTOS, FUNCIONARIOS_STORAGE_KEY, ACTIVE_FUNCIONARIOS_STORAGE_KEY } from '@/lib/constants';
import {
  getFuncionarios,
  setActiveFuncionarioForDepartamento,
  getActiveFuncionarioIdForDepartamento,
  getFuncionarioById,
} from '@/lib/storageService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Info, BrainCircuit } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ActiveFuncionarioSelectorProps {
  departamento: Departamento;
  className?: string;
}

const NONE_VALUE_FOR_SELECT = "_NONE_";

export function ActiveFuncionarioSelector({ departamento, className }: ActiveFuncionarioSelectorProps) {
  const [funcionariosDoDepartamento, setFuncionariosDoDepartamento] = useState<Funcionario[]>([]);
  const [activeFuncionarioId, setActiveFuncionarioId] = useState<string | null>(null);
  const [activeFuncionarioNome, setActiveFuncionarioNome] = useState<string | null>(null);

  const departamentoLabel = DEPARTAMENTOS.find(d => d.value === departamento)?.label || departamento;

  const refreshData = useCallback(() => {
    const allFuncionarios = getFuncionarios();
    const deptFuncionarios = allFuncionarios.filter(
      f => f.departamento === departamento && (f.status === 'Active' || !f.status)
    );
    setFuncionariosDoDepartamento(deptFuncionarios);

    const currentActiveId = getActiveFuncionarioIdForDepartamento(departamento);
    setActiveFuncionarioId(currentActiveId);

    if (currentActiveId) {
      const func = getFuncionarioById(currentActiveId);
      setActiveFuncionarioNome(func?.nome || null);
    } else {
      setActiveFuncionarioNome(null);
    }
  }, [departamento]);

  useEffect(() => {
    refreshData();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === FUNCIONARIOS_STORAGE_KEY || event.key === ACTIVE_FUNCIONARIOS_STORAGE_KEY) {
        refreshData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshData]);

  const handleSelectionChange = (funcionarioIdOrSpecialValue: string) => {
    const idToSet = funcionarioIdOrSpecialValue === NONE_VALUE_FOR_SELECT ? null : funcionarioIdOrSpecialValue;
    setActiveFuncionarioForDepartamento(departamento, idToSet);
    // refreshData will be called by the storage event listener
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <Label htmlFor={`active-funcionario-selector-${departamento}`} className="text-sm font-medium text-muted-foreground flex items-center">
          <BrainCircuit className="mr-2 h-4 w-4" />
          Funcionário Ativo para {departamentoLabel}
        </Label>
        <Select
          value={activeFuncionarioId || NONE_VALUE_FOR_SELECT}
          onValueChange={handleSelectionChange}
          name={`active-funcionario-selector-${departamento}`}
          aria-label={`Selecionar funcionário ativo para ${departamentoLabel}`}
        >
          <SelectTrigger id={`active-funcionario-selector-${departamento}`}>
            <SelectValue placeholder="Nenhum (Padrão do Sistema)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE_FOR_SELECT}>Nenhum (Padrão do Sistema)</SelectItem>
            {funcionariosDoDepartamento.length === 0 && (
              <SelectItem value="no-func-placeholder" disabled>
                Nenhum funcionário ativo criado para este departamento
              </SelectItem>
            )}
            {funcionariosDoDepartamento.map(func => (
              <SelectItem key={func.id} value={func.id}>{func.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 text-xs py-2">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          {activeFuncionarioNome
            ? <>Utilizando instruções do funcionário: <span className="font-semibold">{activeFuncionarioNome}</span>.</>
            : "Nenhum funcionário personalizado ativo. Usando prompt padrão do sistema."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
