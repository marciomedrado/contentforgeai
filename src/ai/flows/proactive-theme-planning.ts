'use server';
/**
 * @fileOverview AI agent for suggesting content themes.
 *
 * - suggestThemes - A function that suggests content themes.
 * - SuggestThemesInput - The input type for the suggestThemes function.
 * - SuggestThemesOutput - The return type for the suggestThemes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestThemesInputSchema = z.object({
  topic: z.string().describe('The general topic for theme suggestions.'),
  numSuggestions: z
    .number()
    .default(5)
    .describe('The number of theme suggestions to generate.'),
});
export type SuggestThemesInput = z.infer<typeof SuggestThemesInputSchema>;

const SuggestThemesOutputSchema = z.object({
  themes: z.array(z.string()).describe('An array of suggested content themes.'),
});
export type SuggestThemesOutput = z.infer<typeof SuggestThemesOutputSchema>;

export async function suggestThemes(input: SuggestThemesInput): Promise<SuggestThemesOutput> {
  return suggestThemesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestThemesPrompt',
  input: {schema: SuggestThemesInputSchema},
  output: {schema: SuggestThemesOutputSchema},
  prompt: `You are an AI content planning assistant. Generate {{numSuggestions}} content theme suggestions for the topic: {{{topic}}}. Return the themes as a JSON array of strings.`,
});

const suggestThemesFlow = ai.defineFlow(
  {
    name: 'suggestThemesFlow',
    inputSchema: SuggestThemesInputSchema,
    outputSchema: SuggestThemesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
