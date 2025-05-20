"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppSettings, ThemeSuggestion, ResearchLinkItem, ManualReferenceItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { suggestThemes } from '@/ai/flows/proactive-theme-planning';
import { findResearchLinks } from '@/ai/flows/find-research-links';
import { 
  getStoredSettings, 
  addThemeSuggestion, 
  getStoredThemeSuggestions, 
  deleteThemeSuggestionById,
  updateThemeSuggestionWithLinks,
  deleteResearchLinkFromTheme,
  addManualReferenceToTheme,
  deleteManualReferenceFromTheme,
} from '@/lib/storageService';
import { Loader2, Sparkles, Lightbulb, PlusCircle, Trash2, AlertTriangle, Search, Link as LinkIcon, ExternalLink, FileText, CheckSquare, Square, MessageSquare } from 'lucide-react';
import { THEMES_STORAGE_KEY, SETTINGS_STORAGE_KEY, DEFAULT_OUTPUT_LANGUAGE } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import { Label as UiLabel } from "@/components/ui/label"; // Renamed to avoid conflict
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


const themePlannerSchema = z.object({
  topic: z.string().min(5, "Topic must be at least 5 characters."),
  numSuggestions: z.coerce.number().min(1).max(10).default(5),
});

type ThemePlannerFormData = z.infer<typeof themePlannerSchema>;

interface FindLinksFormData {
  numLinks: number;
}

