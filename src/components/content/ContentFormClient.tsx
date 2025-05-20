"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { ContentItem, Platform, AppSettings } from '@/lib/types';
import { PLATFORM_OPTIONS, DEFAULT_IMAGE_PROMPT_FREQUENCY, DEFAULT_OUTPUT_LANGUAGE } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { HtmlEditor } from './HtmlEditor';
import { useToast } from '@/hooks/use-toast';
import { generateContentForPlatform } from '@/ai/flows/generate-content-for-platform';
import { suggestHashtags as suggestHashtagsFlow } from '@/ai/flows/smart-hashtag-suggestions';
import { getStoredSettings, addContentItem, updateContentItem, getContentItemById } from '@/lib/storageService';
import { Loader2, Sparkles, Save, Tags, Image as ImageIcon, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  platform: z.enum(["Wordpress", "Instagram", "Facebook"]),
  topic: z.string().min(10, "Topic must be at least 10 characters."),
  wordCount: z.coerce.number().optional().describe("Approximate word count for the content."),
  imagePromptFrequency: z.number().optional(),
});

type ContentFormData = z.infer<typeof formSchema>;

interface ContentFormClientProps {
  contentId?: string; // For editing existing content
  initialTitle?: string; // For pre-filling title from theme planner
  initialTopic?: string; // For pre-filling topic/description from theme planner
}

