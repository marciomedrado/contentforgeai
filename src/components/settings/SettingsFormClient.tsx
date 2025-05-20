"use client";

import { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppSettings } from '@/lib/types';
import { getStoredSettings, saveStoredSettings } from '@/lib/storageService';
import { LANGUAGE_OPTIONS, DEFAULT_OUTPUT_LANGUAGE } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Save, LanguagesIcon } from 'lucide-react';

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

  return (
    <Card className="max-w-2xl mx-auto">
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
  );
}
