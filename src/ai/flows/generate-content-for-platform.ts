'use server';
/**
 * @fileOverview Generates content tailored for different platforms (Wordpress, Instagram, Facebook) using AI.
 *
 * - generateContentForPlatform - A function that handles the content generation process.
 * - GenerateContentForPlatformInput - The input type for the generateContentForPlatform function.
 * - GenerateContentForPlatformOutput - The return type for the generateContentForPlatform function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateContentForPlatformInputSchema = z.object({
  platform: z
    .enum(['Wordpress', 'Instagram', 'Facebook'])
    .describe('The platform for which the content is being generated.'),
  topic: z.string().describe('The topic of the content.'),
  apiKey: z.string().describe('The OpenAI API key.'),
  agentId: z.string().optional().describe('The OpenAI Agent ID (optional).'),
});
export type GenerateContentForPlatformInput = z.infer<typeof GenerateContentForPlatformInputSchema>;

const GenerateContentForPlatformOutputSchema = z.object({
  content: z.string().describe('The generated content for the specified platform.'),
  imagePrompt: z.string().describe('The generated image prompt for the content.'),
});
export type GenerateContentForPlatformOutput = z.infer<typeof GenerateContentForPlatformOutputSchema>;

export async function generateContentForPlatform(
  input: GenerateContentForPlatformInput
): Promise<GenerateContentForPlatformOutput> {
  return generateContentForPlatformFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateContentForPlatformPrompt',
  input: {schema: GenerateContentForPlatformInputSchema},
  output: {schema: GenerateContentForPlatformOutputSchema},
  prompt: `You are an AI assistant specializing in generating content for various platforms.

You will generate content tailored for the specified platform based on the given topic.

Platform: {{{platform}}}
Topic: {{{topic}}}

Content:`, // Removed media since we are generating a prompt, not an image.
});

const generateContentForPlatformFlow = ai.defineFlow(
  {
    name: 'generateContentForPlatformFlow',
    inputSchema: GenerateContentForPlatformInputSchema,
    outputSchema: GenerateContentForPlatformOutputSchema,
  },
  async input => {
    const {platform} = input;
    let promptText = '';

    if (platform === 'Wordpress') {
      promptText = `Generate an HTML blog post about the topic: {{{topic}}}. Also, create image prompts every 200 words.`;
    } else if (platform === 'Instagram') {
      promptText = `Generate an engaging Instagram post about the topic: {{{topic}}}. Also, create a single optimized image prompt for the post.`;
    } else if (platform === 'Facebook') {
      promptText = `Generate a compelling Facebook post about the topic: {{{topic}}}. Also, create a single optimized image prompt for the post.`;
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const augmentedInput = {...input, prompt: promptText};

    const {output} = await prompt(augmentedInput);
    return output!;
  }
);
