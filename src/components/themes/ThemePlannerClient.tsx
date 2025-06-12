
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppSettings, ThemeSuggestion, ManualReferenceItem, Funcionario } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { suggestThemes } from '@/ai/flows/proactive-theme-planning';
import { suggestHashtags } from '@/ai/flows/smart-hashtag-suggestions';
import {
  getStoredSettings,
  addThemeSuggestion,
  getStoredThemeSuggestions,
  deleteThemeSuggestionById,
  addManualReferenceToTheme,
  deleteManualReferenceFromTheme,
  updateThemeWithSuggestedKeywords,
  deleteKeywordFromTheme,
  getActiveFuncionarioForDepartamento,
} from '@/lib/storageService';
import { Loader2, Sparkles, Lightbulb, PlusCircle, Trash2, AlertTriangle, FileText, Tags, XIcon, Info } from 'lucide-react';
import { THEMES_STORAGE_KEY, SETTINGS_STORAGE_KEY, DEFAULT_OUTPUT_LANGUAGE, FUNCIONARIOS_STORAGE_KEY, ACTIVE_FUNCIONARIOS_STORAGE_KEY } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import { Label as UiLabel } from "@/components/ui/label";
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
import { ActiveFuncionarioSelector } from '@/components/common/ActiveFuncionarioSelector';


const themePlannerSchema = z.object({
  topic: z.string().min(5, "Topic must be at least 5 characters."),
  numSuggestions: z.coerce.number().min(1).max(10).default(5),
});

type ThemePlannerFormData = z.infer<typeof themePlannerSchema>;

interface AddManualRefFormData {
  title: string;
  content: string;
}

const addManualRefSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(10, "Reference content must be at least 10 characters."),
});


