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
import type { Platform } from '@/lib/types';
import { DEFAULT_OUTPUT_LANGUAGE } from '@/lib/constants';

const GenerateContentForPlatformInputSchema = z.object({
  platform: z
    .enum(['Wordpress', 'Instagram', 'Facebook'])
    .describe('The platform for which the content is being generated.'),
  topic: z.string().describe('The topic of the content.'),
  wordCount: z.number().optional().describe('Approximate desired word count for the content.'),
  apiKey: z.string().describe('The OpenAI API key.'), 
  agentId: z.string().optional().describe('The OpenAI Agent ID (optional).'),
  outputLanguage: z.string().optional().default(DEFAULT_OUTPUT_LANGUAGE).describe('The desired output language for the content (e.g., "en", "pt", "es").'),
});
export type GenerateContentForPlatformInput = z.infer<typeof GenerateContentForPlatformInputSchema>;

const GenerateContentForPlatformOutputSchema = z.object({
  content: z.string().describe('The generated content for the specified platform.'),
  imagePrompt: z.string().describe('The generated image prompt for the content. Newline-separated if multiple for WordPress.'),
});
export type GenerateContentForPlatformOutput = z.infer<typeof GenerateContentForPlatformOutputSchema>;

const InternalPromptInputSchema = GenerateContentForPlatformInputSchema.extend({
    specificInstructions: z.string().describe('Detailed instructions tailored to the platform and requirements.')
});

const platformInstructions = (platform: Platform, wordCount?: number, outputLanguage?: string): string => {
  let specificInstructions = "";
  let langInstruction = `The content must be written in ${outputLanguage || 'English'}.`;
  let wordCountText = wordCount && wordCount > 0 ? ` aiming for approximately ${wordCount} words` : "";
  let detailInstruction = wordCount && wordCount > 0 ? `Ensure the content is comprehensive and detailed, fulfilling the requested word count. Avoid overly brief responses.` : `Ensure the content is comprehensive and detailed. Avoid overly brief responses.`;

  if (platform === 'Wordpress') {
    specificInstructions = `Generate a well-structured HTML blog post${wordCountText}. ${langInstruction} ${detailInstruction} The HTML MUST include:
- A main title (e.g., using <h1> or <h2>).
- Headings for sections (e.g., <h2>, <h3>, <h4>).
- Paragraphs (<p>) for text.
- Lists (<ul> or <ol> with <li> items) where appropriate.
The entire output for the 'content' field must be valid HTML, suitable for direct use in a blog. For example:
<article>
  <h1>Main Blog Post Title</h1>
  <p>This is an introductory paragraph.</p>
  <h2>First Section Title</h2>
  <p>Content for the first section...</p>
  <h3>Subsection Title</h3>
  <p>More details...</p>
  <ul>
    <li>List item 1</li>
    <li>List item 2</li>
  </ul>
  <h2>Second Section Title</h2>
  <p>Content for the second section...</p>
</article>
For image prompts: If the content is long, you can suggest multiple image prompts. Embed these as HTML comments within the HTML content, like <!-- IMAGE_PROMPT: A descriptive prompt -->. Then, consolidate ALL suggested image prompts (from comments or a main one) into the 'imagePrompt' output field, separated by newlines. If no specific in-content prompts are generated, provide one general image prompt.
The generated content should be ONLY the HTML for the blog post.`;
  } else if (platform === 'Instagram') {
    specificInstructions = `Generate an engaging Instagram post${wordCountText}. ${langInstruction} ${detailInstruction} The generated content should be the text for the Instagram post. Provide a single optimized image prompt in the 'imagePrompt' output field.`;
  } else if (platform === 'Facebook') {
    specificInstructions = `Generate a compelling Facebook post${wordCountText}. ${langInstruction} ${detailInstruction} The generated content should be the text for the Facebook post. Provide a single optimized image prompt in the 'imagePrompt' output field.`;
  } else {
    specificInstructions = `Generate content${wordCountText}. ${langInstruction} ${detailInstruction} Provide a suitable image prompt in the 'imagePrompt' output field.`;
  }
  return specificInstructions;
};

const contentGenerationPrompt = ai.definePrompt({
  name: 'generateContentForPlatformPrompt',
  input: {schema: InternalPromptInputSchema}, 
  output: {schema: GenerateContentForPlatformOutputSchema},
  prompt: `You are an AI assistant specializing in creating high-quality content for various online platforms.
Your task is to generate content for the '{{{platform}}}' platform, focusing on the topic '{{{topic}}}'.
The target language for the content is: {{{outputLanguage}}}.

Follow these specific instructions:
{{{specificInstructions}}}

Your response MUST be a JSON object matching the output schema.
The 'content' field should contain the main text or HTML as requested.
The 'imagePrompt' field should contain the suggested image prompt(s) (newline-separated if multiple were requested for WordPress).
`,
});

const generateContentForPlatformFlow = ai.defineFlow(
  {
    name: 'generateContentForPlatformFlow',
    inputSchema: GenerateContentForPlatformInputSchema,
    outputSchema: GenerateContentForPlatformOutputSchema,
  },
  async (input: GenerateContentForPlatformInput) => {
    const lang = input.outputLanguage || DEFAULT_OUTPUT_LANGUAGE;
    const instructions = platformInstructions(input.platform as Platform, input.wordCount, lang);
    
    const promptInput = {
      ...input,
      outputLanguage: lang,
      specificInstructions: instructions,
    };

    const {output} = await contentGenerationPrompt(promptInput);
    if (!output) {
      throw new Error("AI failed to generate content or match the output schema.");
    }
    return output;
  }
);

export async function generateContentForPlatform(
  input: GenerateContentForPlatformInput
): Promise<GenerateContentForPlatformOutput> {
  return generateContentForPlatformFlow(input);
}
