
"use client";

import { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppSettings } from '@/lib/types';
import { getStoredSettings, saveStoredSettings, clearAllContentItems, clearAllThemeSuggestions, clearAllData } from '@/lib/storageService';
import { LANGUAGE_OPTIONS, DEFAULT_OUTPUT_LANGUAGE } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Save, LanguagesIcon, Trash2, AlertTriangle } from 'lucide-react';
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

const settingsFormSchema = z.object({
  openAIKey: z.string().min(1, "OpenAI API Key is required."),
  openAIAgentId: z.string().optional(),
  outputLanguage: z.string().optional().default(DEFAULT_OUTPUT_LANGUAGE),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

export function SettingsFormClient() {
  const { toast } = useToast();
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      openAIKey: '',
      openAIAgentId: '',
      outputLanguage: DEFAULT_OUTPUT_LANGUAGE,
    },
  });

  useEffect(() => {
    const storedSettings = getStoredSettings();
    if (storedSettings) {
      form.reset({
        openAIKey: storedSettings.openAIKey || '',
        openAIAgentId: storedSettings.openAIAgentId || '',
        outputLanguage: storedSettings.outputLanguage || DEFAULT_OUTPUT_LANGUAGE,
      });
    }
  }, [form]);

  const onSubmit: SubmitHandler<SettingsFormData> = (data) => {
    saveStoredSettings(data);
    toast({
      title: "Settings Saved",
      description: "Your API settings have been updated.",
    });
  };

  const handleClearContent = () => {
    clearAllContentItems();
    toast({ title: "Content Cleared", description: "All content items have been removed." });
  };

  const handleClearThemes = () => {
    clearAllThemeSuggestions();
    toast({ title: "Themes Cleared", description: "All theme suggestions have been removed." });
  };
  
  const handleClearAllData = () => {
    clearAllData();
    toast({ title: "All Data Cleared", description: "All content items and theme suggestions have been removed." });
  };


  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>API & Language Settings</CardTitle>
          <CardDescription>Configure your OpenAI API Key, optional Agent ID, and default content language.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="openAIKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="openAIKey">OpenAI API Key</FormLabel>
                    <FormControl>
                      <Input id="openAIKey" type="password" placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="openAIAgentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="openAIAgentId">OpenAI Agent ID (Optional)</FormLabel>
                    <FormControl>
                      <Input id="openAIAgentId" placeholder="asst_xxxxxxxxxxxxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription>
                      If you have a custom OpenAI Assistant ID, enter it here. Otherwise, default models will be used.
                    </FormDescription>
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
                      <LanguagesIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      Default Output Language
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormDescription>
                      Choose the default language for AI-generated content.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" /> Save Settings
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription>
            These actions are irreversible. Proceed with caution as they will permanently delete your data from this browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" /> Clear All Content Items
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all your content items.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearContent} className="bg-destructive hover:bg-destructive/90">
                  Yes, delete all content
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" /> Clear All Theme Suggestions
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all your theme suggestions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearThemes} className="bg-destructive hover:bg-destructive/90">
                  Yes, delete all themes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" /> Clear All Application Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete ALL your content items and theme suggestions. App settings (like API keys) will NOT be cleared.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAllData} className="bg-destructive hover:bg-destructive/90">
                  Yes, delete all data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">
            Clearing data only affects this browser. Your API settings will remain.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
