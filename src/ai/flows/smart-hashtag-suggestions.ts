
'use server';
/**
 * @fileOverview AI agent that suggests relevant hashtags for Instagram and Facebook posts based on content analysis and current trends,
 * or general keywords/long-tail search terms if platform is "general".
 *
 * - suggestHashtags - A function that suggests relevant hashtags/keywords for a given text.
 * - SuggestHashtagsInput - The input type for the suggestHashtags function.
 * - SuggestHashtagsOutput - The return type for the suggestHashtags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestHashtagsInputSchema = z.object({
  text: z
    .string()
    .describe('The text content of the post for which hashtags/keywords are to be suggested.'),
  platform: z
    .enum(['instagram', 'facebook', 'general'])
    .describe('The social media platform ("instagram", "facebook") or "general" for broad keyword/long-tail search term suggestions.'),
  customInstructions: z.string().optional().describe('Additional custom instructions for the AI to follow, from a designated "Funcionario".'),
});
export type SuggestHashtagsInput = z.infer<typeof SuggestHashtagsInputSchema>;

const SuggestHashtagsOutputSchema = z.object({
  hashtags: z
    .array(z.string())
    .describe('An array of suggested hashtags/keywords/long-tail search terms relevant to the input text and platform.'),
});
export type SuggestHashtagsOutput = z.infer<typeof SuggestHashtagsOutputSchema>;

export async function suggestHashtags(input: SuggestHashtagsInput): Promise<SuggestHashtagsOutput> {
  return suggestHashtagsFlow(input);
}

// This prompt is for Gemini if OpenAI Agent is not used
const geminiPrompt = ai.definePrompt({
  name: 'suggestHashtagsGeminiPrompt',
  input: {schema: SuggestHashtagsInputSchema},
  output: {schema: SuggestHashtagsOutputSchema},
  prompt: `
{{#if customInstructions}}
Prioritize these User-Provided Instructions:
---
{{{customInstructions}}}
---
When generating suggestions, ensure you adhere to these instructions above all else, while still fulfilling the core task.
{{/if}}

You are an expert in social media engagement and keyword generation.
Given the content of a post or topic, you will suggest relevant items.

Content: {{{text}}}
Platform: {{{platform}}}

If the platform is 'instagram' or 'facebook', suggest relevant and trending hashtags. These hashtags MUST start with '#'.
If the platform is 'general', suggest general keywords or long-tail search terms (typically 3-7 words each). These should be suitable for SEO or content inspiration and MUST NOT start with '#'.

Suggest items that are specific to the content. If a specific platform is mentioned, consider trending items for it.
Do not include any explanation or introductory text, only the suggested items in a JSON array.
Return no more than 10 items.

Your response MUST be a JSON object matching the output schema.
Example:
{
  "hashtags": ["#example", "#suggestion"]
}
Or for 'general' platform:
{
  "hashtags": ["example keyword phrase", "another search term"]
}
`,
});

const suggestHashtagsFlow = ai.defineFlow(
  {
    name: 'suggestHashtagsFlow',
    inputSchema: SuggestHashtagsInputSchema,
    outputSchema: SuggestHashtagsOutputSchema,
  },
  async (input: SuggestHashtagsInput) => {
    const agentId = process.env.OPENAI_AGENT_ID;
    const apiKey = process.env.OPENAI_API_KEY;

    if (agentId && apiKey) {
      console.log(`Using OpenAI Agent ${agentId} for hashtag/keyword suggestions.`);
      const assistantInput = {
        text: input.text,
        platform: input.platform,
        customInstructions: input.customInstructions,
        desiredOutputFormat: "A JSON object with an 'hashtags' (array of strings) field. Max 10 items. Hashtags start with # for social, no # for general keywords."
      };

      try {
        const {output} = await ai.runAssistant({
          assistantId: agentId,
          input: assistantInput,
          instructions: `You are an expert in social media engagement and keyword generation.
          Given the content of a post or topic, suggest relevant items.
          - Text: (see 'text' in input)
          - Platform: ${assistantInput.platform}
          ${assistantInput.customInstructions ? `- Custom Instructions (Prioritize these): ${assistantInput.customInstructions}` : ''}

          If platform is 'instagram' or 'facebook', suggest hashtags (MUST start with '#').
          If platform is 'general', suggest keywords/long-tail search terms (MUST NOT start with '#').
          Max 10 items.

          Your response MUST be a single, valid JSON object strictly conforming to:
          {
            "hashtags": ["string", "string", ...] // Array of up to 10 strings
          }
          Do NOT include any other text, explanations, or markdown formatting outside of this JSON structure.`,
        });

        if (typeof output === 'string') {
          const parsedOutput = JSON.parse(output as string);
          const validationResult = SuggestHashtagsOutputSchema.safeParse(parsedOutput);
          if (validationResult.success) {
            return validationResult.data;
          } else {
            console.error("OpenAI Agent output failed Zod validation:", validationResult.error);
            throw new Error(`OpenAI Agent output format error: ${validationResult.error.message}`);
          }
        } else if (typeof output === 'object' && output !== null) {
           const validationResult = SuggestHashtagsOutputSchema.safeParse(output);
           if (validationResult.success) {
            return validationResult.data;
          } else {
            console.error("OpenAI Agent object output failed Zod validation:", validationResult.error);
            throw new Error(`OpenAI Agent object output format error: ${validationResult.error.message}`);
          }
        }
        throw new Error("OpenAI Agent returned an unexpected output type.");
      } catch (e) {
        console.error("Error running OpenAI assistant for hashtag suggestions, falling back to Gemini:", e);
        // Fallback
      }
    }

    // Fallback to Gemini
    console.log("Using Gemini prompt for hashtag/keyword suggestions.");
    const {output} = await geminiPrompt(input);
    if (!output || !output.hashtags) {
        console.warn("AI (Gemini) output for suggestHashtags was null or hashtags array was missing:", output);
        return { hashtags: [] };
    }
    return output;
  }
);
