
'use server';
/**
 * @fileOverview AI agent for summarizing text.
 *
 * - summarizeText - A function that summarizes a given text.
 * - SummarizeTextInput - The input type for the summarizeText function.
 * - SummarizeTextOutput - The return type for the summarizeText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit'; // Genkit 1.x re-exports z from Zod
import { DEFAULT_OUTPUT_LANGUAGE } from '@/lib/constants';

const SummarizeTextInputSchema = z.object({
  textToSummarize: z.string().min(1).describe('The text content to be summarized.'),
  outputLanguage: z.string().optional().default(DEFAULT_OUTPUT_LANGUAGE).describe('The desired output language for the summary (e.g., "en", "pt", "es").'),
});
export type SummarizeTextInput = z.infer<typeof SummarizeTextInputSchema>;

const SummarizeTextOutputSchema = z.object({
  summary: z.string().describe('The generated summary of the input text.'),
});
export type SummarizeTextOutput = z.infer<typeof SummarizeTextOutputSchema>;

export async function summarizeText(input: SummarizeTextInput): Promise<SummarizeTextOutput> {
  return summarizeTextFlow(input);
}

const summarizeTextPrompt = ai.definePrompt({
  name: 'summarizeTextPrompt',
  input: {schema: SummarizeTextInputSchema},
  output: {schema: SummarizeTextOutputSchema},
  prompt: `You are an expert text summarizer. Your task is to read the following text and provide a concise, well-organized summary that captures the main points and key information.
The summary should be in the language: {{{outputLanguage}}}.

Original Text:
{{{textToSummarize}}}

Please generate a summary.
Your response MUST be a JSON object matching the output schema, containing only the 'summary' field.
`,
});

const summarizeTextFlow = ai.defineFlow(
  {
    name: 'summarizeTextFlow',
    inputSchema: SummarizeTextInputSchema,
    outputSchema: SummarizeTextOutputSchema,
  },
  async (input: SummarizeTextInput) => {
    const lang = input.outputLanguage || DEFAULT_OUTPUT_LANGUAGE;
    const promptInput = {
        ...input,
        outputLanguage: lang,
    };
    // Ensure OPENAI_API_KEY is set in .env for this to work
    const {output} = await summarizeTextPrompt(promptInput);
    if (!output) {
      throw new Error("AI failed to generate a summary or the output was not in the expected format.");
    }
    return output;
  }
);
