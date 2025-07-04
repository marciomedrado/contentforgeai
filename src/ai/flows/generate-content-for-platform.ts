
'use server';
/**
 * @fileOverview Generates content tailored for different platforms (Wordpress, Instagram, Facebook) using AI,
 * and supports refining existing content.
 *
 * - generateContentForPlatform - A function that handles the content generation process.
 * - GenerateContentForPlatformInput - The input type for the generateContentForPlatform function.
 * - GenerateContentForPlatformOutput - The return type for the generateContentForPlatform function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Platform } from '@/lib/types';
import { DEFAULT_OUTPUT_LANGUAGE, DEFAULT_NUMBER_OF_IMAGES } from '@/lib/constants';

const GenerateContentForPlatformInputSchema = z.object({
  platform: z
    .enum(['Wordpress', 'Instagram', 'Facebook'])
    .describe('The platform for which the content is being generated.'),
  topic: z.string().describe('The topic or brief for the content.'),
  title: z.string().optional().describe('The working title of the content, for context.'),
  wordCount: z.coerce.number().optional().describe('Approximate desired word count for the content.'),
  numberOfImages: z.coerce.number().min(0).optional().default(DEFAULT_NUMBER_OF_IMAGES).describe('The desired number of images for the content. For WordPress, >0 means embed, 0 means one general prompt. For others, one general prompt is always provided.'),
  outputLanguage: z.string().optional().default(DEFAULT_OUTPUT_LANGUAGE).describe('The desired output language for the content (e.g., "en", "pt", "es").'),
  manualReferenceTexts: z.array(z.string()).optional().describe("An array of manually added text snippets or notes to be used as additional reference material."),
  originalContent: z.string().optional().describe("Existing content to be refined. If provided, 'refinementInstructions' should also be provided."),
  refinementInstructions: z.string().optional().describe("Specific instructions on how to refine the 'originalContent'."),
  customInstructions: z.string().optional().describe('Additional custom instructions for the AI to follow, from a designated "Funcionario".'),
});
export type GenerateContentForPlatformInput = z.infer<typeof GenerateContentForPlatformInputSchema>;

const GenerateContentForPlatformOutputSchema = z.object({
  content: z.string().describe('The generated content for the specified platform. For Wordpress, this should be well-structured HTML. For other platforms, plain text.'),
  imagePrompt: z.string().describe('A generated image prompt suitable for the content. Newline-separated if multiple for WordPress when numberOfImages > 0, or a single general prompt.'),
});
export type GenerateContentForPlatformOutput = z.infer<typeof GenerateContentForPlatformOutputSchema>;

// Internal schema for Gemini prompt
const InternalPromptInputSchema = GenerateContentForPlatformInputSchema.extend({
    specificInstructions: z.string().describe('Detailed instructions tailored to the platform and requirements.')
});

const platformInstructionsForGemini = (
    platform: Platform,
    wordCount?: number,
    numberOfImages?: number,
    outputLanguage?: string,
    hasManualReferences?: boolean
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

  const requestedImages = numberOfImages === undefined ? 1 : numberOfImages;

  if (platform === 'Wordpress') {
    let imageEmbeddingInstructions = "";
    if (requestedImages > 0) {
      imageEmbeddingInstructions = `
You should include ${requestedImages} distinct image(s) in this blog post. Distribute these images appropriately within the content to enhance the post.
For EACH of these ${requestedImages} image(s) you want to include:
1. First, embed an HTML comment like <!-- IMAGE_PROMPT: Your descriptive image prompt here (e.g., A serene forest path in autumn) -->.
2. Immediately AFTER EACH such <!-- IMAGE_PROMPT: ... --> comment, you MUST insert a complete <img> tag as a placeholder.
   This <img> tag MUST be structured EXACTLY as follows:
   <img src="https://placehold.co/600x400.png" alt="[Image prompt text from comment]" data-ai-hint="[keyword1 keyword2]" />
   - The 'src' attribute MUST be 'https://placehold.co/600x400.png'.
   - The 'alt' attribute MUST be IDENTICAL to the text within the <!-- IMAGE_PROMPT: ... --> comment.
   - The 'data-ai-hint' attribute MUST contain one or, at most, two relevant keywords extracted from the image prompt (e.g., for "A serene forest path in autumn", use "forest path" or "autumn forest"). Do not use more than two words.
After generating all HTML content, consolidate ALL image prompts (from the <!-- IMAGE_PROMPT: ... --> comments) into the 'imagePrompt' output field of the JSON response, separated by newlines.
`;
    } else {
      imageEmbeddingInstructions = `
Do NOT embed any images or image prompts directly within the HTML content.
Instead, provide ONE single, general image prompt suitable for the entire article in the 'imagePrompt' output field of the JSON response.
`;
    }

    specificInstructions = `Generate a well-structured HTML blog post${wordCountText}. ${langInstruction} ${detailInstruction} ${referenceInstruction} The HTML MUST include:
- A main title (e.g., using <h1> or <h2>, considering the working title '{{{title}}}' if provided).
- Headings for sections (e.g., <h2>, <h3>, <h4>).
- Paragraphs (<p>) for text.
- Lists (<ul> or <ol> with <li> items) where appropriate.
The entire output for the 'content' field must be valid HTML. Example of overall structure (if embedding images):
<article>
  <h1>Main Blog Post Title (or based on '{{{title}}}')</h1>
  <p>This is an introductory paragraph.</p>
  <h2>First Section Title</h2>
  <p>Content for the first section...</p>
  <!-- IMAGE_PROMPT: A vibrant cityscape at dusk -->
  <img src="https://placehold.co/600x400.png" alt="A vibrant cityscape at dusk" data-ai-hint="cityscape dusk" />
  <p>More content...</p>
</article>
${imageEmbeddingInstructions}
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

// This prompt is for Gemini if OpenAI Agent is not used
const geminiContentGenerationPrompt = ai.definePrompt({
  name: 'generateContentForPlatformGeminiPrompt',
  input: {schema: InternalPromptInputSchema},
  output: {schema: GenerateContentForPlatformOutputSchema},
  prompt: `
{{#if customInstructions}}
Prioritize these User-Provided Instructions:
---
{{{customInstructions}}}
---
When generating content, ensure you adhere to these instructions above all else, while still fulfilling the core task described below.
{{/if}}

You are an AI assistant specializing in creating high-quality content for various online platforms.
{{#if originalContent}}
You are tasked with REFINING existing content based on specific instructions.
The original content was for platform '{{{platform}}}'{{#if title}} with the working title '{{{title}}}'{{/if}} and topic '{{{topic}}}'.

Original Content:
---
{{{originalContent}}}
---
Refinement Instructions:
---
{{{refinementInstructions}}}
---
Your goal is to generate a new version of the content.
This new version must:
1.  Incorporate the refinement instructions effectively.
2.  Remain suitable for the '{{{platform}}}' platform.
3.  Maintain the original topic '{{{topic}}}' and title '{{{title}}}' as its core context.
4.  Be in the language '{{{outputLanguage}}}'.
5.  {{#if wordCount}}Aim for approximately {{{wordCount}}} words.{{else}}Ensure comprehensive and detailed content.{{/if}}
6.  {{#if manualReferenceTexts}}Incorporate these additional Manual Notes/References as relevant:
    {{#each manualReferenceTexts}}
    - {{{this}}}
    {{/each}}
    {{/if}}
7.  Follow the platform-specific content structure and image prompt requirements as detailed below. Image prompts should be generated based on the REFINED content.

{{else}}
Your task is to generate NEW content for the '{{{platform}}}' platform, focusing on the topic '{{{topic}}}'{{#if title}} with the working title '{{{title}}}'{{/if}}.
The target language for the content is: {{{outputLanguage}}}.
{{#if wordCount}}Aim for approximately {{{wordCount}}} words.{{else}}Ensure comprehensive and detailed content.{{/if}}
The user has requested approximately {{#if numberOfImages}}{{numberOfImages}}{{else}}1 (general concept for non-WordPress, or as per WordPress instructions for 0 images specified){{/if}} image(s).

{{#if manualReferenceTexts}}
Additional Manual Notes/References (Incorporate these as relevant):
{{#each manualReferenceTexts}}
- {{{this}}}
{{/each}}
{{/if}}
{{/if}}

Platform-Specific Instructions (Content Structure, Image Placeholders, etc.):
{{{specificInstructions}}}

Your response MUST be a JSON object matching the output schema.
The 'content' field should contain the main text or HTML as requested.
The 'imagePrompt' field should contain the suggested image prompt(s) (newline-separated if multiple for WordPress as per instructions, or a single general prompt).
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
    const agentId = process.env.OPENAI_AGENT_ID;
    const apiKey = process.env.OPENAI_API_KEY;

    if (agentId && apiKey) {
      console.log(`Using OpenAI Agent ${agentId} for content generation.`);
      const assistantInput = {
        platform: input.platform,
        topic: input.topic,
        title: input.title,
        wordCount: input.wordCount,
        numberOfImages: input.platform === 'Wordpress' ? (input.numberOfImages === undefined ? DEFAULT_NUMBER_OF_IMAGES : input.numberOfImages) : undefined,
        outputLanguage: lang,
        manualReferenceTexts: input.manualReferenceTexts,
        originalContent: input.originalContent,
        refinementInstructions: input.refinementInstructions,
        customInstructions: input.customInstructions,
        desiredOutputFormat: "A JSON object with 'content' (string) and 'imagePrompt' (string). Content should be HTML for Wordpress, plain text otherwise. Image prompt should be newline-separated for multiple WordPress images, or single otherwise. All text in the specified outputLanguage."
      };

      let systemInstructions = `You are an AI content generation assistant.
      The user has provided details for content generation or refinement:
      - Platform: ${assistantInput.platform}
      - Topic: ${assistantInput.topic}
      ${assistantInput.title ? `- Title: ${assistantInput.title}` : ''}
      ${assistantInput.wordCount ? `- Word Count: Approx. ${assistantInput.wordCount}` : ''}
      ${assistantInput.platform === 'Wordpress' && assistantInput.numberOfImages !== undefined ? `- Number of Images (WP): ${assistantInput.numberOfImages}` : ''}
      - Output Language: ${assistantInput.outputLanguage}
      ${assistantInput.manualReferenceTexts && assistantInput.manualReferenceTexts.length > 0 ? `- Manual References: ${assistantInput.manualReferenceTexts.join('; ')}` : ''}
      ${assistantInput.originalContent ? `- Original Content (to refine): Provided in input` : ''}
      ${assistantInput.refinementInstructions ? `- Refinement Instructions: ${assistantInput.refinementInstructions}` : ''}
      ${assistantInput.customInstructions ? `- Custom Instructions (Prioritize these): ${assistantInput.customInstructions}` : ''}

      Your response MUST be a single, valid JSON object strictly conforming to:
      {
        "content": "string (HTML for Wordpress, plain text otherwise, in ${assistantInput.outputLanguage})",
        "imagePrompt": "string (newline-separated for multiple WP images, single otherwise, in ${assistantInput.outputLanguage})"
      }
      For WordPress, if numberOfImages > 0, embed <!-- IMAGE_PROMPT: ... --> comments and <img src="https://placehold.co/600x400.png" alt="[prompt]" data-ai-hint="[keywords]" /> placeholders. Consolidate all prompts into the imagePrompt field, newline-separated. If numberOfImages is 0 for WordPress, provide one general imagePrompt. For other platforms, one general imagePrompt.
      Do NOT include any other text, explanations, or markdown formatting outside of this JSON structure.`;


      try {
        const {output} = await ai.runAssistant({
          assistantId: agentId,
          input: assistantInput,
          instructions: systemInstructions,
        });

        if (typeof output === 'string') {
          const parsedOutput = JSON.parse(output as string);
          const validationResult = GenerateContentForPlatformOutputSchema.safeParse(parsedOutput);
          if (validationResult.success) {
            return validationResult.data;
          } else {
            console.error("OpenAI Agent output failed Zod validation:", validationResult.error);
            throw new Error(`OpenAI Agent output format error: ${validationResult.error.message}`);
          }
        } else if (typeof output === 'object' && output !== null) {
           const validationResult = GenerateContentForPlatformOutputSchema.safeParse(output);
           if (validationResult.success) {
            return validationResult.data;
          } else {
            console.error("OpenAI Agent object output failed Zod validation:", validationResult.error);
            throw new Error(`OpenAI Agent object output format error: ${validationResult.error.message}`);
          }
        }
        throw new Error("OpenAI Agent returned an unexpected output type.");
      } catch (e) {
        console.error("Error running OpenAI assistant for content generation, falling back to Gemini:", e);
        // Fallback
      }
    }

    // Fallback to Gemini
    console.log("Using Gemini prompt for content generation.");
    const geminiInstructions = platformInstructionsForGemini(
        input.platform as Platform,
        input.wordCount,
        input.numberOfImages,
        lang,
        !!(input.manualReferenceTexts && input.manualReferenceTexts.length > 0)
    );

    const geminiPromptInput: z.infer<typeof InternalPromptInputSchema> = {
      ...input,
      outputLanguage: lang,
      specificInstructions: geminiInstructions,
    };

    const {output} = await geminiContentGenerationPrompt(geminiPromptInput);
    if (!output) {
      throw new Error("AI (Gemini) failed to generate content or match the output schema.");
    }
    return output;
  }
);

export async function generateContentForPlatform(
  input: GenerateContentForPlatformInput
): Promise<GenerateContentForPlatformOutput> {
  return generateContentForPlatformFlow(input);
}
