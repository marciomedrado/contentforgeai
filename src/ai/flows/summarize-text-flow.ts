
'use server';
/**
 * @fileOverview AI agent for summarizing text.
 *
 * - summarizeText - A function that summarizes a given text.
 * - SummarizeTextInput - The input type for the summarizeText function.
 * - SummarizeTextOutput - The return type for the summarizeText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { DEFAULT_OUTPUT_LANGUAGE } from '@/lib/constants';

const SummarizeTextInputSchema = z.object({
  textToSummarize: z.string().min(1).describe('The text content to be summarized.'),
  outputLanguage: z.string().optional().default(DEFAULT_OUTPUT_LANGUAGE).describe('The desired output language for the summary (e.g., "en", "pt", "es").'),
  customInstructions: z.string().optional().describe('Additional custom instructions for the AI to follow, from a designated "Funcionario".'),
});
export type SummarizeTextInput = z.infer<typeof SummarizeTextInputSchema>;

const SummarizeTextOutputSchema = z.object({
  summary: z.string().describe('The generated summary of the input text.'),
});
export type SummarizeTextOutput = z.infer<typeof SummarizeTextOutputSchema>;

export async function summarizeText(input: SummarizeTextInput): Promise<SummarizeTextOutput> {
  return summarizeTextFlow(input);
}

// This prompt is for Gemini if OpenAI Agent is not used
const geminiPrompt = ai.definePrompt({
  name: 'summarizeTextGeminiPrompt',
  input: {schema: SummarizeTextInputSchema},
  output: {schema: SummarizeTextOutputSchema},
  prompt: `
{{#if customInstructions}}
Prioritize these User-Provided Instructions:
---
{{{customInstructions}}}
---
When generating the summary, ensure you adhere to these instructions above all else, while still fulfilling the core task of summarization.
{{/if}}

You are an expert text summarizer. Your task is to read the following text and provide a concise, well-organized summary that captures the main points and key information.
The summary should be in the language: {{{outputLanguage}}}.

Original Text:
{{{textToSummarize}}}

Please generate a summary.
Your response MUST be a JSON object matching the output schema, containing only the 'summary' field.
Example:
{
  "summary": "This is a concise summary of the provided text..."
}
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
    const agentId = process.env.OPENAI_AGENT_ID;
    const apiKey = process.env.OPENAI_API_KEY;

    if (agentId && apiKey) {
      console.log(`Using OpenAI Agent ${agentId} for text summarization.`);
      const assistantInput = {
        textToSummarize: input.textToSummarize,
        outputLanguage: lang,
        customInstructions: input.customInstructions,
        desiredOutputFormat: "A JSON object with a 'summary' (string) field. The summary text must be in the specified outputLanguage."
      };

      try {
        const {output} = await ai.runAssistant({
          assistantId: agentId,
          input: assistantInput,
          instructions: `You are an expert text summarizer. Summarize the provided text.
          The user has provided:
          - Text to summarize: (see 'textToSummarize' in input)
          - Output language: ${assistantInput.outputLanguage}
          ${assistantInput.customInstructions ? `- Custom Instructions (Prioritize these): ${assistantInput.customInstructions}` : ''}

          Your response MUST be a single, valid JSON object strictly conforming to the following structure:
          {
            "summary": "string (this summary must be in ${assistantInput.outputLanguage})"
          }
          Do NOT include any other text, explanations, or markdown formatting outside of this JSON structure.`,
        });

        if (typeof output === 'string') {
          const parsedOutput = JSON.parse(output as string);
           const validationResult = SummarizeTextOutputSchema.safeParse(parsedOutput);
          if (validationResult.success) {
            return validationResult.data;
          } else {
            console.error("OpenAI Agent output failed Zod validation:", validationResult.error);
            throw new Error(`OpenAI Agent output format error: ${validationResult.error.message}`);
          }
        } else if (typeof output === 'object' && output !== null) {
           const validationResult = SummarizeTextOutputSchema.safeParse(output);
           if (validationResult.success) {
            return validationResult.data;
          } else {
            console.error("OpenAI Agent object output failed Zod validation:", validationResult.error);
            throw new Error(`OpenAI Agent object output format error: ${validationResult.error.message}`);
          }
        }
        throw new Error("OpenAI Agent returned an unexpected output type.");
      } catch (e) {
        console.error("Error running OpenAI assistant for summarization, falling back to Gemini:", e);
        // Fallback to Gemini if assistant fails
      }
    }

    // Fallback to Gemini
    console.log("Using Gemini prompt for text summarization.");
    const promptInput = { ...input, outputLanguage: lang };
    const {output} = await geminiPrompt(promptInput);
    if (!output) {
      throw new Error("AI (Gemini) failed to generate a summary or the output was not in the expected format.");
    }
    return output;
  }
);