export function ThemePlannerClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoadingThemes, setIsLoadingThemes] = useState(false);
  const [generatedThemesList, setGeneratedThemesList] = useState<Omit<ThemeSuggestion, 'id' | 'generatedAt' | 'userInputTopic' | 'manualReferences'| 'suggestedKeywords'>[]>([]);

  const [currentSettings, setCurrentSettings] = useState<AppSettings>(getStoredSettings());
  const [storedThemeSuggestions, setStoredThemeSuggestions] = useState<ThemeSuggestion[]>([]);
  const [currentUserInputTopic, setCurrentUserInputTopic] = useState<string>("");

  const [selectedManualReferences, setSelectedManualReferences] = useState<Record<string, Record<string, boolean>>>({});
  const [currentThemeForManualRef, setCurrentThemeForManualRef] = useState<ThemeSuggestion | null>(null);

  const [isLoadingSuggestedKeywords, setIsLoadingSuggestedKeywords] = useState<string | null>(null);

  // No longer need themePlannerFuncionario state, ActiveFuncionarioSelector handles display
  // const [themePlannerFuncionario, setThemePlannerFuncionario] = useState<Funcionario | null>(null);

  const manualRefForm = useForm<AddManualRefFormData>({
    resolver: zodResolver(addManualRefSchema),
    defaultValues: { title: "", content: "" },
  });


  const refreshStoredThemes = useCallback(() => {
    setStoredThemeSuggestions(getStoredThemeSuggestions());
  }, []);

  const refreshSettingsAndActiveFuncionarios = useCallback(() => {
    setCurrentSettings(getStoredSettings());
    // setThemePlannerFuncionario(getActiveFuncionarioForDepartamento("ThemePlanner") || null); // Handled by ActiveFuncionarioSelector
  }, []);

  useEffect(() => {
    refreshSettingsAndActiveFuncionarios();
    refreshStoredThemes();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEMES_STORAGE_KEY) refreshStoredThemes();
      if (event.key === SETTINGS_STORAGE_KEY ||
          event.key === FUNCIONARIOS_STORAGE_KEY ||
          event.key === ACTIVE_FUNCIONARIOS_STORAGE_KEY
          ) {
        refreshSettingsAndActiveFuncionarios();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshStoredThemes, refreshSettingsAndActiveFuncionarios]);

  const form = useForm<ThemePlannerFormData>({
    resolver: zodResolver(themePlannerSchema),
    defaultValues: { topic: '', numSuggestions: 5 },
  });

  const onThemeSuggestSubmit: SubmitHandler<ThemePlannerFormData> = async (data) => {
    setIsLoadingThemes(true);
    setCurrentUserInputTopic(data.topic);
    const activeThemePlannerFuncionario = getActiveFuncionarioForDepartamento("ThemePlanner");
    try {
      const result = await suggestThemes({
        topic: data.topic,
        numSuggestions: data.numSuggestions,
        outputLanguage: currentSettings.outputLanguage || DEFAULT_OUTPUT_LANGUAGE,
        customInstructions: activeThemePlannerFuncionario?.instrucoes,
      });
      setGeneratedThemesList(result.themes);
      toast({ title: "Themes Suggested!", description: "AI has generated theme ideas for your topic." });
    } catch (error) {
      console.error("Theme suggestion error:", error);
      toast({ title: "AI Error", description: `Failed to suggest themes. Error: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
      setGeneratedThemesList([]);
    }
    setIsLoadingThemes(false);
  };

  const handleSaveTheme = (theme: Omit<ThemeSuggestion, 'id' | 'generatedAt' | 'userInputTopic' | 'manualReferences'| 'suggestedKeywords'>) => {
    const newSuggestion: ThemeSuggestion = {
      id: Date.now().toString(),
      userInputTopic: currentUserInputTopic,
      title: theme.title,
      description: theme.description,
      keywords: theme.keywords,
      suggestedKeywords: [],
      generatedAt: new Date().toISOString(),
      manualReferences: [],
    };
    addThemeSuggestion(newSuggestion);
    refreshStoredThemes();
    toast({ title: "Theme Saved!", description: `Theme "${theme.title}" has been saved.` });
  };

  const handleDeleteTheme = useCallback((id: string) => {
    deleteThemeSuggestionById(id);
    refreshStoredThemes();
    toast({ title: "Theme Deleted", description: "The theme idea has been removed." });
  }, [refreshStoredThemes, toast]);


  const handleOpenManualRefModal = (theme: ThemeSuggestion) => {
    setCurrentThemeForManualRef(theme);
    manualRefForm.reset({ title: "", content: ""});
  };

  const onAddManualRefSubmit: SubmitHandler<AddManualRefFormData> = async (data) => {
    if (!currentThemeForManualRef) return;

    const newManualRef: ManualReferenceItem = {
      id: Date.now().toString(),
      title: data.title || undefined,
      content: data.content,
      createdAt: new Date().toISOString(),
    };
    addManualReferenceToTheme(currentThemeForManualRef.id, newManualRef);
    refreshStoredThemes();
    toast({ title: "Manual Reference Added", description: "Your reference has been saved."});
    manualRefForm.reset({ title: "", content: ""});
    const closeButton = document.getElementById(`dialog-close-manual-ref-${currentThemeForManualRef.id}`);
    closeButton?.click();
    setCurrentThemeForManualRef(null);
  };

  const handleDeleteManualRef = useCallback((themeId: string, refId: string) => {
    deleteManualReferenceFromTheme(themeId, refId);
    setSelectedManualReferences(prev => {
        const newThemeSelection = { ...(prev[themeId] || {}) };
        delete newThemeSelection[refId];
        return { ...prev, [themeId]: newThemeSelection };
    });
    refreshStoredThemes();
    toast({ title: "Manual Reference Deleted", description: "The manual reference has been removed." });
  }, [refreshStoredThemes, toast]);

  const toggleManualReferenceSelection = (themeId: string, refId: string) => {
    setSelectedManualReferences(prev => {
      const newThemeSelection = { ...(prev[themeId] || {}) };
      newThemeSelection[refId] = !newThemeSelection[refId];
      return { ...prev, [themeId]: newThemeSelection };
    });
  };

  const handleSuggestKeywordsForTheme = async (theme: ThemeSuggestion) => {
    setIsLoadingSuggestedKeywords(theme.id);
    const activeThemePlannerFuncionario = getActiveFuncionarioForDepartamento("ThemePlanner");
    try {
      const result = await suggestHashtags({
        text: `${theme.title} ${theme.description}`,
        platform: 'general',
        customInstructions: activeThemePlannerFuncionario?.instrucoes,
      });
      const processedKeywords = result.hashtags.map(kw => kw.startsWith('#') ? kw.substring(1) : kw);
      updateThemeWithSuggestedKeywords(theme.id, processedKeywords);
      refreshStoredThemes();
      toast({ title: "Keywords Suggested!", description: "AI has suggested and saved additional keywords/search terms." });
    } catch (error) {
      console.error("Keyword suggestion error:", error);
      toast({ title: "AI Error", description: `Failed to suggest keywords. Error: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    }
    setIsLoadingSuggestedKeywords(null);
  };

  const handleDeleteSuggestedKeyword = useCallback((themeId: string, keywordToDelete: string) => {
    deleteKeywordFromTheme(themeId, keywordToDelete);
    refreshStoredThemes();
    toast({ title: "Keyword Deleted", description: `Keyword "${keywordToDelete}" has been removed.`});
  }, [refreshStoredThemes, toast]);


  const handleCreateContentFromTheme = (theme: ThemeSuggestion) => {
    const selectedManualRefsContents = (theme.manualReferences || [])
      .filter(ref => selectedManualReferences[theme.id]?.[ref.id])
      .map(ref => ref.content);

    const queryParams = new URLSearchParams();
    queryParams.append('title', theme.title);
    queryParams.append('topic', theme.description);

    if (selectedManualRefsContents.length > 0) {
      queryParams.append('manualRefs', JSON.stringify(selectedManualRefsContents));
    }

    router.push(`/content/new?${queryParams.toString()}`);
  };


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Proactive Theme Planner</CardTitle>
          <CardDescription>Let AI help you brainstorm content themes. Enter a general topic and get suggestions for titles, descriptions, and keywords.</CardDescription>
           <ActiveFuncionarioSelector departamento="ThemePlanner" className="mt-4" />
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onThemeSuggestSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="topic-theme">General Topic</FormLabel>
                    <FormControl>
                      <Input id="topic-theme" placeholder="e.g., Sustainable Living, Digital Marketing Trends" {...field} suppressHydrationWarning={true}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numSuggestions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="numSuggestions">Number of Suggestions (1-10)</FormLabel>
                    <FormControl>
                      <Input id="numSuggestions" type="number" min="1" max="10" {...field} suppressHydrationWarning={true}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoadingThemes}>
                {isLoadingThemes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Suggest Themes
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {generatedThemesList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suggested Themes for "{currentUserInputTopic}"</CardTitle>
            <CardDescription>Review the AI-generated ideas. Save the ones you like or use them to create content.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {generatedThemesList.map((theme, index) => (
                <li key={index} className="p-4 border rounded-md bg-muted/30 shadow-sm">
                  <div className="flex items-start mb-2">
                    <Lightbulb className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-md">{theme.title}</h3>
                      <p className="text-sm text-muted-foreground">{theme.description}</p>
                      {theme.keywords && theme.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs font-medium mr-1">Keywords:</span>
                          {theme.keywords.map(kw => <Badge variant="secondary" key={kw} className="text-xs">{kw}</Badge>)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => handleSaveTheme(theme)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Save Idea
                    </Button>
                     <Button variant="default" size="sm" onClick={() => router.push(`/content/new?title=${encodeURIComponent(theme.title)}&topic=${encodeURIComponent(theme.description)}`)}>
                       <Sparkles className="mr-2 h-4 w-4" /> Create Content
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {storedThemeSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Theme Ideas</CardTitle>
            <CardDescription>Manage your saved themes, add manual notes, get keyword ideas, and create content. Active Funcionario for Theme Planning and Keyword Suggestions is managed above.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {storedThemeSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="p-4 shadow-md">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 mr-2">
                    <h4 className="font-semibold text-lg">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">{suggestion.description}</p>
                    {suggestion.keywords && suggestion.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 items-center">
                          <span className="text-xs font-medium mr-1 text-muted-foreground">Initial Keywords:</span>
                          {suggestion.keywords.map(kw => <Badge variant="outline" key={kw} className="text-xs">{kw}</Badge>)}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Original topic: "{suggestion.userInputTopic}" (Saved: {new Date(suggestion.generatedAt).toLocaleDateString()})</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                     <Button variant="default" size="sm" onClick={() => handleCreateContentFromTheme(suggestion)}>
                       <Sparkles className="mr-1 h-4 w-4" /> Create Content
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete theme {suggestion.title}</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                           <AlertDialogTitle className="flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5 text-destructive"/> Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the theme idea titled "{suggestion.title}" and all its associated manual notes and suggested keywords.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTheme(suggestion.id)} className="bg-destructive hover:bg-destructive/90">
                            Yes, delete theme
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="my-4 p-3 border-t border-dashed">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-md font-semibold flex items-center"><Tags className="mr-2 h-5 w-5 text-primary"/>AI Keyword/Search Term Ideas</h5>
                    <Button variant="outline" size="sm" onClick={() => handleSuggestKeywordsForTheme(suggestion)} disabled={isLoadingSuggestedKeywords === suggestion.id}>
                      {isLoadingSuggestedKeywords === suggestion.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />} Suggest Terms
                    </Button>
                  </div>
                  {suggestion.suggestedKeywords && suggestion.suggestedKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {suggestion.suggestedKeywords.map((keyword, index) => (
                        <Badge key={`${keyword}-${index}`} variant="secondary" className="relative group pr-7">
                          {keyword}
                          <button
                            onClick={() => handleDeleteSuggestedKeyword(suggestion.id, keyword)}
                            className="absolute top-1/2 right-1 transform -translate-y-1/2 p-0.5 rounded-full hover:bg-muted-foreground/20 opacity-50 group-hover:opacity-100 transition-opacity"
                            aria-label={`Delete keyword ${keyword}`}
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    isLoadingSuggestedKeywords !== suggestion.id && <p className="text-xs text-muted-foreground">No additional keywords suggested yet for this theme. Click the button to generate some.</p>
                  )}
                  {isLoadingSuggestedKeywords === suggestion.id && <p className="text-xs text-muted-foreground flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Generating keywords...</p>}
                </div>

                <div className="my-4 p-3 border-t border-dashed">
                   <div className="flex justify-between items-center mb-2">
                    <h5 className="text-md font-semibold flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Manual Notes/References</h5>
                    <Dialog onOpenChange={(isOpen) => { if (!isOpen) { setCurrentThemeForManualRef(null); manualRefForm.reset(); } }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleOpenManualRefModal(suggestion)}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Note
                        </Button>
                      </DialogTrigger>
                      {currentThemeForManualRef?.id === suggestion.id && ( // Ensure modal content only renders for the correct theme
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Manual Note for "{currentThemeForManualRef.title}"</DialogTitle>
                            <DialogDescription>Enter a title (optional) and your reference content.</DialogDescription>
                          </DialogHeader>
                          <Form {...manualRefForm}>
                            <form onSubmit={manualRefForm.handleSubmit(onAddManualRefSubmit)} className="space-y-4">
                              <FormField
                                control={manualRefForm.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel htmlFor={`manualRefTitle-${suggestion.id}`}>Title (Optional)</FormLabel>
                                    <FormControl><Input id={`manualRefTitle-${suggestion.id}`} {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={manualRefForm.control}
                                name="content"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel htmlFor={`manualRefContent-${suggestion.id}`}>Content</FormLabel>
                                    <FormControl><Textarea id={`manualRefContent-${suggestion.id}`} {...field} rows={5} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                 <DialogClose asChild id={`dialog-close-manual-ref-${suggestion.id}`}><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                <Button type="submit">Save Note</Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      )}
                    </Dialog>
                  </div>
                   {suggestion.manualReferences && suggestion.manualReferences.length > 0 ? (
                    <ul className="space-y-3">
                      {suggestion.manualReferences.map(ref => (
                        <li key={ref.id} className="p-3 border rounded-md bg-background">
                          <div className="flex items-center mb-1">
                            <Checkbox
                                id={`manual-${suggestion.id}-${ref.id}`}
                                checked={!!selectedManualReferences[suggestion.id]?.[ref.id]}
                                onCheckedChange={() => toggleManualReferenceSelection(suggestion.id, ref.id)}
                                className="mr-3"
                            />
                            <UiLabel htmlFor={`manual-${suggestion.id}-${ref.id}`} className="flex-1 cursor-pointer">
                                {ref.title && <h6 className="font-medium text-sm">{ref.title}</h6>}
                            </UiLabel>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Manual Note?</AlertDialogTitle>
                                  <AlertDialogDescription>Permanently delete this manual note{ref.title ? ` "${ref.title}"` : ''}?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteManualRef(suggestion.id, ref.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          <p className={`text-xs text-muted-foreground pl-7 ${ref.title ? '' : 'pt-1'}`}>{ref.content}</p>
                          <p className="text-xs text-muted-foreground pl-7 mt-1">Added: {new Date(ref.createdAt).toLocaleDateString()}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                     <p className="text-xs text-muted-foreground">No manual notes added yet for this theme.</p>
                  )}
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
