
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { ContentItem, Platform, AppSettings, ManualReferenceItem, SavedRefinementPrompt, Funcionario, Empresa } from '@/lib/types';
import { PLATFORM_OPTIONS, DEFAULT_OUTPUT_LANGUAGE, DEFAULT_NUMBER_OF_IMAGES, SETTINGS_STORAGE_KEY, REFINEMENT_PROMPTS_STORAGE_KEY, FUNCIONARIOS_STORAGE_KEY, ACTIVE_FUNCIONARIOS_STORAGE_KEY, EMPRESAS_STORAGE_KEY, ACTIVE_EMPRESA_ID_STORAGE_KEY, ALL_EMPRESAS_OR_VISAO_GERAL_VALUE } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label as UiLabel } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HtmlEditor } from './HtmlEditor';
import { useToast } from '@/hooks/use-toast';
import { generateContentForPlatform } from '@/ai/flows/generate-content-for-platform';
import { suggestHashtags as suggestHashtagsFlow } from '@/ai/flows/smart-hashtag-suggestions';
import { generateImage as generateImageFlow } from '@/ai/flows/generate-image-flow';
import {
  getStoredSettings,
  addContentItem,
  updateContentItem,
  getContentItemById,
  getSavedRefinementPrompts,
  addSavedRefinementPrompt,
  deleteSavedRefinementPromptById,
  getActiveFuncionarioForDepartamento,
  getEmpresaById,
} from '@/lib/storageService';
import { Loader2, Sparkles, Save, Tags, Image as ImageIconLucide, FileText, BookOpen, Bot, Wand2, Trash2, PlusCircle, Copy, Info, BrainCircuit, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription as AlertDesc } from '@/components/ui/alert';
import { useActiveEmpresa } from '@/hooks/useActiveEmpresa';
import Image from 'next/image';


const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  platform: z.enum(["Wordpress", "Instagram", "Facebook"]),
  topic: z.string().min(10, "Topic must be at least 10 characters."),
  wordCount: z.coerce.number().optional().describe("Approximate word count for the content."),
  numberOfImages: z.coerce.number().min(0).optional().describe("Desired number of images for WordPress content."),
});

type ContentFormData = z.infer<typeof formSchema>;

interface ContentFormClientProps {
  contentId?: string;
  initialTitle?: string;
  initialTopic?: string;
  initialManualReferenceTexts?: string[];
}

