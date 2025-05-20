"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppSettings, ThemeSuggestion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { suggestThemes } from '@/ai/flows/proactive-theme-planning';
import { getStoredSettings, addThemeSuggestion, getStoredThemeSuggestions } from '@/lib/storageService';
import { Loader2, Sparkles, Lightbulb, CheckCircle, PlusCircle } from 'lucide-react';

const themePlannerSchema = z.object({
  topic: z.string().min(5, "Topic must be at least 5 characters."),
  numSuggestions: z.coerce.number().min(1).max(10).default(5),
});

type ThemePlannerFormData = z.infer<typeof themePlannerSchema>;

export function ThemePlannerClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedThemesList, setSuggestedThemesList] = useState<string[]>([]);
  const [currentSettings, setCurrentSettings] = useState<AppSettings | null>(null);
  const [storedThemeSuggestions, setStoredThemeSuggestions] = useState<ThemeSuggestion[]>([]);
  const [currentTopic, setCurrentTopic] = useState<string>("");


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
    setCurrentTopic(data.topic);
    try {
      const result = await suggestThemes({
        topic: data.topic,
        numSuggestions: data.numSuggestions,
        // apiKey: currentSettings.openAIKey, // The AI flow for suggestThemes does not take apiKey
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

  const handleSelectTheme = (theme: string) => {
    // For now, we'll store it. A more advanced version would redirect to content creation.
    const newSuggestion: ThemeSuggestion = {
      id: Date.now().toString(),
      topic: currentTopic, // The topic used to generate this theme
      theme: theme,
      generatedAt: new Date().toISOString(),
    };
    addThemeSuggestion(newSuggestion);
    setStoredThemeSuggestions(prev => [newSuggestion, ...prev]);
    toast({ title: "Theme Saved!", description: `Theme "${theme}" has been saved. You can develop content for it later.` });

    // Optionally, redirect to new content page with pre-filled topic
    // router.push(`/content/new?topic=${encodeURIComponent(theme)}`);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Proactive Theme Planner</CardTitle>
          <CardDescription>Let AI help you brainstorm content themes. Enter a general topic and get suggestions.</CardDescription>
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
            <CardTitle>Suggested Themes for "{currentTopic}"</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {suggestedThemesList.map((theme, index) => (
                <li key={index} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                  <div className="flex items-center">
                    <Lightbulb className="h-5 w-5 mr-3 text-primary" />
                    <span className="text-sm">{theme}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleSelectTheme(theme)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Use this Theme
                  </Button>
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
            <CardDescription>Themes you've previously saved. Click to start creating content.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {storedThemeSuggestions.sort((a,b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()).map((suggestion) => (
                 <li key={suggestion.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{suggestion.theme}</p>
                    <p className="text-xs text-muted-foreground">From topic: "{suggestion.topic}" (Saved: {new Date(suggestion.generatedAt).toLocaleDateString()})</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/content/new?topic=${encodeURIComponent(suggestion.theme)}`)}>
                     Create Content
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
