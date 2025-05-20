'use server';
/**
 * @fileOverview AI agent for suggesting content themes, including titles and descriptions.
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

const ThemeSuggestionSchema = z.object({
  title: z.string().describe('A catchy and relevant title for a content piece based on the suggested theme.'),
  description: z.string().describe('A brief summary or angle for the content, suitable for use as an initial topic/brief in content creation (around 20-50 words).')
});

const SuggestThemesOutputSchema = z.object({
  themes: z.array(ThemeSuggestionSchema).describe('An array of suggested content themes, each with a title and description.'),
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
Each suggestion must include:
1.  A "title": This should be a catchy and relevant headline or title for a potential blog post, article, or social media series related to the theme.
2.  A "description": This should be a brief (20-50 words) summary, angle, or hook for the content. It should expand slightly on the title and be suitable for use as an initial brief or expanded topic when creating the actual content.

Return the suggestions as a JSON array of objects, where each object has a "title" and a "description" field.
Example for topic "Sustainable Living":
{
  "themes": [
    {
      "title": "Zero Waste Kitchen: A Beginner's Guide",
      "description": "Explore simple swaps and practical tips to significantly reduce food and packaging waste in your kitchen, making your home more eco-friendly."
    },
    {
      "title": "The Power of Composting: Turning Scraps into Garden Gold",
      "description": "Learn the basics of home composting, its benefits for your garden and the environment, and how to get started even in small spaces."
    }
  ]
}
`,
});

const suggestThemesFlow = ai.defineFlow(
  {
    name: 'suggestThemesFlow',
    inputSchema: SuggestThemesInputSchema,
    outputSchema: SuggestThemesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.themes) {
      throw new Error("AI failed to generate themes or the output was not in the expected format.");
    }
    return output;
  }
);
