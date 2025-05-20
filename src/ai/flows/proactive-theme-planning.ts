
'use server';
/**
 * @fileOverview AI agent for suggesting content themes, including titles, descriptions, and keywords.
 *
 * - suggestThemes - A function that suggests content themes.
 * - SuggestThemesInput - The input type for the suggestThemes function.
 * - SuggestThemesOutput - The return type for the suggestThemes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { DEFAULT_OUTPUT_LANGUAGE } from '@/lib/constants';

const SuggestThemesInputSchema = z.object({
  topic: z.string().describe('The general topic for theme suggestions.'),
  numSuggestions: z
    .number()
    .default(5)
    .describe('The number of theme suggestions to generate.'),
  outputLanguage: z.string().optional().default(DEFAULT_OUTPUT_LANGUAGE).describe('The desired output language for the themes (e.g., "en", "pt", "es").'),
});
export type SuggestThemesInput = z.infer<typeof SuggestThemesInputSchema>;

const ThemeSuggestionSchema = z.object({
  title: z.string().describe('A catchy and relevant title for a content piece based on the suggested theme. Must be in the target output language.'),
  description: z.string().describe('A brief summary or angle for the content (around 20-50 words), suitable for use as an initial topic/brief. Must be in the target output language.'),
  keywords: z.array(z.string()).length(5).describe('An array of exactly 5 relevant keywords or short phrases for the theme, useful for SEO or content focusing. Must be in the target output language.')
});

const SuggestThemesOutputSchema = z.object({
  themes: z.array(ThemeSuggestionSchema).describe('An array of suggested content themes, each with a title, description, and keywords.'),
});
export type SuggestThemesOutput = z.infer<typeof SuggestThemesOutputSchema>;

export async function suggestThemes(input: SuggestThemesInput): Promise<SuggestThemesOutput> {
  return suggestThemesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestThemesPrompt',
  input: {schema: SuggestThemesInputSchema},
  output: {schema: SuggestThemesOutputSchema},
  prompt: `You are an AI content planning assistant. Generate {{numSuggestions}} content theme suggestions for the general topic: {{{topic}}}.
All output (titles, descriptions, keywords) MUST be in the language: {{{outputLanguage}}}.

Each suggestion must include:
1.  A "title": This should be a catchy and relevant headline or title for a potential blog post, article, or social media series related to the theme.
2.  A "description": This should be a brief (20-50 words) summary, angle, or hook for the content. It should expand slightly on the title and be suitable for use as an initial brief or expanded topic when creating the actual content.
3.  "keywords": An array of exactly 5 relevant keywords or short keyphrases (1-3 words each) for the theme. These keywords should be highly relevant to the title and description, suitable for SEO or content focus.

Return the suggestions as a JSON object with a "themes" array, where each object has "title", "description", and "keywords" fields.
Example for topic "Sustainable Living" in English:
{
  "themes": [
    {
      "title": "Zero Waste Kitchen: A Beginner's Guide",
      "description": "Explore simple swaps and practical tips to significantly reduce food and packaging waste in your kitchen, making your home more eco-friendly.",
      "keywords": ["zero waste", "sustainable kitchen", "eco-friendly home", "reduce waste", "beginner guide"]
    },
    {
      "title": "The Power of Composting: Turning Scraps into Garden Gold",
      "description": "Learn the basics of home composting, its benefits for your garden and the environment, and how to get started even in small spaces.",
      "keywords": ["composting", "garden gold", "soil health", "organic gardening", "waste reduction"]
    }
  ]
}

Ensure the entire response is a single, valid JSON object matching the defined output schema.
The language for all generated text must be: {{{outputLanguage}}}.
`,
});

const suggestThemesFlow = ai.defineFlow(
  {
    name: 'suggestThemesFlow',
    inputSchema: SuggestThemesInputSchema,
    outputSchema: SuggestThemesOutputSchema,
  },
  async (input: SuggestThemesInput) => {
    const lang = input.outputLanguage || DEFAULT_OUTPUT_LANGUAGE;
    const promptInput = {
        ...input,
        outputLanguage: lang,
    };
    const {output} = await prompt(promptInput);
    if (!output || !output.themes) {
      throw new Error("AI failed to generate themes or the output was not in the expected format.");
    }
    return output;
  }
);
