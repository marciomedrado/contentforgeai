// Implemented with Genkit
'use server';
/**
 * @fileOverview AI agent that suggests relevant hashtags for Instagram and Facebook posts based on content analysis and current trends.
 *
 * - suggestHashtags - A function that suggests relevant hashtags for a given text.
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
    .enum(['instagram', 'facebook'])
    .describe('The social media platform for which hashtags are being generated.'),
});
export type SuggestHashtagsInput = z.infer<typeof SuggestHashtagsInputSchema>;

const SuggestHashtagsOutputSchema = z.object({
  hashtags: z
    .array(z.string())
    .describe('An array of suggested hashtags relevant to the input text and platform.'),
});
export type SuggestHashtagsOutput = z.infer<typeof SuggestHashtagsOutputSchema>;

export async function suggestHashtags(input: SuggestHashtagsInput): Promise<SuggestHashtagsOutput> {
  return suggestHashtagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestHashtagsPrompt',
  input: {schema: SuggestHashtagsInputSchema},
  output: {schema: SuggestHashtagsOutputSchema},
  prompt: `You are an expert in social media engagement. Given the content of a post, you will suggest relevant and trending hashtags for a specific social media platform.

  Content: {{{text}}}
  Platform: {{{platform}}}

  Suggest hashtags that are specific to the content and also trending on the specified platform.  Do not include any explanation or introductory text, only the hashtags.
  Return no more than 10 hashtags.
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
