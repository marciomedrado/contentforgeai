
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
  topic: z.string().describe('The topic or brief for the content.'),
  wordCount: z.coerce.number().optional().describe('Approximate desired word count for the content.'),
  outputLanguage: z.string().optional().default(DEFAULT_OUTPUT_LANGUAGE).describe('The desired output language for the content (e.g., "en", "pt", "es").'),
  manualReferenceTexts: z.array(z.string()).optional().describe("An array of manually added text snippets or notes to be used as additional reference material."),
  referenceItems: z.array(z.object({ summary: z.string(), url: z.string() })).optional().describe("An array of research items (summary and URL) to be used as primary reference material. These items should be cited in ABNT format if used."),
  agentId: z.string().optional().describe('The OpenAI Agent ID (optional).'), // Kept for potential future use if OpenAI direct calls are re-enabled
});
export type GenerateContentForPlatformInput = z.infer<typeof GenerateContentForPlatformInputSchema>;

const GenerateContentForPlatformOutputSchema = z.object({
  content: z.string().describe('The generated content for the specified platform. For Wordpress, this should be well-structured HTML. For other platforms, plain text.'),
  imagePrompt: z.string().describe('A generated image prompt suitable for the content. Newline-separated if multiple for WordPress.'),
});
export type GenerateContentForPlatformOutput = z.infer<typeof GenerateContentForPlatformOutputSchema>;

const InternalPromptInputSchema = GenerateContentForPlatformInputSchema.extend({
    specificInstructions: z.string().describe('Detailed instructions tailored to the platform and requirements.')
});

const platformInstructions = (
    platform: Platform, 
    wordCount?: number, 
    outputLanguage?: string, 
    hasManualReferences?: boolean,
    hasReferenceItems?: boolean
  ): string => {
  let specificInstructions = "";
  let langInstruction = `The content MUST be written in ${outputLanguage || DEFAULT_OUTPUT_LANGUAGE}.`;
  let wordCountText = wordCount && wordCount > 0 ? ` aiming for approximately ${wordCount} words` : "";
  let detailInstruction = wordCount && wordCount > 0 ? `Ensure the content is comprehensive and detailed, fulfilling the requested word count. Avoid overly brief responses.` : `Ensure the content is comprehensive and detailed. Avoid overly brief responses.`;
  let referenceInstruction = "";

  if (hasManualReferences) {
    referenceInstruction += `
You have been provided with 'manualReferenceTexts'. These are additional notes or text snippets. Incorporate information from these manual references into your content as relevant.
`;
  }

  if (hasReferenceItems) {
    referenceInstruction += `
You have also been provided with 'referenceItems' (each containing a 'summary' and its original 'url'). These items are primary source materials.
Base your content heavily on these provided 'referenceItems'.
If you use information from any 'referenceItem', you MUST cite its original 'url' in a "References" section at the end of the content. Use ABNT format for citations. For example: NOME DO SITE. Título do artigo. Disponível em: <URL>. Acesso em: dd mmm. yyyy. (Use the current date for "Acesso em").
`;
  }


  if (platform === 'Wordpress') {
    specificInstructions = `Generate a well-structured HTML blog post${wordCountText}. ${langInstruction} ${detailInstruction} ${referenceInstruction} The HTML MUST include:
- A main title (e.g., using <h1> or <h2>).
- Headings for sections (e.g., <h2>, <h3>, <h4>).
- Paragraphs (<p>) for text.
- Lists (<ul> or <ol> with <li> items) where appropriate.
The entire output for the 'content' field must be valid HTML. Example of overall structure:
<article>
  <h1>Main Blog Post Title</h1>
  <p>This is an introductory paragraph.</p>
  <h2>First Section Title</h2>
  <p>Content for the first section...</p>
  <!-- IMAGE_PROMPT: A vibrant cityscape at dusk -->
  <img src="https://placehold.co/600x400.png" alt="A vibrant cityscape at dusk" data-ai-hint="cityscape dusk" />
  <p>More content...</p>
  ${hasReferenceItems ? '<h2>References</h2>\n  <ul>\n    <li>NOME DO SITE. Título do artigo. Disponível em: &lt;URL_UTILIZADA&gt;. Acesso em: dd mmm. yyyy.</li>\n  </ul>' : ''}
</article>

Image Prompt Instructions for WordPress:
If you suggest an image, first embed an HTML comment like <!-- IMAGE_PROMPT: Your descriptive image prompt here (e.g., A serene forest path in autumn) -->.
Immediately AFTER EACH such <!-- IMAGE_PROMPT: ... --> comment, you MUST insert a complete <img> tag as a placeholder.
This <img> tag MUST be structured EXACTLY as follows:
<img src="https://placehold.co/600x400.png" alt="[Image prompt text from comment]" data-ai-hint="[keyword1 keyword2]" />
- The 'src' attribute MUST be 'https://placehold.co/600x400.png'.
- The 'alt' attribute MUST be IDENTICAL to the text within the <!-- IMAGE_PROMPT: ... --> comment.
- The 'data-ai-hint' attribute MUST contain one or, at most, two relevant keywords extracted from the image prompt (e.g., for "A serene forest path in autumn", use "forest path" or "autumn forest"). Do not use more than two words.
After generating all HTML content, consolidate ALL image prompts (from the <!-- IMAGE_PROMPT: ... --> comments) into the 'imagePrompt' output field of the JSON response, separated by newlines. If no in-content prompts are made, provide one general image prompt in the 'imagePrompt' field.
The generated content for the 'content' field should be ONLY the HTML for the blog post.`;
  } else if (platform === 'Instagram') {
    specificInstructions = `Generate an engaging Instagram post${wordCountText}. ${langInstruction} ${detailInstruction} ${referenceInstruction} The generated content should be the text for the Instagram post. Provide a single optimized image prompt in the 'imagePrompt' output field.`;
  } else if (platform === 'Facebook') {
    specificInstructions = `Generate a compelling Facebook post${wordCountText}. ${langInstruction} ${detailInstruction} ${referenceInstruction} The generated content should be the text for the Facebook post. Provide a single optimized image prompt in the 'imagePrompt' output field.`;
  } else {
    specificInstructions = `Generate content${wordCountText}. ${langInstruction} ${detailInstruction} ${referenceInstruction} Provide a suitable image prompt in the 'imagePrompt' output field.`;
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

{{#if manualReferenceTexts}}
Additional Manual Notes/References (Incorporate these as relevant):
{{#each manualReferenceTexts}}
- {{{this}}}
{{/each}}
{{/if}}

{{#if referenceItems}}
Primary Reference Materials (Base your content heavily on these items and cite their URLs in ABNT format if used, as per platform instructions):
{{#each referenceItems}}
Reference URL: {{{this.url}}}
Reference Summary/Content:
{{{this.summary}}}
---
{{/each}}
{{/if}}

Follow these specific instructions for content structure, image placeholders (if applicable), and references:
{{{specificInstructions}}}

Your response MUST be a JSON object matching the output schema.
The 'content' field should contain the main text or HTML as requested.
The 'imagePrompt' field should contain the suggested image prompt(s) (newline-separated if multiple for WordPress).
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
    const instructions = platformInstructions(
        input.platform as Platform, 
        input.wordCount, 
        lang,
        !!(input.manualReferenceTexts && input.manualReferenceTexts.length > 0),
        !!(input.referenceItems && input.referenceItems.length > 0)
    );
    
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
