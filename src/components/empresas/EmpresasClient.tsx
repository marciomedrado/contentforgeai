
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Empresa, PlatformApiConfig } from '@/lib/types';
import { getEmpresas, saveEmpresa, deleteEmpresaById } from '@/lib/storageService';
import { EMPRESAS_STORAGE_KEY } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Save, Trash2, Building2, Edit3, AlertTriangle, Image as ImageIcon, Settings, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescUi,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescUi,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleUi,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';
import { Alert, AlertDescription as AlertDesc } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const empresaFormSchema = z.object({
  nome: z.string().min(2, "O nome da empresa deve ter pelo menos 2 caracteres."),
  logoUrl: z.string().url("Por favor, insira uma URL válida para o logo.").optional().or(z.literal('')),
});

type EmpresaFormData = z.infer<typeof empresaFormSchema>;

const platformApiConfigSchema = z.object({
  apiUrl: z.string().url("URL inválida").optional().or(z.literal('')),
  username: z.string().optional(),
  appPassword: z.string().optional(), // For WordPress specific app password
  apiToken: z.string().optional(),    // Generic for social media
});

type PlatformApiFormData = z.infer<typeof platformApiConfigSchema>;


export function EmpresasClient() {
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedEmpresaForSettings, setSelectedEmpresaForSettings] = useState<Empresa | null>(null);

  const empresaMainForm = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaFormSchema),
    defaultValues: {
      nome: '',
      logoUrl: '',
    },
  });

  const apiConfigWordPressForm = useForm<PlatformApiFormData>({
    resolver: zodResolver(platformApiConfigSchema),
    defaultValues: { apiUrl: '', username: '', appPassword: '' },
  });
  const apiConfigInstagramForm = useForm<PlatformApiFormData>({
    resolver: zodResolver(platformApiConfigSchema.omit({apiUrl: true, username: true, appPassword: true})),
    defaultValues: { apiToken: '' },
  });
  const apiConfigFacebookForm = useForm<PlatformApiFormData>({
    resolver: zodResolver(platformApiConfigSchema.omit({apiUrl: true, username: true, appPassword: true})),
    defaultValues: { apiToken: '' },
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

  const onSubmitEmpresa: SubmitHandler<EmpresaFormData> = (data) => {
    const newEmpresa: Empresa = {
      id: editingEmpresa?.id || Date.now().toString(),
      nome: data.nome,
      logoUrl: data.logoUrl || undefined,
      createdAt: editingEmpresa?.createdAt || new Date().toISOString(),
      apiConfigs: editingEmpresa?.apiConfigs || {}, // Preserve existing API configs
    };
    saveEmpresa(newEmpresa);
    toast({
      title: editingEmpresa ? "Empresa Atualizada!" : "Empresa Criada!",
      description: `A empresa "${data.nome}" foi salva.`,
    });
    empresaMainForm.reset({ nome: '', logoUrl: '' });
    setEditingEmpresa(null);
  };

  const handleEditEmpresa = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    empresaMainForm.reset({
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
        empresaMainForm.reset({ nome: '', logoUrl: '' });
        setEditingEmpresa(null);
    }
  };

  const handleOpenSettingsDialog = (empresa: Empresa) => {
    setSelectedEmpresaForSettings(empresa);
    apiConfigWordPressForm.reset({
      apiUrl: empresa.apiConfigs?.wordpress?.apiUrl?.value || '',
      username: empresa.apiConfigs?.wordpress?.username?.value || '',
      appPassword: empresa.apiConfigs?.wordpress?.appPassword?.value || '',
    });
    apiConfigInstagramForm.reset({
      apiToken: empresa.apiConfigs?.instagram?.apiToken?.value || '',
    });
    apiConfigFacebookForm.reset({
      apiToken: empresa.apiConfigs?.facebook?.apiToken?.value || '',
    });
    setIsSettingsDialogOpen(true);
  };

  const onSubmitApiConfigs = (platform: 'wordpress' | 'instagram' | 'facebook', data: PlatformApiFormData) => {
    if (!selectedEmpresaForSettings) return;

    const updatedEmpresa: Empresa = {
      ...selectedEmpresaForSettings,
      apiConfigs: {
        ...(selectedEmpresaForSettings.apiConfigs || {}),
        [platform]: {
          ...(selectedEmpresaForSettings.apiConfigs?.[platform] || {}),
          ...(platform === 'wordpress' && {
            apiUrl: { ...selectedEmpresaForSettings.apiConfigs?.wordpress?.apiUrl, value: data.apiUrl } as PlatformApiConfig['apiUrl'],
            username: { ...selectedEmpresaForSettings.apiConfigs?.wordpress?.username, value: data.username } as PlatformApiConfig['username'],
            appPassword: { ...selectedEmpresaForSettings.apiConfigs?.wordpress?.appPassword, value: data.appPassword } as PlatformApiConfig['appPassword'],
          }),
          ...((platform === 'instagram' || platform === 'facebook') && {
             apiToken: { ...selectedEmpresaForSettings.apiConfigs?.[platform]?.apiToken, value: data.apiToken } as PlatformApiConfig['apiToken'],
          })
        }
      }
    };
    saveEmpresa(updatedEmpresa);
    toast({
      title: `Configurações de ${platform.charAt(0).toUpperCase() + platform.slice(1)} Salvas!`,
      description: `As configurações de API para "${selectedEmpresaForSettings.nome}" foram atualizadas.`,
    });
    setIsSettingsDialogOpen(false);
  };
  
  const renderApiConfigFormFields = (form: any, fields: Array<keyof PlatformApiFormData>, platformName: 'wordpress' | 'instagram' | 'facebook') => {
    const fieldDetails: Record<string, { label: string, placeholder: string, type?: string, description?: string }> = {
      apiUrl: { label: "URL da API WordPress", placeholder: "https://seusite.com/wp-json", type: "url" },
      username: { label: "Nome de Usuário WordPress", placeholder: "admin", type: "text"},
      appPassword: { label: "Senha de Aplicativo WordPress", placeholder: "xxxx xxxx xxxx xxxx xxxx xxxx", type: "password", description: "Crie uma senha de aplicativo no seu perfil WordPress para maior segurança." },
      apiToken: { label: `${platformName.charAt(0).toUpperCase() + platformName.slice(1)} API Token`, placeholder: "Seu token de API", type: "password" },
    };

    return fields.map(fieldName => (
      <FormField
        key={fieldName}
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{fieldDetails[fieldName]?.label || fieldName}</FormLabel>
            <FormControl>
              <Input 
                placeholder={fieldDetails[fieldName]?.placeholder || ''} 
                type={fieldDetails[fieldName]?.type || 'text'} 
                {...field} 
              />
            </FormControl>
            {fieldDetails[fieldName]?.description && <FormDescription>{fieldDetails[fieldName]?.description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    ));
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
        <Form {...empresaMainForm}>
          <form onSubmit={empresaMainForm.handleSubmit(onSubmitEmpresa)}>
            <CardContent className="space-y-6">
              <FormField
                control={empresaMainForm.control}
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
                control={empresaMainForm.control}
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
                  empresaMainForm.reset({ nome: '', logoUrl: '' });
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
                  <Button variant="outline" size="sm" onClick={() => handleOpenSettingsDialog(empresa)}>
                    <Settings className="mr-1 h-4 w-4"/> Configurar APIs
                  </Button>
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
                        <AlertDialogTitleUi className="flex items-center">
                          <AlertTriangle className="mr-2 h-5 w-5 text-destructive"/> Excluir Empresa?
                        </AlertDialogTitleUi>
                        <AlertDialogDescUi>
                          Esta ação removerá permanentemente a empresa "{empresa.nome}".
                          Os funcionários atualmente associados a esta empresa ficarão 'Disponíveis' (sem empresa).
                          As configurações de API também serão perdidas. Deseja continuar?
                        </AlertDialogDescUi>
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

      {selectedEmpresaForSettings && (
        <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] md:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Configurar APIs para: {selectedEmpresaForSettings.nome}</DialogTitle>
              <DialogDescUi>
                Configure os detalhes de conexão para plataformas externas.
                 Lembre-se: Senhas e tokens são sensíveis, manuseie com cuidado.
              </DialogDescUi>
            </DialogHeader>
            <Alert variant="default" className="my-2 border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDesc className="text-blue-700 dark:text-blue-300">
                    A funcionalidade de envio direto para estas plataformas é um próximo passo e não está implementada nesta versão.
                    Esta tela serve apenas para armazenar as configurações.
                </AlertDesc>
            </Alert>
            <Tabs defaultValue="wordpress" className="w-full pt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="wordpress">WordPress</TabsTrigger>
                <TabsTrigger value="instagram">Instagram</TabsTrigger>
                <TabsTrigger value="facebook">Facebook</TabsTrigger>
              </TabsList>
              <TabsContent value="wordpress">
                <Form {...apiConfigWordPressForm}>
                  <form onSubmit={apiConfigWordPressForm.handleSubmit((data) => onSubmitApiConfigs('wordpress', data))} className="space-y-4 py-4">
                    {renderApiConfigFormFields(apiConfigWordPressForm, ['apiUrl', 'username', 'appPassword'], 'wordpress')}
                    <DialogFooter>
                      <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                      <Button type="submit">Salvar WordPress</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </TabsContent>
              <TabsContent value="instagram">
                 <Form {...apiConfigInstagramForm}>
                    <form onSubmit={apiConfigInstagramForm.handleSubmit((data) => onSubmitApiConfigs('instagram', data))} className="space-y-4 py-4">
                        {renderApiConfigFormFields(apiConfigInstagramForm, ['apiToken'], 'instagram')}
                        <DialogFooter>
                          <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                          <Button type="submit">Salvar Instagram</Button>
                        </DialogFooter>
                    </form>
                 </Form>
              </TabsContent>
              <TabsContent value="facebook">
                <Form {...apiConfigFacebookForm}>
                    <form onSubmit={apiConfigFacebookForm.handleSubmit((data) => onSubmitApiConfigs('facebook', data))} className="space-y-4 py-4">
                        {renderApiConfigFormFields(apiConfigFacebookForm, ['apiToken'], 'facebook')}
                        <DialogFooter>
                          <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                          <Button type="submit">Salvar Facebook</Button>
                        </DialogFooter>
                    </form>
                </Form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
