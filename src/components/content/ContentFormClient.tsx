
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { ContentItem, Platform, AppSettings, ManualReferenceItem } from '@/lib/types';
import { PLATFORM_OPTIONS, DEFAULT_OUTPUT_LANGUAGE, DEFAULT_NUMBER_OF_IMAGES, SETTINGS_STORAGE_KEY } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HtmlEditor } from './HtmlEditor';
import { useToast } from '@/hooks/use-toast';
import { generateContentForPlatform } from '@/ai/flows/generate-content-for-platform';
import { suggestHashtags as suggestHashtagsFlow } from '@/ai/flows/smart-hashtag-suggestions';
import { getStoredSettings, addContentItem, updateContentItem, getContentItemById } from '@/lib/storageService';
import { Loader2, Sparkles, Save, Tags, Image as ImageIcon, FileText, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

  useEffect(() => {
    const handleStorageChange = () => setCurrentSettings(getStoredSettings());
    window.addEventListener('storage', handleStorageChange); // For settings changes
    setCurrentSettings(getStoredSettings()); // Initial settings load

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
    } else { // New content
      if (initialTitle) form.setValue('title', initialTitle);
      if (initialTopic) form.setValue('topic', initialTopic);
      if (!initialTitle && initialTopic && !form.getValues('title')) {
           form.setValue('title', `${form.getValues('platform')} post about ${initialTopic.substring(0,30)}...`);
      }
      setManualReferencesForDisplay(initialManualReferenceTexts || []);
    }
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [contentId, initialTitle, initialTopic, initialManualReferenceTexts, form, router, toast]);


  const handleGenerateContent = async () => {
    const { platform, topic, wordCount, numberOfImages } = form.getValues();
    if (!topic) {
      toast({ title: "Topic Required", description: "Please enter a topic to generate content.", variant: "destructive" });
      return;
    }
    const freshSettings = getStoredSettings(); // Fetch fresh settings for API key etc.
    
    setIsLoadingAi(true);
    try {
      const result = await generateContentForPlatform({
        platform: platform as Platform,
        topic,
        wordCount: wordCount && wordCount > 0 ? wordCount : undefined,
        numberOfImages: platform === 'Wordpress' ? (numberOfImages === undefined ? DEFAULT_NUMBER_OF_IMAGES : numberOfImages) : undefined,
        outputLanguage: freshSettings.outputLanguage || DEFAULT_OUTPUT_LANGUAGE,
        manualReferenceTexts: manualReferencesForDisplay.length > 0 ? manualReferencesForDisplay : undefined,
      });
      setGeneratedContent(result.content);
      const prompts = result.imagePrompt ? result.imagePrompt.split('\n').filter(p => p.trim() !== '') : [];
      setImagePrompts(prompts);

      if (!form.getValues('title')) {
        form.setValue('title', `${platform} post about ${topic.substring(0,30)}...`);
      }
      toast({ title: "Content Generated!", description: "AI has generated content and image prompts." });
    } catch (error) {
      console.error("AI content generation error:", error);
      toast({ title: "AI Error", description: `Failed to generate content. Check console for details. Error: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    }
    setIsLoadingAi(false);
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
  
  const hasManualReferences = manualReferencesForDisplay.length > 0;
  const saveButtonText = existingContent && platformFieldValue === originalPlatform ? 'Update Content' : 'Save as New Draft';

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
                        // If platform changes, clear generated content to encourage re-generation
                        if (existingContent && value !== originalPlatform) {
                          setGeneratedContent('');
                          setImagePrompts([]);
                          setSuggestedHashtags([]);
                        }
                      }} 
                      value={field.value} // Ensure value is controlled
                      defaultValue={field.value} // Set initial default
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
              {platformFieldValue === 'Wordpress' ? (
                <HtmlEditor initialHtml={generatedContent} onHtmlChange={setGeneratedContent} />
              ) : (
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  rows={15}
                  placeholder="Generated content will appear here..."
                  className="min-h-[300px]"
                  suppressHydrationWarning={true}
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
                  suppressHydrationWarning={true}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {(platformFieldValue === 'Instagram' || platformFieldValue === 'Facebook') && generatedContent && (
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
            {saveButtonText}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}
