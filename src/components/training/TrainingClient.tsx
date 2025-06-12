
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Funcionario, Departamento } from '@/lib/types';
import { DEPARTAMENTOS, FUNCIONARIOS_STORAGE_KEY, ACTIVE_FUNCIONARIOS_STORAGE_KEY } from '@/lib/constants';
import {
  getFuncionarios,
  saveFuncionario,
  deleteFuncionarioById,
  setActiveFuncionarioForDepartamento,
  getActiveFuncionarioIdForDepartamento,
} from '@/lib/storageService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Save, Trash2, Users, BrainCircuit, AlertTriangle, Settings2, Edit3 } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';

const funcionarioFormSchema = z.object({
  nome: z.string().min(3, "O nome do funcionário deve ter pelo menos 3 caracteres."),
  instrucoes: z.string().min(10, "As instruções devem ter pelo menos 10 caracteres."),
  departamento: z.enum(["ContentCreation", "Summarizer", "ThemePlanner", "SmartHashtagSuggestions"], {
    required_error: "Por favor, selecione um departamento.",
  }),
});

type FuncionarioFormData = z.infer<typeof funcionarioFormSchema>;

export function TrainingClient() {
  const { toast } = useToast();
  const [allFuncionarios, setAllFuncionarios] = useState<Funcionario[]>([]);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [activeFuncionarioIds, setActiveFuncionarioIds] = useState<Record<Departamento, string | null>>({});

  const form = useForm<FuncionarioFormData>({
    resolver: zodResolver(funcionarioFormSchema),
    defaultValues: {
      nome: '',
      instrucoes: '',
      departamento: undefined,
    },
  });

  const refreshAllFuncionarios = useCallback(() => {
    setAllFuncionarios(getFuncionarios());
  }, []);

  const refreshActiveFuncionarios = useCallback(() => {
    const activeIds: Record<Departamento, string | null> = {} as Record<Departamento, string | null>;
    DEPARTAMENTOS.forEach(dep => {
      activeIds[dep.value] = getActiveFuncionarioIdForDepartamento(dep.value);
    });
    setActiveFuncionarioIds(activeIds);
  }, []);

  useEffect(() => {
    refreshAllFuncionarios();
    refreshActiveFuncionarios();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === FUNCIONARIOS_STORAGE_KEY) {
        refreshAllFuncionarios();
      }
      if (event.key === ACTIVE_FUNCIONARIOS_STORAGE_KEY) {
        refreshActiveFuncionarios();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshAllFuncionarios, refreshActiveFuncionarios]);

  const onSubmit: SubmitHandler<FuncionarioFormData> = (data) => {
    const newFuncionario: Funcionario = {
      id: editingFuncionario?.id || Date.now().toString(),
      nome: data.nome,
      instrucoes: data.instrucoes,
      departamento: data.departamento as Departamento,
      createdAt: editingFuncionario?.createdAt || new Date().toISOString(),
    };

    saveFuncionario(newFuncionario);
    toast({
      title: editingFuncionario ? "Funcionário Atualizado!" : "Funcionário Criado!",
      description: `O funcionário "${data.nome}" para o departamento de ${DEPARTAMENTOS.find(d => d.value === data.departamento)?.label} foi salvo.`,
    });
    form.reset({ nome: '', instrucoes: '', departamento: undefined });
    setEditingFuncionario(null);
    // No need to call refreshAllFuncionarios() here as saveFuncionario triggers storage event
  };

  const handleEditFuncionario = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario);
    form.reset({
      nome: funcionario.nome,
      instrucoes: funcionario.instrucoes,
      departamento: funcionario.departamento,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string, nome: string) => {
    deleteFuncionarioById(id); // This will also trigger storage events to update lists
    toast({
      title: "Funcionário Demitido!",
      description: `O funcionário "${nome}" foi removido.`,
    });
    if (editingFuncionario?.id === id) {
        form.reset({ nome: '', instrucoes: '', departamento: undefined });
        setEditingFuncionario(null);
    }
  };

  const handleSetActiveFuncionario = (departamento: Departamento, funcionarioId: string) => {
    const idToSet = funcionarioId === '' ? null : funcionarioId;
    setActiveFuncionarioForDepartamento(departamento, idToSet);
    // refreshActiveFuncionarios will be called by storage event
    toast({
      title: "Funcionário Ativo Atualizado!",
      description: `Configuração para ${DEPARTAMENTOS.find(d => d.value === departamento)?.label} atualizada.`,
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BrainCircuit className="mr-2 h-6 w-6 text-primary" />
            {editingFuncionario ? `Editando Funcionário: ${editingFuncionario.nome}` : "Criar Novo Funcionário de IA"}
          </CardTitle>
          <CardDescription>
            {editingFuncionario
              ? `Modifique os detalhes do funcionário "${editingFuncionario.nome}".`
              : "Crie 'Funcionários' com instruções específicas e atribua-os a 'Departamentos'. Você pode ter múltiplos funcionários por departamento."}
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
              <FormField
                control={form.control}
                name="departamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                       disabled={!!editingFuncionario} // Department cannot be changed when editing to maintain integrity
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o departamento de atuação" />
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
                    {editingFuncionario && <FormDescription>O departamento não pode ser alterado ao editar um funcionário existente.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      Estas instruções serão usadas pela IA quando este funcionário estiver ativo para o departamento selecionado.
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
                  form.reset({ nome: '', instrucoes: '', departamento: undefined });
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
                Selecione qual funcionário (se houver) deve estar ativo para cada departamento. As instruções do funcionário ativo serão usadas.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {DEPARTAMENTOS.map(dep => {
                const funcionariosNesteDepartamento = allFuncionarios.filter(f => f.departamento === dep.value);
                return (
                    <div key={dep.value} className="space-y-2 p-3 border rounded-md shadow-sm">
                        <FormLabel className="font-semibold">{dep.label}</FormLabel>
                        <Select
                            value={activeFuncionarioIds[dep.value] || ""}
                            onValueChange={(funcionarioId) => handleSetActiveFuncionario(dep.value, funcionarioId)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Nenhum (Padrão do Sistema)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Nenhum (Padrão do Sistema)</SelectItem>
                                {funcionariosNesteDepartamento.length === 0 && <SelectItem value="no-func" disabled>Nenhum funcionário criado para este departamento</SelectItem>}
                                {funcionariosNesteDepartamento.map(func => (
                                    <SelectItem key={func.id} value={func.id}>{func.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );
            })}
        </CardContent>
      </Card>


      {allFuncionarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-6 w-6 text-primary" />
              Quadro de Todos os Funcionários Criados
            </CardTitle>
            <CardDescription>Gerencie todos os funcionários existentes. Ative-os na seção acima.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {allFuncionarios.map((func) => (
              <Card key={func.id} className="p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{func.nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      Departamento: <span className="font-medium text-primary">{DEPARTAMENTOS.find(d => d.value === func.departamento)?.label || func.departamento}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Criado em: {new Date(func.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={() => handleEditFuncionario(func)}>
                        <Edit3 className="mr-1 h-4 w-4"/> Editar
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
                            Esta ação removerá permanentemente o funcionário "{func.nome}" do departamento de {DEPARTAMENTOS.find(d => d.value === func.departamento)?.label}. As instruções serão perdidas. Se este funcionário estiver ativo para algum departamento, ele será desativado. Deseja continuar?
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
        </Card>
      )}
    </div>
  );
}
