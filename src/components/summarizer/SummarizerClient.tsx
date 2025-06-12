
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { summarizeText as summarizeTextFlow } from '@/ai/flows/summarize-text-flow';
import { 
  getStoredSummaries, 
  addSummarizationItem, 
  updateSummarizationItem, 
  deleteSummarizationItemById, 
  clearAllSummaries,
  getStoredThemeSuggestions,
  addManualReferenceToTheme,
  getStoredSettings
} from '@/lib/storageService';
import type { SummarizationItem, ThemeSuggestion, ManualReferenceItem, AppSettings } from '@/lib/types';
import { Loader2, Sparkles, Copy, Save, Trash2, Edit3, Send, SettingsIcon as SettingsIconLucide, XIcon, AlertTriangle, Eye } from 'lucide-react';
import { LANGUAGE_OPTIONS, DEFAULT_OUTPUT_LANGUAGE, SUMMARIES_STORAGE_KEY, SETTINGS_STORAGE_KEY } from '@/lib/constants';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
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

const summarizerFormSchema = z.object({
  inputText: z.string().min(50, "Text must be at least 50 characters long."),
  outputLanguage: z.string().default(DEFAULT_OUTPUT_LANGUAGE),
});

type SummarizerFormData = z.infer<typeof summarizerFormSchema>;