const findLinksSchema = z.object({
  numLinks: z.coerce.number().min(1).max(5).default(3),
});

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
  const [isLoadingLinks, setIsLoadingLinks] = useState<string | null>(null); // Store themeId being processed
  const [generatedThemesList, setGeneratedThemesList] = useState<Omit<ThemeSuggestion, 'id' | 'generatedAt' | 'userInputTopic' | 'researchLinks' | 'manualReferences'>[]>([]);
  
  const [currentSettings, setCurrentSettings] = useState<AppSettings | null>(null);
  const [storedThemeSuggestions, setStoredThemeSuggestions] = useState<ThemeSuggestion[]>([]);
  const [currentUserInputTopic, setCurrentUserInputTopic] = useState<string>("");

  // State for managing selected research items for each theme
  const [selectedResearchItems, setSelectedResearchItems] = useState<Record<string, Record<string, boolean>>>({});
  // State for managing selected manual references for each theme
  const [selectedManualReferences, setSelectedManualReferences] = useState<Record<string, Record<string, boolean>>>({});


  const [currentThemeForLinks, setCurrentThemeForLinks] = useState<ThemeSuggestion | null>(null);
  const [currentThemeForManualRef, setCurrentThemeForManualRef] = useState<ThemeSuggestion | null>(null);


  const findLinksForm = useForm<FindLinksFormData>({
    resolver: zodResolver(findLinksSchema),
    defaultValues: { numLinks: 3 },
  });

  const manualRefForm = useForm<AddManualRefFormData>({
    resolver: zodResolver(addManualRefSchema),
    defaultValues: { title: "", content: "" },
  });


  const refreshStoredThemes = useCallback(() => {
    setStoredThemeSuggestions(getStoredThemeSuggestions());
  }, []);

  const refreshSettings = useCallback(() => {
    setCurrentSettings(getStoredSettings());
  }, []);

  useEffect(() => {
    refreshSettings();
    refreshStoredThemes();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEMES_STORAGE_KEY) refreshStoredThemes();
      if (event.key === SETTINGS_STORAGE_KEY) refreshSettings();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshStoredThemes, refreshSettings]);

  const form = useForm<ThemePlannerFormData>({
    resolver: zodResolver(themePlannerSchema),
    defaultValues: { topic: '', numSuggestions: 5 },
  });

  const onThemeSuggestSubmit: SubmitHandler<ThemePlannerFormData> = async (data) => {
    const freshSettings = getStoredSettings();
    if (!freshSettings?.openAIKey) {
      toast({ title: "API Key Missing", description: "Please configure your OpenAI API key in Settings.", variant: "destructive" });
      return;
    }
    setCurrentSettings(freshSettings);
    setIsLoadingThemes(true);
    setCurrentUserInputTopic(data.topic);
    try {
      const result = await suggestThemes({
        topic: data.topic,
        numSuggestions: data.numSuggestions,
        outputLanguage: freshSettings.outputLanguage || DEFAULT_OUTPUT_LANGUAGE,
      });
      setGeneratedThemesList(result.themes);
      toast({ title: "Themes Suggested!", description: "AI has generated theme ideas for your topic." });
    } catch (error) {
      console.error("Theme suggestion error:", error);
      toast({ title: "AI Error", description: "Failed to suggest themes. Check console for details.", variant: "destructive" });
      setGeneratedThemesList([]);
    }
    setIsLoadingThemes(false);
  };

  const handleSaveTheme = (theme: Omit<ThemeSuggestion, 'id' | 'generatedAt' | 'userInputTopic' | 'researchLinks' | 'manualReferences'>) => {
    const newSuggestion: ThemeSuggestion = {
      id: Date.now().toString(),
      userInputTopic: currentUserInputTopic,
      title: theme.title,
      description: theme.description,
      keywords: theme.keywords,
      generatedAt: new Date().toISOString(),
      researchLinks: [],
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
  }, [toast, refreshStoredThemes]);

  const handleOpenFindLinksModal = (theme: ThemeSuggestion) => {
    setCurrentThemeForLinks(theme);
    findLinksForm.reset({ numLinks: 3 }); // Reset form for next use
  };

  const onFindLinksSubmit: SubmitHandler<FindLinksFormData> = async (data) => {
    if (!currentThemeForLinks) return;
    const freshSettings = getStoredSettings();
     if (!freshSettings?.openAIKey) {
      toast({ title: "API Key Missing", description: "Please configure your OpenAI API key in Settings.", variant: "destructive" });
      return;
    }
    
    setIsLoadingLinks(currentThemeForLinks.id);
    try {
      const result = await findResearchLinks({
        topic: currentThemeForLinks.title + " " + currentThemeForLinks.description,
        numLinks: data.numLinks,
        outputLanguage: freshSettings.outputLanguage || DEFAULT_OUTPUT_LANGUAGE,
        perplexityApiKey: freshSettings.perplexityApiKey || undefined,
      });
      
      const linksWithClientIds: ResearchLinkItem[] = result.links.map(link => ({
        ...link,
        id: link.url + '_' + Date.now().toString(), // Simple client-side ID
      }));

      updateThemeSuggestionWithLinks(currentThemeForLinks.id, linksWithClientIds);
      refreshStoredThemes();
      toast({ title: "Research Links Found!", description: `Found ${linksWithClientIds.length} links for "${currentThemeForLinks.title}".` });
    } catch (error: any) {
      console.error("Find research links error:", error);
      toast({ title: "AI Error", description: `Failed to find research links: ${error.message || "Check console."}`, variant: "destructive", duration: 7000 });
    }
    setIsLoadingLinks(null);
    setCurrentThemeForLinks(null); // Close dialog by resetting current theme
  };

  const handleDeleteResearchLink = useCallback((themeId: string, researchLinkId: string) => {
    deleteResearchLinkFromTheme(themeId, researchLinkId);
    refreshStoredThemes();
    // Also remove from selection state if it was selected
    setSelectedResearchItems(prev => {
      const newThemeSelection = { ...(prev[themeId] || {}) };
      delete newThemeSelection[researchLinkId];
      return { ...prev, [themeId]: newThemeSelection };
    });
    toast({ title: "Research Link Deleted", description: "The research link has been removed." });
  }, [refreshStoredThemes]);

  // Toggle selection for a research item
  const toggleResearchItemSelection = (themeId: string, researchItemId: string) => {
    setSelectedResearchItems(prev => {
      const newThemeSelection = { ...(prev[themeId] || {}) };
      newThemeSelection[researchItemId] = !newThemeSelection[researchItemId];
      return { ...prev, [themeId]: newThemeSelection };
    });
  };
  
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
    setCurrentThemeForManualRef(null); // Close dialog
  };

  const handleDeleteManualRef = useCallback((themeId: string, refId: string) => {
    deleteManualReferenceFromTheme(themeId, refId);
    refreshStoredThemes();
    setSelectedManualReferences(prev => {
        const newThemeSelection = { ...(prev[themeId] || {}) };
        delete newThemeSelection[refId];
        return { ...prev, [themeId]: newThemeSelection };
    });
    toast({ title: "Manual Reference Deleted", description: "The manual reference has been removed." });
  }, [refreshStoredThemes]);

  const toggleManualReferenceSelection = (themeId: string, refId: string) => {
    setSelectedManualReferences(prev => {
      const newThemeSelection = { ...(prev[themeId] || {}) };
      newThemeSelection[refId] = !newThemeSelection[refId];
      return { ...prev, [themeId]: newThemeSelection };
    });
  };


  const handleCreateContentFromTheme = (theme: ThemeSuggestion) => {
    const selectedLinks = (theme.researchLinks || [])
      .filter(link => selectedResearchItems[theme.id]?.[link.id])
      .map(link => ({ title: link.title, url: link.url, summary: link.summary, abntCitation: link.abntCitation }));
    
    const selectedManualRefs = (theme.manualReferences || [])
      .filter(ref => selectedManualReferences[theme.id]?.[ref.id])
      .map(ref => ref.content);

    const queryParams = new URLSearchParams();
    queryParams.append('title', theme.title);
    queryParams.append('topic', theme.description); // Theme description becomes the initial topic/brief
    if (selectedLinks.length > 0) {
      queryParams.append('research', JSON.stringify(selectedLinks));
    }
    if (selectedManualRefs.length > 0) {
      queryParams.append('manualRefs', JSON.stringify(selectedManualRefs));
    }
    
    router.push(`/content/new?${queryParams.toString()}`);
  };


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Proactive Theme Planner</CardTitle>
          <CardDescription>Let AI help you brainstorm content themes. Enter a general topic and get suggestions for titles, descriptions, and keywords.</CardDescription>
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
            <CardDescription>Manage your saved themes, find research, add manual notes, and create content.</CardDescription>
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
                          <span className="text-xs font-medium mr-1 text-muted-foreground">Keywords:</span>
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
                            This action cannot be undone. This will permanently delete the theme idea titled "{suggestion.title}" and all its associated research links and manual notes.
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
                
                {/* Research Links Section */}
                <div className="my-4 p-3 border-t border-dashed">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-md font-semibold flex items-center"><Search className="mr-2 h-5 w-5 text-primary"/>AI-Found Research</h5>
                     <Dialog onOpenChange={(isOpen) => !isOpen && setCurrentThemeForLinks(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleOpenFindLinksModal(suggestion)} disabled={isLoadingLinks === suggestion.id}>
                          {isLoadingLinks === suggestion.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4" />} Find Research
                        </Button>
                      </DialogTrigger>
                      {currentThemeForLinks?.id === suggestion.id && (
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Find Research Links for "{currentThemeForLinks.title}"</DialogTitle>
                            <DialogDescription>
                              How many research links/summaries should the AI try to find? (1-5)
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...findLinksForm}>
                            <form onSubmit={findLinksForm.handleSubmit(onFindLinksSubmit)} className="space-y-4">
                              <FormField
                                control={findLinksForm.control}
                                name="numLinks"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel htmlFor={`numLinks-${suggestion.id}`}>Number of Links</FormLabel>
                                    <FormControl>
                                      <Input id={`numLinks-${suggestion.id}`} type="number" min="1" max="5" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <DialogClose asChild>
                                   <Button type="button" variant="ghost">Cancel</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isLoadingLinks === suggestion.id}>
                                  {isLoadingLinks === suggestion.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4" />} Get Links
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      )}
                    </Dialog>
                  </div>
                  {suggestion.researchLinks && suggestion.researchLinks.length > 0 ? (
                    <ul className="space-y-3">
                      {suggestion.researchLinks.map(link => (
                        <li key={link.id} className="p-3 border rounded-md bg-background">
                          <div className="flex items-center mb-2">
                            <Checkbox
                                id={`research-${suggestion.id}-${link.id}`}
                                checked={!!selectedResearchItems[suggestion.id]?.[link.id]}
                                onCheckedChange={() => toggleResearchItemSelection(suggestion.id, link.id)}
                                className="mr-3"
                            />
                            <UiLabel htmlFor={`research-${suggestion.id}-${link.id}`} className="flex-1">
                                <h6 className="font-medium text-sm hover:underline cursor-pointer">
                                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
                                    {link.title} <ExternalLink className="ml-1 h-3 w-3" />
                                  </a>
                                </h6>
                            </UiLabel>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Research Link?</AlertDialogTitle>
                                  <AlertDialogDescription>Permanently delete the research item "{link.title}"?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteResearchLink(suggestion.id, link.id)} className="bg-destructive">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          <p className="text-xs text-muted-foreground pl-7 line-clamp-3">{link.summary || "No summary available."}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No research links found or added yet for this theme.</p>
                  )}
                </div>

                {/* Manual References Section */}
                <div className="my-4 p-3 border-t border-dashed">
                   <div className="flex justify-between items-center mb-2">
                    <h5 className="text-md font-semibold flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Manual Notes/References</h5>
                    <Dialog onOpenChange={(isOpen) => !isOpen && setCurrentThemeForManualRef(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleOpenManualRefModal(suggestion)}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Note
                        </Button>
                      </DialogTrigger>
                      {currentThemeForManualRef?.id === suggestion.id && (
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
                                 <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
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
                            <UiLabel htmlFor={`manual-${suggestion.id}-${ref.id}`} className="flex-1">
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
                                  <AlertDialogAction onClick={() => handleDeleteManualRef(suggestion.id, ref.id)} className="bg-destructive">Delete</AlertDialogAction>
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