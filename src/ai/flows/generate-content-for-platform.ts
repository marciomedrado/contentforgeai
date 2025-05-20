
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
import type { Platform, ReferenceMaterial } from '@/lib/types';
import { DEFAULT_OUTPUT_LANGUAGE } from '@/lib/constants';

const GenerateContentForPlatformInputSchema = z.object({
  platform: z
    .enum(['Wordpress', 'Instagram', 'Facebook'])
    .describe('The platform for which the content is being generated.'),
  topic: z.string().describe('The topic or brief for the content.'),
  wordCount: z.number().optional().describe('Approximate desired word count for the content.'),
  apiKey: z.string().describe('The OpenAI API key.'), 
  agentId: z.string().optional().describe('The OpenAI Agent ID (optional).'),
  outputLanguage: z.string().optional().default(DEFAULT_OUTPUT_LANGUAGE).describe('The desired output language for the content (e.g., "en", "pt", "es").'),
  referenceItems: z.array(z.object({
    title: z.string().describe("Title of the reference material/URL."),
    url: z.string().describe("URL of the reference material."),
    summary: z.string().describe("Detailed summary or transcribed text from the reference material."),
    abntCitation: z.string().optional().describe("ABNT citation for the URL, if available."),
  })).optional().describe("An array of research items (URL, title, summary, ABNT citation) to be used as primary source material. The AI should base its content heavily on these and cite them."),
  manualReferenceTexts: z.array(z.string()).optional().describe("An array of manually added text snippets or notes to be used as additional reference material."),
});
export type GenerateContentForPlatformInput = z.infer<typeof GenerateContentForPlatformInputSchema>;

const GenerateContentForPlatformOutputSchema = z.object({
  content: z.string().describe('The generated content for the specified platform. For Wordpress, this should be well-structured HTML. For other platforms, plain text. Should include ABNT references if referenceItems were provided.'),
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
    hasReferenceItems?: boolean,
    hasManualReferences?: boolean
  ): string => {
  let specificInstructions = "";
  let langInstruction = `The content MUST be written in ${outputLanguage || DEFAULT_OUTPUT_LANGUAGE}.`;
  let wordCountText = wordCount && wordCount > 0 ? ` aiming for approximately ${wordCount} words` : "";
  let detailInstruction = wordCount && wordCount > 0 ? `Ensure the content is comprehensive and detailed, fulfilling the requested word count. Avoid overly brief responses.` : `Ensure the content is comprehensive and detailed. Avoid overly brief responses.`;
  let referenceInstruction = "";

  if (hasReferenceItems) {
    referenceInstruction = `
IMPORTANT: You have been provided with 'referenceItems' (research summaries/texts and their original URLs).
Base your content HEAVILY on these provided referenceItems. Synthesize information from them.
At the end of the generated content, you MUST include a "Referências" (or equivalent in the target language) section.
List all used reference URLs in this section, formatted according to ABNT standards.
Use the provided 'abntCitation' field from referenceItems if available and accurate for the target language; otherwise, generate a proper ABNT citation for the URL.
Example of ABNT citation for a webpage:
SOBRENOME, Nome. Título da página. Nome do site, ano. Disponível em: <URL>. Acesso em: dia mês ano.
(Adapt the access date to be the current date, and ensure the citation is in the {{{outputLanguage}}}).
If no 'abntCitation' is provided for an item, create one.
`;
  }
  if (hasManualReferences) {
    referenceInstruction += `
You have also been provided with 'manualReferenceTexts'. These are additional notes or text snippets. Incorporate information from these manual references into your content as relevant. These do not need to be cited in the ABNT style unless they represent published works with URLs (which is not expected for this input type).
`;
  }


  if (platform === 'Wordpress') {
    specificInstructions = `Generate a well-structured HTML blog post${wordCountText}. ${langInstruction} ${detailInstruction} ${referenceInstruction} The HTML MUST include:
- A main title (e.g., using <h1> or <h2>).
- Headings for sections (e.g., <h2>, <h3>, <h4>).
- Paragraphs (<p>) for text.
- Lists (<ul> or <ol> with <li> items) where appropriate.
The entire output for the 'content' field must be valid HTML. Example:
<article>
  <h1>Main Blog Post Title</h1>
  <p>This is an introductory paragraph.</p>
  <h2>First Section Title</h2>
  <p>Content for the first section...</p>
  {{#if referenceItems}}
  <h2>Referências</h2>
  <ul>
    <li>AUTOR, A. Título do Artigo. Nome do Site, Ano. Disponível em: URL. Acesso em: DD Mmm. YYYY.</li>
  </ul>
  {{/if}}
</article>
For image prompts: If the content is long, you can suggest multiple image prompts. Embed these as HTML comments within the HTML content, like <!-- IMAGE_PROMPT: A descriptive prompt -->. Then, consolidate ALL suggested image prompts (from comments or a main one) into the 'imagePrompt' output field, separated by newlines. If no specific in-content prompts are generated, provide one general image prompt.
The generated content should be ONLY the HTML for the blog post.`;
  } else if (platform === 'Instagram') {
    specificInstructions = `Generate an engaging Instagram post${wordCountText}. ${langInstruction} ${detailInstruction} ${referenceInstruction} The generated content should be the text for the Instagram post. Provide a single optimized image prompt in the 'imagePrompt' output field. Include the ABNT references at the end of the post text if referenceItems were used.`;
  } else if (platform === 'Facebook') {
    specificInstructions = `Generate a compelling Facebook post${wordCountText}. ${langInstruction} ${detailInstruction} ${referenceInstruction} The generated content should be the text for the Facebook post. Provide a single optimized image prompt in the 'imagePrompt' output field. Include the ABNT references at the end of the post text if referenceItems were used.`;
  } else {
    specificInstructions = `Generate content${wordCountText}. ${langInstruction} ${detailInstruction} ${referenceInstruction} Provide a suitable image prompt in the 'imagePrompt' output field. Include the ABNT references at the end of the text if referenceItems were used.`;
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

{{#if referenceItems}}
Reference Materials (Use these extensively and cite them in ABNT format):
{{#each referenceItems}}
- Title: {{{this.title}}}
  URL: {{{this.url}}}
  Summary/Text: {{{this.summary}}}
  {{#if this.abntCitation}}Provided ABNT: {{{this.abntCitation}}}{{/if}}
{{/each}}
{{/if}}

{{#if manualReferenceTexts}}
Additional Manual Notes/References (Incorporate these as relevant):
{{#each manualReferenceTexts}}
- {{{this}}}
{{/each}}
{{/if}}

Follow these specific instructions for content structure and references:
{{{specificInstructions}}}

Your response MUST be a JSON object matching the output schema.
The 'content' field should contain the main text or HTML as requested.
The 'imagePrompt' field should contain the suggested image prompt(s) (newline-separated if multiple for WordPress).
Ensure all ABNT citations are correctly formatted for the language '{{{outputLanguage}}}' and refer to the current date for "Acesso em:".
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
        !!(input.referenceItems && input.referenceItems.length > 0),
        !!(input.manualReferenceTexts && input.manualReferenceTexts.length > 0)
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