export function ContentFormClient({
  contentId,
  initialTitle,
  initialTopic,
  initialManualReferenceTexts,
}: ContentFormClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggestingHashtags, setIsSuggestingHashtags] = useState(false);

  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [imagePrompts, setImagePrompts] = useState<string[]>([]);
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);

  const [currentSettings, setCurrentSettings] = useState<AppSettings>(getStoredSettings());
  const [existingContent, setExistingContent] = useState<ContentItem | null>(null);
  const [originalPlatform, setOriginalPlatform] = useState<Platform | null>(null);

  const [manualReferencesForDisplay, setManualReferencesForDisplay] = useState<string[]>(initialManualReferenceTexts || []);

  const [generatingImageFor, setGeneratingImageFor] = useState<Record<number, boolean>>({});
  const [generatedImages, setGeneratedImages] = useState<Record<number, string | null>>({});

  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [refinementPromptText, setRefinementPromptText] = useState('');
  const [savedRefinementPrompts, setSavedRefinementPrompts] = useState<SavedRefinementPrompt[]>([]);
  const [currentRefinementPromptName, setCurrentRefinementPromptName] = useState('');
  const [isRefiningContent, setIsRefiningContent] = useState(false);
  
  const [activeContentCreationFuncionario, setActiveContentCreationFuncionario] = useState<Funcionario | null>(null);
  const [activeThemePlannerFuncionario, setActiveThemePlannerFuncionario] = useState<Funcionario | null>(null);
  
  const [activeEmpresaIdGlobal, _setActiveEmpresaIdGlobal] = useActiveEmpresa();
  const [currentActiveEmpresaDetails, setCurrentActiveEmpresaDetails] = useState<Empresa | null>(null);


  const form = useForm<ContentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      platform: 'Wordpress',
      topic: '',
      wordCount: undefined,
      numberOfImages: DEFAULT_NUMBER_OF_IMAGES,
    },
  });

  const platformFieldValue = form.watch('platform');

  const refreshSavedRefinementPrompts = useCallback(() => {
    setSavedRefinementPrompts(getSavedRefinementPrompts());
  }, []);

  const refreshActiveFuncionarios = useCallback(() => {
    setActiveContentCreationFuncionario(getActiveFuncionarioForDepartamento("ContentCreation", activeEmpresaIdGlobal));
    setActiveThemePlannerFuncionario(getActiveFuncionarioForDepartamento("ThemePlanner", activeEmpresaIdGlobal));
  }, [activeEmpresaIdGlobal]);
  
  const refreshEmpresaDetails = useCallback(() => {
     if (activeEmpresaIdGlobal && activeEmpresaIdGlobal !== ALL_EMPRESAS_OR_VISAO_GERAL_VALUE) {
      setCurrentActiveEmpresaDetails(getEmpresaById(activeEmpresaIdGlobal));
    } else {
      setCurrentActiveEmpresaDetails(null);
    }
  }, [activeEmpresaIdGlobal]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SETTINGS_STORAGE_KEY) {
        setCurrentSettings(getStoredSettings());
      }
      if (event.key === FUNCIONARIOS_STORAGE_KEY || event.key === ACTIVE_FUNCIONARIOS_STORAGE_KEY || event.key === ACTIVE_EMPRESA_ID_STORAGE_KEY) {
        refreshActiveFuncionarios();
      }
      if (event.key === REFINEMENT_PROMPTS_STORAGE_KEY) refreshSavedRefinementPrompts();
      if (event.key === EMPRESAS_STORAGE_KEY || event.key === ACTIVE_EMPRESA_ID_STORAGE_KEY) {
        refreshEmpresaDetails();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    setCurrentSettings(getStoredSettings());
    refreshActiveFuncionarios();
    refreshSavedRefinementPrompts();
    refreshEmpresaDetails();

    if (contentId) {
      const content = getContentItemById(contentId);
      if (content) {
        setExistingContent(content);
        setOriginalPlatform(content.platform);
        form.reset({
          title: content.title,
          platform: content.platform,
          topic: content.topic,
          wordCount: content.wordCount,
          numberOfImages: content.numberOfImagesRequested === undefined ? DEFAULT_NUMBER_OF_IMAGES : content.numberOfImagesRequested,
        });
        setGeneratedContent(content.content);
        setImagePrompts(content.imagePrompts);
        setSuggestedHashtags(content.hashtags || []);
        setManualReferencesForDisplay(content.manualReferencesUsed?.map(mr => mr.content) || []);
      } else {
        toast({ title: "Error", description: "Content not found.", variant: "destructive" });
        router.push('/');
      }
    } else {
      if (initialTitle) form.setValue('title', initialTitle);
      if (initialTopic) form.setValue('topic', initialTopic);
      if (!initialTitle && initialTopic && !form.getValues('title')) {
           form.setValue('title', `${form.getValues('platform')} post about ${initialTopic.substring(0,30)}...`);
      }
      setManualReferencesForDisplay(initialManualReferenceTexts || []);
    }
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [contentId, initialTitle, initialTopic, initialManualReferenceTexts, form, router, toast, refreshSavedRefinementPrompts, refreshActiveFuncionarios, refreshEmpresaDetails]);


  const handleGenerateOrRefineContent = async (isRefinement: boolean = false, refinementInstructionsFromModal?: string) => {
    const { platform, topic, wordCount, numberOfImages, title } = form.getValues();

    if (!isRefinement && !topic) {
      toast({ title: "Topic Required", description: "Please enter a topic to generate content.", variant: "destructive" });
      return;
    }
    if (isRefinement && !generatedContent) {
        toast({ title: "Original Content Missing", description: "Cannot refine without existing generated content.", variant: "destructive" });
        return;
    }
    if (isRefinement && !refinementInstructionsFromModal?.trim()) {
        toast({ title: "Refinement Instructions Required", description: "Please enter instructions for refinement.", variant: "destructive" });
        return;
    }

    if(isRefinement) setIsRefiningContent(true); else setIsLoadingAi(true);
    setGeneratedImages({});
    try {
      const result = await generateContentForPlatform({
        platform: platform as Platform,
        topic,
        title,
        wordCount: wordCount && wordCount > 0 ? wordCount : undefined,
        numberOfImages: platform === 'Wordpress' ? (numberOfImages === undefined ? DEFAULT_NUMBER_OF_IMAGES : numberOfImages) : undefined,
        outputLanguage: currentSettings.outputLanguage || DEFAULT_OUTPUT_LANGUAGE,
        manualReferenceTexts: manualReferencesForDisplay.length > 0 ? manualReferencesForDisplay : undefined,
        originalContent: isRefinement ? generatedContent : undefined,
        refinementInstructions: isRefinement ? refinementInstructionsFromModal : undefined,
        customInstructions: activeContentCreationFuncionario?.instrucoes,
      });
      setGeneratedContent(result.content);
      const prompts = result.imagePrompt ? result.imagePrompt.split('\n').filter(p => p.trim() !== '') : [];
      setImagePrompts(prompts);

      if (!form.getValues('title') && !isRefinement) {
        form.setValue('title', `${platform} post about ${topic.substring(0,30)}...`);
      }
      toast({ title: isRefinement ? "Content Refined!" : "Content Generated!", description: "AI has processed your request." });
    } catch (error) {
      console.error(`AI ${isRefinement ? "refinement" : "content generation"} error:`, error);
      toast({ title: "AI Error", description: `Failed to ${isRefinement ? "refine" : "generate"} content. Error: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    }
    if(isRefinement) setIsRefiningContent(false); else setIsLoadingAi(false);
    if(isRefinement) setIsRefineModalOpen(false);
  };

  const handleSuggestHashtags = async () => {
    if (!generatedContent) {
      toast({ title: "Content Required", description: "Generate or write content before suggesting hashtags.", variant: "destructive" });
      return;
    }
    
    setIsSuggestingHashtags(true);
    try {
      const result = await suggestHashtagsFlow({
        text: generatedContent,
        platform: platformFieldValue.toLowerCase() as 'instagram' | 'facebook' | 'general',
        customInstructions: activeThemePlannerFuncionario?.instrucoes,
      });
      setSuggestedHashtags(result.hashtags);
      toast({ title: "Hashtags Suggested!", description: "AI has suggested relevant hashtags." });
    } catch (error) {
      console.error("Hashtag suggestion error:", error);
      toast({ title: "AI Error", description: `Failed to suggest hashtags. Error: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    }
    setIsSuggestingHashtags(false);
  };

  const handleCopyText = (textToCopy: string, successMessage: string) => {
    if (!textToCopy) {
        toast({ title: "Nada para Copiar", description: "Não há texto para copiar.", variant: "destructive" });
        return;
    }
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            toast({ title: "Copiado!", description: successMessage });
        })
        .catch(err => {
            console.error("Falha ao copiar: ", err);
            toast({ title: "Falha ao Copiar", description: "Não foi possível copiar o texto.", variant: "destructive" });
        });
  };

  const handleGenerateImage = async (promptText: string, promptIndex: number) => {
    if (!promptText.trim()) {
      toast({ title: "Prompt Required", description: "Image prompt cannot be empty.", variant: "destructive" });
      return;
    }
    setGeneratingImageFor(prev => ({ ...prev, [promptIndex]: true }));
    setGeneratedImages(prev => ({ ...prev, [promptIndex]: null }));

    try {
      const result = await generateImageFlow({ prompt: promptText });
      setGeneratedImages(prev => ({ ...prev, [promptIndex]: result.imageDataUri }));
      toast({ title: "Image Generated!", description: "AI has generated an image for your prompt." });
    } catch (error) {
      console.error("AI image generation error:", error);
      toast({ title: "AI Image Error", description: `Failed to generate image. Error: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
      setGeneratedImages(prev => ({ ...prev, [promptIndex]: 'error' }));
    }
    setGeneratingImageFor(prev => ({ ...prev, [promptIndex]: false }));
  };

  const onSubmit: SubmitHandler<ContentFormData> = async (data) => {
    setIsSaving(true);

    const isPlatformChanged = existingContent && originalPlatform && data.platform !== originalPlatform;
    const currentContentId = existingContent && !isPlatformChanged ? existingContent.id : Date.now().toString();
    const currentCreatedAt = existingContent && !isPlatformChanged ? existingContent.createdAt : new Date().toISOString();
    const currentStatus = existingContent && !isPlatformChanged ? existingContent.status : 'Draft';

    const contentItemToSave: ContentItem = {
      id: currentContentId,
      title: data.title,
      platform: data.platform as Platform,
      topic: data.topic,
      content: generatedContent,
      imagePrompts: imagePrompts,
      wordCount: data.wordCount && data.wordCount > 0 ? data.wordCount : undefined,
      numberOfImagesRequested: data.platform === 'Wordpress' ? data.numberOfImages : undefined,
      hashtags: suggestedHashtags,
      status: currentStatus,
      createdAt: currentCreatedAt,
      updatedAt: new Date().toISOString(),
      manualReferencesUsed: manualReferencesForDisplay.length > 0 ? manualReferencesForDisplay.map(text => ({content: text})) : undefined,
      createdByFuncionarioId: activeContentCreationFuncionario?.id,
    };

    if (existingContent && !isPlatformChanged) {
      updateContentItem(contentItemToSave);
      toast({ title: "Content Updated", description: "Your content has been successfully updated." });
    } else {
      addContentItem(contentItemToSave);
      toast({ title: "New Content Saved", description: "Content has been saved as a new draft." });
    }

    setIsSaving(false);
    router.push('/');
  };

  const handleSaveRefinementPrompt = () => {
    if (!currentRefinementPromptName.trim()) {
      toast({ title: "Name Required", description: "Please provide a name for the refinement prompt.", variant: "destructive" });
      return;
    }
    if (!refinementPromptText.trim()) {
      toast({ title: "Prompt Required", description: "Please enter the refinement instructions to save.", variant: "destructive" });
      return;
    }
    const newPrompt: SavedRefinementPrompt = {
      id: Date.now().toString(),
      name: currentRefinementPromptName,
      promptText: refinementPromptText,
      createdAt: new Date().toISOString(),
    };
    addSavedRefinementPrompt(newPrompt);
    // refreshSavedRefinementPrompts will be called by storage event
    setCurrentRefinementPromptName('');
    toast({ title: "Refinement Prompt Saved!", description: `Prompt "${newPrompt.name}" has been saved.` });
  };

  const handleDeleteRefinementPrompt = (id: string) => {
    deleteSavedRefinementPromptById(id);
    // refreshSavedRefinementPrompts will be called by storage event
    toast({ title: "Refinement Prompt Deleted", description: "The saved prompt has been removed." });
  };

  const hasManualReferences = manualReferencesForDisplay.length > 0;
  const saveButtonText = existingContent && platformFieldValue === originalPlatform ? 'Update Content' : 'Save as New Draft';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
              <p className="text-sm text-primary-foreground/80">Criando conteúdo no contexto desta empresa.</p>
            </div>
          </CardHeader>
        </Card>
      )}
        <Card>
          <CardHeader>
            <CardTitle>{contentId ? 'Edit Content' : 'Create New Content'}</CardTitle>
            <CardDescription>Fill in the details below and let AI assist you in crafting perfect posts.</CardDescription>
             <Alert variant="default" className="mt-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 text-xs py-2">
                <BrainCircuit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDesc className="text-blue-700 dark:text-blue-300">
                  {activeContentCreationFuncionario?.nome
                    ? <>Geração de conteúdo usará instruções de: <span className="font-semibold">{activeContentCreationFuncionario.nome}</span>.</>
                    : "Nenhum funcionário personalizado ativo para Criação de Conteúdo. Usando prompt padrão do sistema."}
                  {" (Configurado em Treinamento)"}
                </AlertDesc>
              </Alert>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a title for your content" {...field} suppressHydrationWarning={true} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (existingContent && value !== originalPlatform) {
                          setGeneratedContent('');
                          setImagePrompts([]);
                          setSuggestedHashtags([]);
                          setGeneratedImages({});
                        }
                      }}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {platformFieldValue === 'Wordpress' && (
                <FormField
                  control={form.control}
                  name="numberOfImages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Imagens (WordPress)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                           placeholder={`Padrão: ${DEFAULT_NUMBER_OF_IMAGES}`}
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseInt(val, 10));
                          }}
                          suppressHydrationWarning={true}
                        />
                      </FormControl>
                       <FormDescription>0 para um prompt geral, &gt;0 para imagens embutidas.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic / Main Idea / Brief</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the main topic, idea, or paste the brief for the AI to generate content on..." {...field} rows={4} suppressHydrationWarning={true}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wordCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><FileText className="mr-2 h-4 w-4 text-muted-foreground" />Approximate Word Count (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 500"
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => {
                        const textValue = e.target.value;
                        field.onChange(textValue === '' ? undefined : parseInt(textValue, 10));
                      }}
                      suppressHydrationWarning={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {hasManualReferences && (
              <Accordion type="single" collapsible className="w-full" defaultValue="manual-reference-materials-accordion">
                <AccordionItem value="manual-reference-materials-accordion">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <BookOpen className="mr-2 h-5 w-5 text-primary" />
                       Manual Reference Materials Used for Generation
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    {manualReferencesForDisplay.length > 0 && (
                        <div>
                        <h4 className="font-semibold text-sm mb-1 mt-2">Manual Notes/References:</h4>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            {manualReferencesForDisplay.map((text, index) => (
                            <li key={`manual-ref-display-${index}`} className="text-xs text-muted-foreground italic whitespace-pre-wrap">
                                {text.length > 200 ? `${text.substring(0, 200)}...` : text}
                            </li>
                            ))}
                        </ul>
                        </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <Button type="button" onClick={() => handleGenerateOrRefineContent(false)} disabled={isLoadingAi || isRefiningContent} className="w-full md:w-auto">
              {isLoadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Content with AI
            </Button>
          </CardContent>
        </Card>

        {generatedContent && (
          <Card className="flex flex-col flex-grow min-h-[400px]">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Generated Content</CardTitle>
              {platformFieldValue !== 'Wordpress' && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCopyText(generatedContent, "Conteúdo gerado copiado!");
                    }}
                    disabled={!generatedContent}
                >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Conteúdo
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
              {platformFieldValue === 'Wordpress' ? (
                <HtmlEditor initialHtml={generatedContent} onHtmlChange={setGeneratedContent} className="flex-grow" />
              ) : (
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  placeholder="Generated content will appear here..."
                  className="flex-grow resize-none"
                  suppressHydrationWarning={true}
                />
              )}
            </CardContent>
            <CardFooter className="flex justify-start">
                 <Dialog open={isRefineModalOpen} onOpenChange={setIsRefineModalOpen}>
                    <DialogTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!generatedContent || isLoadingAi || isRefiningContent}
                            onClick={() => { setIsRefineModalOpen(true); setRefinementPromptText(''); setCurrentRefinementPromptName('');}}
                        >
                            <Wand2 className="mr-2 h-4 w-4" />
                            Refine Content with AI
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px]">
                        <DialogHeader>
                        <DialogTitle>Refine Generated Content</DialogTitle>
                        <DialogDescription>
                            Provide instructions to refine the current content. You can also save and reuse refinement prompts.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                            <div className="grid gap-2">
                                <UiLabel htmlFor="refinement-prompt-text">Refinement Instructions</UiLabel>
                                <Textarea
                                id="refinement-prompt-text"
                                placeholder="e.g., Make the tone more formal, Add a section about X, Shorten the introduction..."
                                value={refinementPromptText}
                                onChange={(e) => setRefinementPromptText(e.target.value)}
                                rows={5}
                                suppressHydrationWarning={true}
                                />
                            </div>
                            <div className="grid gap-2">
                                <UiLabel htmlFor="load-saved-prompt">Load Saved Prompt</UiLabel>
                                <Select
                                onValueChange={(value) => {
                                    const selected = savedRefinementPrompts.find(p => p.id === value);
                                    if (selected) {
                                      setRefinementPromptText(selected.promptText);
                                    }
                                }}
                                >
                                <SelectTrigger id="load-saved-prompt">
                                    <SelectValue placeholder="Select a saved prompt..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {savedRefinementPrompts.length === 0 && <SelectItem value="-" disabled>No saved prompts</SelectItem>}
                                    {savedRefinementPrompts.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            </div>
                            <div className="border-t pt-4 mt-2 space-y-3">
                                <h4 className="text-sm font-medium">Save Current Instructions</h4>
                                <div className="grid md:grid-cols-3 items-center gap-2 md:gap-4">
                                  <UiLabel htmlFor="new-prompt-name" className="md:col-span-1">Prompt Name</UiLabel>
                                  <Input
                                      id="new-prompt-name"
                                      className="md:col-span-2 h-9"
                                      value={currentRefinementPromptName}
                                      onChange={(e) => setCurrentRefinementPromptName(e.target.value)}
                                      placeholder="e.g., Formal Tone Adjuster"
                                      suppressHydrationWarning={true}
                                  />
                                </div>
                                <Button type="button" size="sm" variant="outline" onClick={handleSaveRefinementPrompt} disabled={!currentRefinementPromptName.trim() || !refinementPromptText.trim()}>
                                    <Save className="mr-2 h-3 w-3" /> Save Instructions
                                </Button>
                            </div>
                            {savedRefinementPrompts.length > 0 && (
                                <div className="border-t pt-4 mt-2 space-y-2">
                                    <h4 className="text-sm font-medium">Manage Saved Prompts</h4>
                                    <ScrollArea className="h-[150px] rounded-md border p-2">
                                        <ul className="space-y-1">
                                            {savedRefinementPrompts.map(p => (
                                            <li key={p.id} className="flex justify-between items-center p-1 text-xs hover:bg-muted rounded">
                                                <span className="truncate flex-1 mr-2" title={p.name}>{p.name}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleDeleteRefinementPrompt(p.id)}>
                                                    <Trash2 className="h-3 w-3 text-destructive"/>
                                                </Button>
                                            </li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            type="button"
                            onClick={() => handleGenerateOrRefineContent(true, refinementPromptText)}
                            disabled={isRefiningContent || isLoadingAi || !refinementPromptText.trim()}
                        >
                            {isRefiningContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Apply Refinement
                        </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardFooter>
          </Card>
        )}

        {imagePrompts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><ImageIconLucide className="mr-2 h-5 w-5" /> Image Prompts & Generation</CardTitle>
              <CardDescription>Use these prompts to generate images for your content. You can edit them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {imagePrompts.map((prompt, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-md shadow-sm">
                  <UiLabel htmlFor={`image-prompt-${index}`}>Prompt {index + 1}</UiLabel>
                  <Textarea
                    id={`image-prompt-${index}`}
                    value={prompt}
                    onChange={(e) => {
                      const newPrompts = [...imagePrompts];
                      newPrompts[index] = e.target.value;
                      setImagePrompts(newPrompts);
                    }}
                    rows={2}
                    suppressHydrationWarning={true}
                  />
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleGenerateImage(prompt, index);
                      }}
                      disabled={generatingImageFor[index] || !prompt.trim()}
                    >
                      {generatingImageFor[index] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                      Gerar Imagem
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCopyText(prompt, "Prompt copiado para a área de transferência!");
                      }}
                      disabled={!prompt.trim()}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar Prompt
                    </Button>
                  </div>
                  {generatingImageFor[index] && <p className="text-xs text-muted-foreground">Gerando imagem, aguarde...</p>}
                  {generatedImages[index] && generatedImages[index] !== 'error' && (
                    <div className="mt-2 space-y-2">
                      <img
                        src={generatedImages[index]!}
                        alt={`Generated for prompt: ${prompt.substring(0, 50)}...`}
                        className="rounded-md border max-w-xs max-h-xs object-contain"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCopyText(generatedImages[index]!, "Data URI da imagem copiado!");
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar Imagem (Data URI)
                      </Button>
                    </div>
                  )}
                  {generatedImages[index] === 'error' && <p className="text-xs text-destructive">Falha ao gerar imagem.</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {(platformFieldValue === 'Instagram' || platformFieldValue === 'Facebook') && generatedContent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Tags className="mr-2 h-5 w-5" /> Hashtags</CardTitle>
                 <Alert variant="default" className="mt-2 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700 text-xs py-2">
                    <BrainCircuit className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <AlertDesc className="text-indigo-700 dark:text-indigo-300">
                    {activeThemePlannerFuncionario?.nome
                        ? <>Sugestões de Hashtag usarão instruções de: <span className="font-semibold">{activeThemePlannerFuncionario.nome}</span>.</>
                        : "Nenhum funcionário personalizado ativo para Planejador de Temas. Hashtags usarão prompt padrão."}
                    {" (Configurado em Treinamento)"}
                    </AlertDesc>
                </Alert>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="outline" onClick={handleSuggestHashtags} disabled={isSuggestingHashtags || !generatedContent}>
                  {isSuggestingHashtags ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Suggest Hashtags
                </Button>
                {suggestedHashtags.length > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleCopyText(suggestedHashtags.map(h => `#${h}`).join(' '), "Hashtags copiadas!")}
                    >
                        <Copy className="mr-2 h-4 w-4" /> Copiar Hashtags
                    </Button>
                )}
              </div>
              {suggestedHashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestedHashtags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-sm p-2">#{tag}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <CardFooter className="flex justify-end sticky bottom-0 bg-background py-4 border-t z-10">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saveButtonText}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}
