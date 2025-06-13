
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Funcionario, Departamento, FuncionarioStatus, Empresa } from '@/lib/types';
import { 
  DEPARTAMENTOS, 
  FUNCIONARIOS_STORAGE_KEY, 
  ACTIVE_FUNCIONARIOS_STORAGE_KEY, 
  EMPRESAS_STORAGE_KEY, 
  ACTIVE_EMPRESA_ID_STORAGE_KEY, 
  ALL_EMPRESAS_OR_VISAO_GERAL_VALUE,
  FUNCIONARIO_FILTER_CURRENT_WITH_AVAILABLE,
  FUNCIONARIO_FILTER_AVAILABLE_ONLY,
  FUNCIONARIO_FILTER_ALL_WITH_AVAILABLE
} from '@/lib/constants';
import {
  getFuncionariosUnfiltered, // Changed from getFuncionarios
  saveFuncionario,
  deleteFuncionarioById,
  setActiveFuncionarioForDepartamento,
  getActiveFuncionarioIdForDepartamento,
  setFuncionarioStatus,
  getEmpresas, 
  getEmpresaById,
} from '@/lib/storageService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Label as UiLabel } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Trash2, Users, BrainCircuit, AlertTriangle, Settings2, Edit3, Coffee, PlayCircle, Briefcase, Copy as CloneIcon, Building, Building2, Filter } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDesc,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { useActiveEmpresa } from '@/hooks/useActiveEmpresa';
import Image from 'next/image';

const funcionarioFormSchema = z.object({
  nome: z.string().min(3, "O nome do funcionário deve ter pelo menos 3 caracteres."),
  instrucoes: z.string().min(10, "As instruções devem ter pelo menos 10 caracteres."),
  departamento: z.enum(["ContentCreation", "Summarizer", "ThemePlanner"], {
    required_error: "Por favor, selecione um departamento.",
  }),
  empresaId: z.string().optional(),
});

type FuncionarioFormData = z.infer<typeof funcionarioFormSchema>;

const NONE_VALUE_FOR_SELECT = "_NONE_";
const SEM_EMPRESA_VALUE = "_SEM_EMPRESA_";

