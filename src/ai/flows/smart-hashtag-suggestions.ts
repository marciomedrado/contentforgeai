// Implemented with Genkit
'use server';
/**
 * @fileOverview AI agent that suggests relevant hashtags for Instagram and Facebook posts based on content analysis and current trends,
 * or general keywords if platform is "general".
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
    .describe('The text content of the post for which hashtags are to be suggested.'),
  platform: z
    .enum(['instagram', 'facebook', 'general'])
    .describe('The social media platform ("instagram", "facebook") or "general" for broad keyword suggestions.'),
});
export type SuggestHashtagsInput = z.infer<typeof SuggestHashtagsInputSchema>;

const SuggestHashtagsOutputSchema = z.object({
  hashtags: z
    .array(z.string())
    .describe('An array of suggested hashtags/keywords relevant to the input text and platform.'),
});
export type SuggestHashtagsOutput = z.infer<typeof SuggestHashtagsOutputSchema>;

export async function suggestHashtags(input: SuggestHashtagsInput): Promise<SuggestHashtagsOutput> {
  return suggestHashtagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestHashtagsPrompt',
  input: {schema: SuggestHashtagsInputSchema},
  output: {schema: SuggestHashtagsOutputSchema},
  prompt: `You are an expert in social media engagement and keyword generation.
Given the content of a post or topic, you will suggest relevant and trending hashtags if the platform is 'instagram' or 'facebook'.
If the platform is 'general', you will suggest general keywords or keyphrases.

Content: {{{text}}}
Platform: {{{platform}}}

Suggest hashtags or keywords that are specific to the content. If a specific platform is mentioned, consider trending items for it.
Do not include any explanation or introductory text, only the hashtags or keywords.
Return no more than 10 items.
If suggesting hashtags, ensure they start with '#'. If suggesting keywords, they should not.
`,
});

const suggestHashtagsFlow = ai.defineFlow(
  {
    name: 'suggestHashtagsFlow',
    inputSchema: SuggestHashtagsInputSchema,
    outputSchema: SuggestHashtagsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