export function ContentFormClient({ contentId, initialTitle, initialTopic }: ContentFormClientProps) {
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

  const form = useForm<ContentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      platform: 'Wordpress',
      topic: '',
      wordCount: undefined,
      imagePromptFrequency: DEFAULT_IMAGE_PROMPT_FREQUENCY,
    },
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentSettings(getStoredSettings());
    };
    window.addEventListener('storage', handleStorageChange);
    setCurrentSettings(getStoredSettings());

    if (contentId) {
      const content = getContentItemById(contentId);
      if (content) {
        setExistingContent(content);
        form.reset({
          title: content.title,
          platform: content.platform,
          topic: content.topic,
          wordCount: content.wordCount,
          imagePromptFrequency: content.imagePromptFrequency || DEFAULT_IMAGE_PROMPT_FREQUENCY,
        });
        setGeneratedContent(content.content);
        setImagePrompts(content.imagePrompts);
        setSuggestedHashtags(content.hashtags || []);
      } else {
        toast({ title: "Error", description: "Content not found.", variant: "destructive" });
        router.push('/');
      }
    } else {
      if (initialTitle) {
        form.setValue('title', initialTitle);
      }
      if (initialTopic) {
        form.setValue('topic', initialTopic);
        if (!initialTitle && !form.getValues('title')) {
          // If only topic came (old behavior) or title is still empty, derive a title
           form.setValue('title', `${form.getValues('platform')} post about ${initialTopic.substring(0,30)}...`);
        }
      }
    }
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [contentId, initialTitle, initialTopic, form, router, toast]);

  const selectedPlatform = form.watch('platform');

  const handleGenerateContent = async () => {
    const { platform, topic, wordCount } = form.getValues();
    if (!topic) {
      toast({ title: "Topic Required", description: "Please enter a topic to generate content.", variant: "destructive" });
      return;
    }
    const freshSettings = getStoredSettings(); 
    if (!freshSettings?.openAIKey) {
      toast({ title: "API Key Missing", description: "Please configure your OpenAI API key in Settings.", variant: "destructive" });
      return;
    }

    setIsLoadingAi(true);
    try {
      const result = await generateContentForPlatform({
        platform: platform as Platform,
        topic,
        wordCount: wordCount && wordCount > 0 ? wordCount : undefined,
        apiKey: freshSettings.openAIKey,
        agentId: freshSettings.openAIAgentId || undefined,
        outputLanguage: freshSettings.outputLanguage || DEFAULT_OUTPUT_LANGUAGE,
      });
      setGeneratedContent(result.content);
      const prompts = result.imagePrompt ? result.imagePrompt.split('\n').filter(p => p.trim() !== '') : [];
      setImagePrompts(prompts);

      if (!form.getValues('title')) { // If title wasn't pre-filled or user-set
        form.setValue('title', `${platform} post about ${topic.substring(0,30)}...`);
      }
      toast({ title: "Content Generated!", description: "AI has generated content and image prompts." });
    } catch (error) {
      console.error("AI content generation error:", error);
      toast({ title: "AI Error", description: "Failed to generate content. Check console for details.", variant: "destructive" });
    }
    setIsLoadingAi(false);
  };

  const handleSuggestHashtags = async () => {
    if (!generatedContent) {
      toast({ title: "Content Required", description: "Generate or write content before suggesting hashtags.", variant: "destructive" });
      return;
    }
    const freshSettings = getStoredSettings();
     if (!freshSettings?.openAIKey) {
      toast({ title: "API Key Missing", description: "Please configure your OpenAI API key in Settings.", variant: "destructive" });
      return;
    }
    setIsSuggestingHashtags(true);
    try {
      const result = await suggestHashtagsFlow({
        text: generatedContent,
        platform: selectedPlatform.toLowerCase() as 'instagram' | 'facebook',
      });
      setSuggestedHashtags(result.hashtags);
      toast({ title: "Hashtags Suggested!", description: "AI has suggested relevant hashtags." });
    } catch (error) {
      console.error("Hashtag suggestion error:", error);
      toast({ title: "AI Error", description: "Failed to suggest hashtags. Check console for details.", variant: "destructive" });
    }
    setIsSuggestingHashtags(false);
  };

  const onSubmit: SubmitHandler<ContentFormData> = async (data) => {
    setIsSaving(true);
    const newContentItem: ContentItem = {
      id: existingContent?.id || Date.now().toString(),
      title: data.title,
      platform: data.platform as Platform,
      topic: data.topic,
      content: generatedContent,
      imagePrompts: imagePrompts,
      wordCount: data.wordCount && data.wordCount > 0 ? data.wordCount : undefined,
      imagePromptFrequency: data.platform === 'Wordpress' ? data.imagePromptFrequency : undefined,
      hashtags: suggestedHashtags,
      status: existingContent?.status || 'Draft',
      createdAt: existingContent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingContent) {
      updateContentItem(newContentItem);
      toast({ title: "Content Updated", description: "Your content has been successfully updated." });
    } else {
      addContentItem(newContentItem);
      toast({ title: "Content Saved", description: "Your content has been saved as a draft." });
    }
    
    setIsSaving(false);
    router.push('/'); 
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{contentId ? 'Edit Content' : 'Create New Content'}</CardTitle>
            <CardDescription>Fill in the details below and let AI assist you in crafting perfect posts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a title for your content" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              {selectedPlatform === 'Wordpress' && (
                <FormField
                  control={form.control}
                  name="imagePromptFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image Prompt Frequency (words)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} />
                      </FormControl>
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
                    <Textarea placeholder="Describe the main topic, idea, or paste the brief for the AI to generate content on..." {...field} rows={4} />
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
                    <Input type="number" placeholder="e.g., 500" {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="button" onClick={handleGenerateContent} disabled={isLoadingAi} className="w-full md:w-auto">
              {isLoadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Content with AI
            </Button>
          </CardContent>
        </Card>

        {generatedContent && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Content</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPlatform === 'Wordpress' ? (
                <HtmlEditor initialHtml={generatedContent} onHtmlChange={setGeneratedContent} />
              ) : (
                <Textarea 
                  value={generatedContent} 
                  onChange={(e) => setGeneratedContent(e.target.value)} 
                  rows={15} 
                  placeholder="Generated content will appear here..." 
                  className="min-h-[300px]" 
                />
              )}
            </CardContent>
          </Card>
        )}

        {imagePrompts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><ImageIcon className="mr-2 h-5 w-5" /> Image Prompts</CardTitle>
              <CardDescription>Use these prompts to generate images for your content. You can edit them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {imagePrompts.map((prompt, index) => (
                <Textarea
                  key={index}
                  value={prompt}
                  onChange={(e) => {
                    const newPrompts = [...imagePrompts];
                    newPrompts[index] = e.target.value;
                    setImagePrompts(newPrompts);
                  }}
                  rows={2}
                />
              ))}
            </CardContent>
          </Card>
        )}
        
        {(selectedPlatform === 'Instagram' || selectedPlatform === 'Facebook') && generatedContent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Tags className="mr-2 h-5 w-5" /> Hashtags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button type="button" variant="outline" onClick={handleSuggestHashtags} disabled={isSuggestingHashtags || !generatedContent} className="w-full md:w-auto">
                {isSuggestingHashtags ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Suggest Hashtags
              </Button>
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
            {existingContent ? 'Update Content' : 'Save Draft'}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}