export function TrainingClient() {
  const { toast } = useToast();
  const [allFuncionariosUnfiltered, setAllFuncionariosUnfiltered] = useState<Funcionario[]>([]);
  const [allEmpresas, setAllEmpresas] = useState<Empresa[]>([]);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [activeFuncionarioIds, setActiveFuncionarioIds] = useState<Record<string, string | null>>({});
  const [activeEmpresaIdGlobal, _setActiveEmpresaIdGlobal] = useActiveEmpresa();
  const [currentActiveEmpresaDetails, setCurrentActiveEmpresaDetails] = useState<Empresa | null>(null);
  const [funcionarioListFilter, setFuncionarioListFilter] = useState<string>('');


  const form = useForm<FuncionarioFormData>({
    resolver: zodResolver(funcionarioFormSchema),
    defaultValues: {
      nome: '',
      instrucoes: '',
      departamento: undefined,
      empresaId: SEM_EMPRESA_VALUE,
    },
  });

  const refreshAllData = useCallback(() => {
    setAllFuncionariosUnfiltered(getFuncionariosUnfiltered());
    setAllEmpresas(getEmpresas());
    
    const activeIds: Record<string, string | null> = {};
    DEPARTAMENTOS.forEach(dep => {
      activeIds[dep.value] = getActiveFuncionarioIdForDepartamento(dep.value as Departamento);
    });
    setActiveFuncionarioIds(activeIds);
  }, []);
  
  const refreshEmpresaDetails = useCallback(() => {
     if (activeEmpresaIdGlobal && activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
      setCurrentActiveEmpresaDetails(getEmpresaById(activeEmpresaIdGlobal));
    } else {
      setCurrentActiveEmpresaDetails(null);
    }
  }, [activeEmpresaIdGlobal]);


  useEffect(() => {
    refreshAllData();
    refreshEmpresaDetails();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === FUNCIONARIOS_STORAGE_KEY || event.key === ACTIVE_FUNCIONARIOS_STORAGE_KEY || event.key === ACTIVE_EMPRESA_ID_STORAGE_KEY) {
        refreshAllData();
      }
      if (event.key === EMPRESAS_STORAGE_KEY || event.key === ACTIVE_EMPRESA_ID_STORAGE_KEY) {
        refreshAllData(); // Refresh all data if companies change as it affects filters
        refreshEmpresaDetails();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshAllData, refreshEmpresaDetails]);

  useEffect(() => {
    if (activeEmpresaIdGlobal && activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
      setFuncionarioListFilter(FUNCIONARIO_FILTER_CURRENT_WITH_AVAILABLE);
      if (!editingFuncionario) {
        form.setValue('empresaId', activeEmpresaIdGlobal);
      }
    } else {
      setFuncionarioListFilter(FUNCIONARIO_FILTER_ALL_WITH_AVAILABLE);
      if (!editingFuncionario) {
        form.setValue('empresaId', SEM_EMPRESA_VALUE);
      }
    }
  }, [activeEmpresaIdGlobal, editingFuncionario, form]);


  const onSubmit: SubmitHandler<FuncionarioFormData> = (data) => {
    let effectiveEmpresaId = data.empresaId === SEM_EMPRESA_VALUE ? undefined : data.empresaId;
    
    const funcDataForSave: Funcionario = {
      id: editingFuncionario?.id || Date.now().toString(),
      nome: data.nome,
      instrucoes: data.instrucoes,
      departamento: data.departamento as Departamento,
      empresaId: effectiveEmpresaId,
      createdAt: editingFuncionario?.createdAt || new Date().toISOString(),
      status: editingFuncionario?.status || 'Active',
    };

    saveFuncionario(funcDataForSave);
    toast({
      title: editingFuncionario ? "Funcionário Atualizado!" : "Funcionário Criado!",
      description: `O funcionário "${data.nome}" foi salvo.`,
    });
    // Reset form considering current global company context for empresaId default
    const defaultEmpresaId = (activeEmpresaIdGlobal && activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) ? activeEmpresaIdGlobal : SEM_EMPRESA_VALUE;
    form.reset({ nome: '', instrucoes: '', departamento: undefined, empresaId: defaultEmpresaId });
    setEditingFuncionario(null);
  };

  const handleEditFuncionario = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario);
    form.reset({
      nome: funcionario.nome,
      instrucoes: funcionario.instrucoes,
      departamento: funcionario.departamento,
      empresaId: funcionario.empresaId || SEM_EMPRESA_VALUE,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloneFuncionario = (funcionario: Funcionario) => {
    setEditingFuncionario(null); 
    form.reset({
      nome: `${funcionario.nome} (Cópia)`,
      instrucoes: funcionario.instrucoes,
      departamento: funcionario.departamento,
      empresaId: funcionario.empresaId || SEM_EMPRESA_VALUE,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({
      title: "Funcionário Pronto para Clonar",
      description: `Edite os detalhes de "${funcionario.nome} (Cópia)" e salve.`,
    });
  };

  const handleDelete = (id: string, nome: string) => {
    deleteFuncionarioById(id); 
    toast({
      title: "Funcionário Demitido!",
      description: `O funcionário "${nome}" foi removido permanentemente.`,
    });
    if (editingFuncionario?.id === id) {
        const defaultEmpresaId = (activeEmpresaIdGlobal && activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) ? activeEmpresaIdGlobal : SEM_EMPRESA_VALUE;
        form.reset({ nome: '', instrucoes: '', departamento: undefined, empresaId: defaultEmpresaId });
        setEditingFuncionario(null);
    }
  };

  const handleSetActive = (departamento: Departamento, funcionarioIdOrSpecialValue: string) => {
    const idToSet = funcionarioIdOrSpecialValue === NONE_VALUE_FOR_SELECT ? null : funcionarioIdOrSpecialValue;
    setActiveFuncionarioForDepartamento(departamento, idToSet); 
    toast({
      title: "Funcionário Ativo Atualizado!",
      description: `Configuração para ${DEPARTAMENTOS.find(d => d.value === departamento)?.label} atualizada.`,
    });
  };

  const handleChangeFuncionarioStatus = (id: string, newStatus: FuncionarioStatus) => {
    setFuncionarioStatus(id, newStatus); 
    const funcionario = allFuncionariosUnfiltered.find(f => f.id === id);
    toast({
      title: `Status Alterado!`,
      description: `Funcionário "${funcionario?.nome}" agora está ${newStatus === 'Vacation' ? 'de Férias' : 'Ativo'}.`,
    });
  };

  const getEmpresaNome = (empresaId?: string): string => {
    if (!empresaId) return "Disponível (Sem Empresa)";
    const empresa = allEmpresas.find(e => e.id === empresaId);
    return empresa ? empresa.nome : "Empresa Desconhecida";
  };
  
  const funcionariosDisponiveisParaDepartamento = useCallback((departamento: Departamento) => {
      let funcs = getFuncionariosUnfiltered().filter(f => 
          f.departamento === departamento && 
          (f.status === 'Active' || !f.status) 
      );

      if (activeEmpresaIdGlobal && activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
          funcs = funcs.filter(f => !f.empresaId || f.empresaId === activeEmpresaIdGlobal);
      }
      return funcs;
  }, [activeEmpresaIdGlobal]);


  const getLocalFilterLabel = useCallback(() => {
    if (funcionarioListFilter === FUNCIONARIO_FILTER_CURRENT_WITH_AVAILABLE && currentActiveEmpresaDetails) {
      return `Empresa Atual (${currentActiveEmpresaDetails.nome}) e Disponíveis`;
    }
    if (funcionarioListFilter === FUNCIONARIO_FILTER_AVAILABLE_ONLY) {
      return "Apenas Funcionários Disponíveis";
    }
    if (funcionarioListFilter === FUNCIONARIO_FILTER_ALL_WITH_AVAILABLE) {
      return "Todas as Empresas e Disponíveis";
    }
    const empresa = allEmpresas.find(e => e.id === funcionarioListFilter);
    if (empresa) {
      return `Empresa: ${empresa.nome}`;
    }
    return "Visão Geral";
  }, [funcionarioListFilter, currentActiveEmpresaDetails, allEmpresas]);


  const filteredFuncionarios = useMemo(() => {
    return allFuncionariosUnfiltered.filter(f => {
      if (funcionarioListFilter === FUNCIONARIO_FILTER_CURRENT_WITH_AVAILABLE) {
        return (activeEmpresaIdGlobal && f.empresaId === activeEmpresaIdGlobal) || !f.empresaId;
      }
      if (funcionarioListFilter === FUNCIONARIO_FILTER_AVAILABLE_ONLY) {
        return !f.empresaId;
      }
      if (funcionarioListFilter === FUNCIONARIO_FILTER_ALL_WITH_AVAILABLE) {
        return true; // No specific company filter, show all
      }
      // If funcionarioListFilter is a specific company ID
      return f.empresaId === funcionarioListFilter;
    });
  }, [allFuncionariosUnfiltered, funcionarioListFilter, activeEmpresaIdGlobal]);

  const displayedFuncionariosAtivos = useMemo(
    () => filteredFuncionarios.filter(f => f.status === 'Active' || !f.status),
    [filteredFuncionarios]
  );

  const displayedFuncionariosFerias = useMemo(
    () => filteredFuncionarios.filter(f => f.status === 'Vacation'),
    [filteredFuncionarios]
  );


  return (
    <div className="space-y-8">
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
              <p className="text-sm text-primary-foreground/80">Treinando funcionários no contexto desta empresa.</p>
            </div>
          </CardHeader>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BrainCircuit className="mr-2 h-6 w-6 text-primary" />
            {editingFuncionario ? `Editando Funcionário: ${editingFuncionario.nome}` : "Criar Novo Funcionário de IA"}
          </CardTitle>
          <CardDescription>
            {editingFuncionario
              ? `Modifique os detalhes do funcionário "${editingFuncionario.nome}".`
              : "Crie 'Funcionários' com instruções específicas, atribua-os a 'Departamentos' e, opcionalmente, a 'Empresas'."}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Funcionário</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João, o Criativo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="departamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!editingFuncionario} 
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o departamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEPARTAMENTOS.map((dep) => (
                            <SelectItem key={dep.value} value={dep.value}>
                              {dep.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                       {editingFuncionario && <FormDescription>O departamento não pode ser alterado ao editar.</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="empresaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || SEM_EMPRESA_VALUE}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma empresa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={SEM_EMPRESA_VALUE}>Disponível (Sem Empresa)</SelectItem>
                          {allEmpresas.map((emp) => (
                            <SelectItem 
                              key={emp.id} 
                              value={emp.id}
                              // If global company is active, restrict selection unless editing or global is this company
                              disabled={!!activeEmpresaIdGlobal && 
                                        activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE && 
                                        emp.id !== activeEmpresaIdGlobal &&
                                        (!editingFuncionario || editingFuncionario.empresaId !== emp.id)
                                       }
                            >
                              {emp.nome}
                            </SelectItem>
                          ))}
                           {allEmpresas.length === 0 && <SelectItem value="no-empresa-placeholder" disabled>Nenhuma empresa cadastrada</SelectItem>}
                        </SelectContent>
                      </Select>
                      {activeEmpresaIdGlobal && activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE && !editingFuncionario &&
                        <FormDescription>Contexto global: {getEmpresaById(activeEmpresaIdGlobal)?.nome}. Funcionário será associado a esta empresa por padrão, ou pode ser "Disponível".</FormDescription>
                      }
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="instrucoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instruções Específicas para o Funcionário</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Digite as instruções detalhadas que este funcionário deve seguir..."
                        {...field}
                        rows={8}
                      />
                    </FormControl>
                    <FormDescription>
                      Estas instruções serão usadas pela IA quando este funcionário estiver ativo.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                {editingFuncionario ? "Atualizar Funcionário" : "Salvar Funcionário"}
              </Button>
              {editingFuncionario && (
                <Button type="button" variant="outline" onClick={() => {
                  setEditingFuncionario(null);
                  const defaultEmpresaId = (activeEmpresaIdGlobal && activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) ? activeEmpresaIdGlobal : SEM_EMPRESA_VALUE;
                  form.reset({ nome: '', instrucoes: '', departamento: undefined, empresaId: defaultEmpresaId });
                }}>
                  Cancelar Edição
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center">
                <Settings2 className="mr-2 h-6 w-6 text-primary"/>
                Gerenciar Funcionários Ativos por Departamento
            </CardTitle>
            <CardDescription>
                Selecione qual funcionário (ativo e não em férias) deve estar ativo para cada departamento. 
                A seleção respeita o contexto da empresa globalmente ativa (funcionários da empresa ativa ou "Disponíveis").
            </CardDescription>
             {activeEmpresaIdGlobal && activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE && currentActiveEmpresaDetails && (
                <Badge variant="outline" className="mt-2">Contexto da Empresa Global: {currentActiveEmpresaDetails.nome}</Badge>
            )}
        </CardHeader>
        <CardContent className="space-y-6">
            {DEPARTAMENTOS.map(dep => {
                const deptFuncionarios = funcionariosDisponiveisParaDepartamento(dep.value as Departamento);
                const currentActiveIdForDep = activeFuncionarioIds[dep.value];
                return (
                    <div key={dep.value} className="space-y-2 p-3 border rounded-md shadow-sm">
                        <UiLabel className="font-semibold">{dep.label}</UiLabel>
                        <Select
                            value={currentActiveIdForDep || NONE_VALUE_FOR_SELECT}
                            onValueChange={(funcionarioIdOrSpecialValue) => handleSetActive(dep.value as Departamento, funcionarioIdOrSpecialValue)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Nenhum (Padrão do Sistema)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE_VALUE_FOR_SELECT}>Nenhum (Padrão do Sistema)</SelectItem>
                                {deptFuncionarios.length === 0 && <SelectItem value="no-func-for-dep-placeholder" disabled>Nenhum funcionário compatível para este dep. {activeEmpresaIdGlobal && activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE && currentActiveEmpresaDetails ? `na empresa ${currentActiveEmpresaDetails.nome}` : '(contexto atual)'}</SelectItem>}
                                {deptFuncionarios.map(func => (
                                    <SelectItem key={func.id} value={func.id}>
                                      {func.nome} ({getEmpresaNome(func.empresaId)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );
            })}
        </CardContent>
      </Card>

      {/* Employees List Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-6 w-6 text-primary" />
                Quadro de Funcionários
              </CardTitle>
              <CardDescription>
                Visualizando: <span className="font-semibold">{getLocalFilterLabel()}</span>.
              </CardDescription>
            </div>
            <div className="w-full sm:w-auto min-w-[200px]">
              <UiLabel htmlFor="funcionario-list-filter" className="sr-only">Filtrar Lista de Funcionários</UiLabel>
              <Select value={funcionarioListFilter} onValueChange={setFuncionarioListFilter}>
                <SelectTrigger id="funcionario-list-filter">
                  <SelectValue placeholder="Filtrar lista..." />
                </SelectTrigger>
                <SelectContent>
                  {currentActiveEmpresaDetails && activeEmpresaIdGlobal && activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE && (
                    <SelectItem value={FUNCIONARIO_FILTER_CURRENT_WITH_AVAILABLE}>
                      Empresa Atual ({currentActiveEmpresaDetails.nome}) e Disponíveis
                    </SelectItem>
                  )}
                  <SelectItem value={FUNCIONARIO_FILTER_AVAILABLE_ONLY}>Apenas Funcionários Disponíveis</SelectItem>
                  <SelectItem value={FUNCIONARIO_FILTER_ALL_WITH_AVAILABLE}>Todas as Empresas e Disponíveis</SelectItem>
                  {allEmpresas.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>Empresa: {emp.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        {displayedFuncionariosAtivos.length > 0 && (
          <CardContent className="space-y-4 pt-4">
            {displayedFuncionariosAtivos.map((func) => (
              <Card key={func.id} className="p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{func.nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      Departamento: <span className="font-medium text-primary">{DEPARTAMENTOS.find(d => d.value === func.departamento)?.label || func.departamento}</span>
                    </p>
                     <p className="text-sm text-muted-foreground">
                      Empresa: <span className="font-medium text-accent">{getEmpresaNome(func.empresaId)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Criado em: {new Date(func.createdAt).toLocaleDateString()}</p>
                    <Badge variant={func.status === 'Vacation' ? 'outline' : 'secondary'} className="mt-1">
                        {func.status === 'Vacation' ? 'De Férias' : 'Ativo'}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center flex-wrap">
                     <Button variant="outline" size="sm" onClick={() => handleEditFuncionario(func)}>
                        <Edit3 className="mr-1 h-4 w-4"/> Editar
                      </Button>
                       <Button variant="outline" size="sm" onClick={() => handleCloneFuncionario(func)}>
                        <CloneIcon className="mr-1 h-4 w-4"/> Clonar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleChangeFuncionarioStatus(func.id, 'Vacation')}>
                        <Coffee className="mr-1 h-4 w-4"/> Colocar em Férias
                      </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-1 h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Demitir</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                           <AlertDialogTitle className="flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5 text-destructive"/>Demitir Funcionário?
                          </AlertDialogTitle>
                          <AlertDialogDesc>
                            Esta ação removerá permanentemente o funcionário "{func.nome}". Deseja continuar?
                          </AlertDialogDesc>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(func.id, func.nome)} className="bg-destructive hover:bg-destructive/90">
                            Sim, Demitir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t">
                  <p className="text-xs font-semibold mb-1">Instruções:</p>
                  <p className="text-sm bg-muted/30 p-2 rounded-md whitespace-pre-wrap max-h-28 overflow-y-auto">
                    {func.instrucoes}
                  </p>
                </div>
              </Card>
            ))}
          </CardContent>
        )}
        {displayedFuncionariosAtivos.length === 0 && (
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">Nenhum funcionário ativo encontrado para o filtro: "{getLocalFilterLabel()}".</p>
            </CardContent>
        )}
      </Card>

      {displayedFuncionariosFerias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="mr-2 h-6 w-6 text-muted-foreground" />
              Funcionários em Férias (<span className="font-normal text-base">{getLocalFilterLabel()}</span>)
            </CardTitle>
            <CardDescription>Funcionários que estão de férias. Você pode reativá-los, cloná-los ou demiti-los.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayedFuncionariosFerias.map((func) => (
              <Card key={func.id} className="p-4 shadow-sm bg-muted/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-muted-foreground">{func.nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      Departamento: {DEPARTAMENTOS.find(d => d.value === func.departamento)?.label || func.departamento}
                    </p>
                     <p className="text-sm text-muted-foreground">
                      Empresa: <span className="font-medium">{getEmpresaNome(func.empresaId)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Em férias desde: {new Date(func.createdAt).toLocaleDateString()}</p>
                     <Badge variant={'outline'} className="mt-1 text-muted-foreground border-muted-foreground/50">
                        De Férias
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => handleChangeFuncionarioStatus(func.id, 'Active')}>
                        <PlayCircle className="mr-1 h-4 w-4"/> Reativar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleCloneFuncionario(func)}>
                        <CloneIcon className="mr-1 h-4 w-4"/> Clonar
                      </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="bg-destructive/80 hover:bg-destructive/70">
                          <Trash2 className="mr-1 h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Demitir</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                           <AlertDialogTitle className="flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5 text-destructive"/>Demitir Funcionário?
                          </AlertDialogTitle>
                          <AlertDialogDesc>
                            Esta ação removerá permanentemente o funcionário "{func.nome}" (que está de férias). Deseja continuar?
                          </AlertDialogDesc>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(func.id, func.nome)} className="bg-destructive hover:bg-destructive/90">
                            Sim, Demitir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                 <div className="mt-3 pt-2 border-t border-muted-foreground/20">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Instruções (Arquivadas):</p>
                  <p className="text-sm bg-background/50 p-2 rounded-md whitespace-pre-wrap max-h-28 overflow-y-auto text-muted-foreground">
                    {func.instrucoes}
                  </p>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
      {displayedFuncionariosAtivos.length === 0 && displayedFuncionariosFerias.length === 0 && (
         <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">Nenhum funcionário para exibir com o filtro atual: "{getLocalFilterLabel()}". Crie um novo funcionário ou ajuste os filtros.</p>
            </CardContent>
         </Card>
      )}
    </div>
  );
}

    