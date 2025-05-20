"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppSettings, ThemeSuggestion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { suggestThemes } from '@/ai/flows/proactive-theme-planning';
import { getStoredSettings, addThemeSuggestion, getStoredThemeSuggestions, deleteThemeSuggestionById } from '@/lib/storageService';
import { Loader2, Sparkles, Lightbulb, PlusCircle, Trash2 } from 'lucide-react';

const themePlannerSchema = z.object({
  topic: z.string().min(5, "Topic must be at least 5 characters."),
  numSuggestions: z.coerce.number().min(1).max(10).default(5),
});

type ThemePlannerFormData = z.infer<typeof themePlannerSchema>;

export function ThemePlannerClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedThemesList, setSuggestedThemesList] = useState<Omit<ThemeSuggestion, 'id' | 'generatedAt' | 'userInputTopic'>[]>([]);
  const [currentSettings, setCurrentSettings] = useState<AppSettings | null>(null);
  const [storedThemeSuggestions, setStoredThemeSuggestions] = useState<ThemeSuggestion[]>([]);
  const [currentUserInputTopic, setCurrentUserInputTopic] = useState<string>("");


  useEffect(() => {
    setCurrentSettings(getStoredSettings());
    setStoredThemeSuggestions(getStoredThemeSuggestions());
  }, []);

  const form = useForm<ThemePlannerFormData>({
    resolver: zodResolver(themePlannerSchema),
    defaultValues: {
      topic: '',
      numSuggestions: 5,
    },
  });

  const onSubmit: SubmitHandler<ThemePlannerFormData> = async (data) => {
    if (!currentSettings?.openAIKey) {
      toast({ title: "API Key Missing", description: "Please configure your OpenAI API key in Settings.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setCurrentUserInputTopic(data.topic); // Store the topic used for generation
    try {
      const result = await suggestThemes({
        topic: data.topic,
        numSuggestions: data.numSuggestions,
      });
      setSuggestedThemesList(result.themes);
      toast({ title: "Themes Suggested!", description: "AI has generated theme ideas for your topic." });
    } catch (error) {
      console.error("Theme suggestion error:", error);
      toast({ title: "AI Error", description: "Failed to suggest themes. Check console for details.", variant: "destructive" });
      setSuggestedThemesList([]);
    }
    setIsLoading(false);
  };

  const handleSaveTheme = (theme: Omit<ThemeSuggestion, 'id' | 'generatedAt' | 'userInputTopic'>) => {
    const newSuggestion: ThemeSuggestion = {
      id: Date.now().toString(),
      userInputTopic: currentUserInputTopic, 
      title: theme.title,
      description: theme.description,
      generatedAt: new Date().toISOString(),
    };
    addThemeSuggestion(newSuggestion);
    setStoredThemeSuggestions(prev => [newSuggestion, ...prev].sort((a,b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()));
    toast({ title: "Theme Saved!", description: `Theme "${theme.title}" has been saved.` });
  };
  
  const handleDeleteTheme = (id: string) => {
    if (window.confirm("Are you sure you want to delete this theme idea?")) {
      deleteThemeSuggestionById(id);
      setStoredThemeSuggestions(prev => prev.filter(s => s.id !== id));
      toast({ title: "Theme Deleted", description: "The theme idea has been removed." });
    }
  };

  const handleCreateContentFromTheme = (theme: ThemeSuggestion) => {
    router.push(`/content/new?title=${encodeURIComponent(theme.title)}&topic=${encodeURIComponent(theme.description)}`);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Proactive Theme Planner</CardTitle>
          <CardDescription>Let AI help you brainstorm content themes. Enter a general topic and get suggestions for titles and descriptions.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="topic">General Topic</FormLabel>
                    <FormControl>
                      <Input id="topic" placeholder="e.g., Sustainable Living, Digital Marketing Trends" {...field} />
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
                      <Input id="numSuggestions" type="number" min="1" max="10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Suggest Themes
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {suggestedThemesList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suggested Themes for "{currentUserInputTopic}"</CardTitle>
            <CardDescription>Review the AI-generated titles and descriptions. Save the ones you like or use them directly to create content.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {suggestedThemesList.map((theme, index) => (
                <li key={index} className="p-4 border rounded-md bg-muted/30 shadow-sm">
                  <div className="flex items-start mb-2">
                    <Lightbulb className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-md">{theme.title}</h3>
                      <p className="text-sm text-muted-foreground">{theme.description}</p>
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
            <CardDescription>Themes you've previously saved. Click to start creating content or delete them.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {storedThemeSuggestions.map((suggestion) => (
                 <li key={suggestion.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/10 transition-colors">
                  <div className="flex-1 mr-4">
                    <h4 className="font-medium">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">{suggestion.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Original topic: "{suggestion.userInputTopic}" (Saved: {new Date(suggestion.generatedAt).toLocaleDateString()})</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleCreateContentFromTheme(suggestion)}>
                       Create Content
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteTheme(suggestion.id)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete theme</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