export function SummarizerClient() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [summaryOutput, setSummaryOutput] = useState('');
  const [savedSummaries, setSavedSummaries] = useState<SummarizationItem[]>([]);
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);

  const [isSendToThemeModalOpen, setIsSendToThemeModalOpen] = useState(false);
  const [allThemeSuggestions, setAllThemeSuggestions] = useState<ThemeSuggestion[]>([]);
  const [selectedThemeIdForSummary, setSelectedThemeIdForSummary] = useState<string | null>(null);
  const [currentSummaryToSend, setCurrentSummaryToSend] = useState<SummarizationItem | null>(null);

  const [isViewContentModalOpen, setIsViewContentModalOpen] = useState(false);
  const [summaryToView, setSummaryToView] = useState<SummarizationItem | null>(null);

  const form = useForm<SummarizerFormData>({
    resolver: zodResolver(summarizerFormSchema),
    defaultValues: {
      inputText: '',
      outputLanguage: (getStoredSettings() as AppSettings)?.outputLanguage || DEFAULT_OUTPUT_LANGUAGE,
    },
  });

  const refreshSummaries = useCallback(() => {
    setSavedSummaries(getStoredSummaries());
  }, []);
  
  const getCurrentSettings = useCallback(() => {
    if (typeof window !== 'undefined') {
      return getStoredSettings();
    }
    return { outputLanguage: DEFAULT_OUTPUT_LANGUAGE } as AppSettings;
  }, []);


  useEffect(() => {
    refreshSummaries();
    const currentLanguage = getCurrentSettings()?.outputLanguage || DEFAULT_OUTPUT_LANGUAGE;
    // form.reset({ inputText: '', outputLanguage: currentLanguage }); 


    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SUMMARIES_STORAGE_KEY) {
        refreshSummaries();
      }
      if (event.key === SETTINGS_STORAGE_KEY) { 
         const newSettings = getCurrentSettings();
         form.setValue('outputLanguage', newSettings.outputLanguage || DEFAULT_OUTPUT_LANGUAGE);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshSummaries, form, getCurrentSettings]);

  const onSummarizeSubmit: SubmitHandler<SummarizerFormData> = async (data) => {
    setIsLoading(true);
    setSummaryOutput('');
    try {
      const result = await summarizeTextFlow({
        textToSummarize: data.inputText,
        outputLanguage: data.outputLanguage,
      });
      setSummaryOutput(result.summary);
      toast({ title: "Summary Generated!", description: "AI has summarized your text." });
    } catch (error) {
      console.error("Summarization error:", error);
      toast({ title: "AI Error", description: "Failed to summarize text. Check console for details.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleSaveOrUpdateSummary = () => {
    const { inputText, outputLanguage } = form.getValues();
    if (!summaryOutput) {
      toast({ title: "No Summary", description: "Generate a summary before saving.", variant: "destructive" });
      return;
    }

    if (editingSummaryId) {
      const updatedItem: SummarizationItem = {
        id: editingSummaryId,
        inputText,
        summaryOutput,
        language: outputLanguage,
        createdAt: savedSummaries.find(s => s.id === editingSummaryId)?.createdAt || new Date().toISOString(), 
      };
      updateSummarizationItem(updatedItem);
      toast({ title: "Summary Updated!", description: "Your summary has been updated." });
      setEditingSummaryId(null);
    } else {
      const newItem: SummarizationItem = {
        id: Date.now().toString(),
        inputText,
        summaryOutput,
        language: outputLanguage,
        createdAt: new Date().toISOString(),
      };
      addSummarizationItem(newItem);
      toast({ title: "Summary Saved!", description: "Your summary has been saved." });
    }
    refreshSummaries();
    form.reset({ inputText: '', outputLanguage: form.getValues('outputLanguage') }); 
    setSummaryOutput(''); 
  };

  const handleEditSummary = (summary: SummarizationItem) => {
    setEditingSummaryId(summary.id);
    form.reset({
      inputText: summary.inputText,
      outputLanguage: summary.language,
    });
    setSummaryOutput(summary.summaryOutput);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSummary = (id: string) => {
    deleteSummarizationItemById(id);
    refreshSummaries();
    if (editingSummaryId === id) { 
      setEditingSummaryId(null);
      form.reset({ inputText: '', outputLanguage: form.getValues('outputLanguage') });
      setSummaryOutput('');
    }
    toast({ title: "Summary Deleted", description: "The summary has been removed." });
  };

  const handleCopySummary = (textToCopy: string) => {
    if (!textToCopy) {
        toast({ title: "Nothing to Copy", description: "There is no summary to copy.", variant: "destructive" });
        return;
    }
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast({ title: "Copied!", description: "Summary copied to clipboard." }))
      .catch(err => {
        console.error("Failed to copy: ", err);
        toast({ title: "Copy Failed", description: "Could not copy summary.", variant: "destructive" });
      });
  };
  
  const handleClearAll = () => {
    clearAllSummaries();
    refreshSummaries();
    setEditingSummaryId(null);
    form.reset({ inputText: '', outputLanguage: form.getValues('outputLanguage') });
    setSummaryOutput('');
    toast({ title: "History Cleared", description: "All summaries have been deleted." });
  };

  const handleOpenSendToThemeModal = (summary: SummarizationItem) => {
    setCurrentSummaryToSend(summary);
    setAllThemeSuggestions(getStoredThemeSuggestions());
    setSelectedThemeIdForSummary(null); 
    setIsSendToThemeModalOpen(true);
  };

  const handleSendSummaryToTheme = () => {
    if (!currentSummaryToSend || !selectedThemeIdForSummary) {
      toast({title: "Error", description: "No summary or theme selected.", variant: "destructive"});
      return;
    }
    const theme = allThemeSuggestions.find(t => t.id === selectedThemeIdForSummary);
    if (!theme) {
      toast({title: "Error", description: "Selected theme not found.", variant: "destructive"});
      return;
    }

    const noteTitle = `Summary: ${currentSummaryToSend.inputText.substring(0, 30)}${currentSummaryToSend.inputText.length > 30 ? '...' : ''}`;
    const newManualRef: ManualReferenceItem = {
      id: Date.now().toString(),
      title: noteTitle,
      content: currentSummaryToSend.summaryOutput,
      createdAt: new Date().toISOString(),
    };

    addManualReferenceToTheme(selectedThemeIdForSummary, newManualRef);
    toast({title: "Sent to Theme!", description: `Summary sent as a note to theme "${theme.title}".`});
    setIsSendToThemeModalOpen(false);
    setCurrentSummaryToSend(null);
  };

  const handleOpenViewContentModal = (summary: SummarizationItem) => {
    setSummaryToView(summary);
    setIsViewContentModalOpen(true);
  };


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Text Summarizer</CardTitle>
          <CardDescription>Input your text below and select the desired language for the summary. The AI will generate a concise overview.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSummarizeSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="inputText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="inputText">Text to Summarize</FormLabel>
                    <FormControl>
                      <Textarea id="inputText" placeholder="Paste your text here (min. 50 characters)..." {...field} rows={10} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="outputLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="outputLanguage" className="flex items-center">
                      <SettingsIconLucide className="mr-2 h-4 w-4 text-muted-foreground" />
                      Summary Language
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger id="outputLanguage">
                          <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {editingSummaryId ? "Re-Summarize" : "Summarize Text"}
              </Button>
              {summaryOutput && (
                 <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => handleCopySummary(summaryOutput)}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Summary
                    </Button>
                    <Button type="button" onClick={handleSaveOrUpdateSummary}>
                        <Save className="mr-2 h-4 w-4" /> {editingSummaryId ? "Update Saved Summary" : "Save Summary"}
                    </Button>
                 </div>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>

      {summaryOutput && !editingSummaryId && ( 
        <Card>
          <CardHeader>
            <CardTitle>Generated Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">{summaryOutput}</ReactMarkdown>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      {editingSummaryId && summaryOutput && ( 
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
                <Edit3 className="mr-2 h-5 w-5"/> Editing Summary
            </CardTitle>
            <CardDescription>Modify the text or language above and click "Re-Summarize" or "Update Saved Summary".</CardDescription>
          </CardHeader>
          <CardContent>
             <FormLabel>Current Summary Output</FormLabel>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/30">
              <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">{summaryOutput}</ReactMarkdown>
            </ScrollArea>
          </CardContent>
            <CardFooter className="flex justify-end">
                 <Button variant="ghost" onClick={() => { 
                     setEditingSummaryId(null); 
                     form.reset({ inputText: '', outputLanguage: form.getValues('outputLanguage') }); 
                     setSummaryOutput(''); 
                 }}>
                    <XIcon className="mr-2 h-4 w-4"/> Cancel Edit
                </Button>
            </CardFooter>
        </Card>
      )}


      {savedSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Summaries History</CardTitle>
            <div className="flex justify-between items-center">
              <CardDescription>Manage your previously generated and saved summaries.</CardDescription>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear All History
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive"/>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all saved summaries. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">Yes, delete all</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedSummaries.map((item) => (
              <Card key={item.id} className="p-4 shadow-sm">
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground">
                    Original Text (saved {new Date(item.createdAt).toLocaleString()} in {LANGUAGE_OPTIONS.find(l=>l.value === item.language)?.label || item.language}):
                  </p>
                  <p className="text-sm line-clamp-2 italic break-words">{item.inputText}</p>
                </div>
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground">Generated Summary:</p>
                  <ScrollArea className="h-[100px] w-full rounded-md border p-2 text-sm bg-muted/20">
                     <ReactMarkdown className="prose prose-xs dark:prose-invert max-w-none">{item.summaryOutput}</ReactMarkdown>
                  </ScrollArea>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleOpenViewContentModal(item)}>
                    <Eye className="mr-1 h-3 w-3" /> Ver
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEditSummary(item)}>
                    <Edit3 className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCopySummary(item.summaryOutput)}>
                    <Copy className="mr-1 h-3 w-3" /> Copy Output
                  </Button>
                   <Button variant="outline" size="sm" onClick={() => handleOpenSendToThemeModal(item)}>
                    <Send className="mr-1 h-3 w-3" /> Send to Theme
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-1 h-3 w-3" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive"/>Delete this summary?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will permanently delete this summary.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteSummary(item.id)} className="bg-destructive hover:bg-destructive/90">Yes, delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Send to Theme Modal */}
      <Dialog open={isSendToThemeModalOpen} onOpenChange={setIsSendToThemeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Summary as Note to Theme Planner</DialogTitle>
            <DialogDescription>
              Select a theme idea to add this summary as a manual reference note.
              {currentSummaryToSend && <p className="text-xs mt-2 italic">Sending summary for: "{currentSummaryToSend.inputText.substring(0,50)}..."</p>}
            </DialogDescription>
          </DialogHeader>
          {allThemeSuggestions.length > 0 ? (
            <div className="space-y-4 py-2">
              <Label htmlFor="select-theme-for-summary">Select Theme Idea</Label>
              <Select onValueChange={setSelectedThemeIdForSummary} value={selectedThemeIdForSummary || undefined}>
                <SelectTrigger id="select-theme-for-summary">
                  <SelectValue placeholder="Choose a theme..." />
                </SelectTrigger>
                <SelectContent>
                  {allThemeSuggestions.map(theme => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.title} (Topic: {theme.userInputTopic.substring(0,30)}{theme.userInputTopic.length > 30 ? '...' : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              No saved theme ideas found in Theme Planner. Please create some themes first.
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button onClick={handleSendSummaryToTheme} disabled={!selectedThemeIdForSummary || allThemeSuggestions.length === 0}>
              <Send className="mr-2 h-4 w-4" /> Send to Selected Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Full Content Modal */}
      <Dialog open={isViewContentModalOpen} onOpenChange={setIsViewContentModalOpen}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>View Full Content</DialogTitle>
            {summaryToView && (
                <DialogDescription>
                    Viewing original text and summary for item saved on {new Date(summaryToView.createdAt).toLocaleDateString()} in {LANGUAGE_OPTIONS.find(l=>l.value === summaryToView.language)?.label || summaryToView.language}.
                </DialogDescription>
            )}
          </DialogHeader>
          {summaryToView && (
            <div className="grid grid-rows-2 gap-4 flex-1 overflow-y-hidden py-2">
              <div className="flex flex-col overflow-y-hidden">
                <Label className="mb-1 font-semibold">Original Text</Label>
                <ScrollArea className="flex-1 rounded-md border p-3 bg-muted/20">
                  <pre className="whitespace-pre-wrap text-sm">{summaryToView.inputText}</pre>
                </ScrollArea>
              </div>
              <div className="flex flex-col overflow-y-hidden">
                <Label className="mb-1 font-semibold">Generated Summary</Label>
                <ScrollArea className="flex-1 rounded-md border p-3 bg-muted/20">
                  <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">{summaryToView.summaryOutput}</ReactMarkdown>
                </ScrollArea>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

    