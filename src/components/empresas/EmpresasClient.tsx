
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Empresa } from '@/lib/types';
import { getEmpresas, saveEmpresa, deleteEmpresaById } from '@/lib/storageService';
import { EMPRESAS_STORAGE_KEY } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Save, Trash2, Building2, Edit3, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';

const empresaFormSchema = z.object({
  nome: z.string().min(2, "O nome da empresa deve ter pelo menos 2 caracteres."),
  logoUrl: z.string().url("Por favor, insira uma URL válida para o logo.").optional().or(z.literal('')),
});

type EmpresaFormData = z.infer<typeof empresaFormSchema>;

export function EmpresasClient() {
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);

  const form = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaFormSchema),
    defaultValues: {
      nome: '',
      logoUrl: '',
    },
  });

  const refreshEmpresas = useCallback(() => {
    setEmpresas(getEmpresas());
  }, []);

  useEffect(() => {
    refreshEmpresas();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === EMPRESAS_STORAGE_KEY) {
        refreshEmpresas();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshEmpresas]);

  const onSubmit: SubmitHandler<EmpresaFormData> = (data) => {
    const newEmpresa: Empresa = {
      id: editingEmpresa?.id || Date.now().toString(),
      nome: data.nome,
      logoUrl: data.logoUrl || undefined,
      createdAt: editingEmpresa?.createdAt || new Date().toISOString(),
    };
    saveEmpresa(newEmpresa);
    toast({
      title: editingEmpresa ? "Empresa Atualizada!" : "Empresa Criada!",
      description: `A empresa "${data.nome}" foi salva.`,
    });
    form.reset({ nome: '', logoUrl: '' });
    setEditingEmpresa(null);
  };

  const handleEditEmpresa = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    form.reset({
      nome: empresa.nome,
      logoUrl: empresa.logoUrl || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string, nome: string) => {
    deleteEmpresaById(id);
    toast({
      title: "Empresa Excluída!",
      description: `A empresa "${nome}" foi removida. Funcionários associados estão agora 'Disponíveis'.`,
    });
     if (editingEmpresa?.id === id) {
        form.reset({ nome: '', logoUrl: '' });
        setEditingEmpresa(null);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="mr-2 h-6 w-6 text-primary" />
            {editingEmpresa ? `Editando Empresa: ${editingEmpresa.nome}` : "Adicionar Nova Empresa"}
          </CardTitle>
          <CardDescription>
            {editingEmpresa ? `Modifique os detalhes da empresa.` : "Cadastre as empresas que utilizarão os serviços de IA."}
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
                    <FormLabel>Nome da Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Logo (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://exemplo.com/logo.png" {...field} />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                {editingEmpresa ? "Atualizar Empresa" : "Salvar Empresa"}
              </Button>
              {editingEmpresa && (
                <Button type="button" variant="outline" onClick={() => {
                  setEditingEmpresa(null);
                  form.reset({ nome: '', logoUrl: '' });
                }}>
                  Cancelar Edição
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>

      {empresas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Empresas Cadastradas</CardTitle>
            <CardDescription>Lista de todas as empresas registradas no sistema.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {empresas.map((empresa) => (
              <Card key={empresa.id} className="p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <Image
                        src={empresa.logoUrl || `https://placehold.co/60x60.png`}
                        alt={`Logo ${empresa.nome}`}
                        width={60}
                        height={60}
                        className="rounded-md object-cover border"
                        data-ai-hint="logo company"
                        onError={(e) => (e.currentTarget.src = 'https://placehold.co/60x60.png')}
                    />
                    <h3 className="text-lg font-semibold">{empresa.nome}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cadastrada em: {new Date(empresa.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleEditEmpresa(empresa)}>
                    <Edit3 className="mr-1 h-4 w-4" /> Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-1 h-4 w-4" /> Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center">
                          <AlertTriangle className="mr-2 h-5 w-5 text-destructive"/> Excluir Empresa?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação removerá permanentemente a empresa "{empresa.nome}". 
                          Os funcionários atualmente associados a esta empresa ficarão 'Disponíveis' (sem empresa).
                          Deseja continuar?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(empresa.id, empresa.nome)} className="bg-destructive hover:bg-destructive/90">
                          Sim, Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
       {empresas.length === 0 && !editingEmpresa && (
         <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">Nenhuma empresa cadastrada ainda. Comece adicionando uma acima!</p>
            </CardContent>
         </Card>
      )}
    </div>
  );
}
