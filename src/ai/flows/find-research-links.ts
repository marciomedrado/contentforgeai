
'use server';
/**
 * @fileOverview AI agent for finding research links and detailed textual content from those links.
 *
 * - findResearchLinks - A function that finds research links and their detailed content.
 * - FindResearchLinksInput - The input type for the findResearchLinks function.
 * - FindResearchLinksOutput - The return type for the findResearchLinks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { DEFAULT_OUTPUT_LANGUAGE } from '@/lib/constants';

const FindResearchLinksInputSchema = z.object({
  topic: z.string().describe('The topic to find research links for.'),
  numLinks: z.number().min(1).max(5).default(3).describe('The number of links to find.'),
  outputLanguage: z.string().optional().default(DEFAULT_OUTPUT_LANGUAGE).describe('The desired output language for titles and detailed content.'),
  perplexityApiKey: z.string().optional().describe('Optional Perplexity API key.'),
});
export type FindResearchLinksInput = z.infer<typeof FindResearchLinksInputSchema>;

// Internal schema for the prompt, where summary means detailed content.
const ResearchLinkItemSchemaInternal = z.object({
  title: z.string().describe('The title of the research item/webpage.'),
  url: z.string().describe('The direct URL to the research item/webpage. Should be a real, working URL from a reputable source.'),
  summary: z.string().describe('An extensive and detailed account that captures the main textual content believed to be at the URL. This should aim to be as comprehensive as possible, like a transcription of the core information, rather than a brief overview. This text will be used as a primary reference for content generation.'),
});

const FindResearchLinksOutputSchema = z.object({
  links: z.array(ResearchLinkItemSchemaInternal).describe('An array of found research links with titles, URLs, and detailed textual content.'),
});
export type FindResearchLinksOutput = z.infer<typeof FindResearchLinksOutputSchema>;

export async function findResearchLinks(
  input: FindResearchLinksInput
): Promise<FindResearchLinksOutput> {
  const flowInput = {
    ...input,
    outputLanguage: input.outputLanguage || DEFAULT_OUTPUT_LANGUAGE,
  };
  return findResearchLinksFlow(flowInput);
}

const findResearchLinksPrompt = ai.definePrompt({
  name: 'findResearchLinksPrompt',
  input: {schema: FindResearchLinksInputSchema},
  output: {schema: FindResearchLinksOutputSchema},
  prompt: `You are an AI research assistant. Your task is to find {{numLinks}} relevant, high-quality web pages for the topic: "{{{topic}}}".
For each page, provide:
1.  A "title": The concise and accurate title of the web page.
2.  A "url": The direct, full, and VALID URL to the web page. Ensure this URL is real, accessible, and from a reputable source. Double-check for correctness. Do NOT invent URLs.
3.  A "summary": An extensive and detailed account that captures the main textual content believed to be at the URL. This should aim to be as comprehensive as possible, like a transcription of the core information, rather than a brief overview. This text will be used as a primary reference for content generation.

All output (titles, summaries/detailed content) MUST be in the language: {{{outputLanguage}}}.

IMPORTANT: Only return real, existing web pages. Prioritize authoritative and well-known sources.

Your response MUST be a JSON object matching the output schema. Example:
{
  "links": [
    {
      "title": "Example Article Title 1",
      "url": "https://example.com/article1",
      "summary": "A very detailed account of the content found at example.com/article1, covering all major sections and key information..."
    },
    {
      "title": "Example Source Page 2",
      "url": "https://examplesource.org/page2",
      "summary": "An in-depth transcription-like representation of the information available on examplesource.org/page2..."
    }
  ]
}
Ensure the entire response is a single, valid JSON object.
`,
});

const findResearchLinksFlow = ai.defineFlow(
  {
    name: 'findResearchLinksFlow',
    inputSchema: FindResearchLinksInputSchema,
    outputSchema: FindResearchLinksOutputSchema,
  },
  async (input: FindResearchLinksInput): Promise<FindResearchLinksOutput> => {
    let researchData: FindResearchLinksOutput | null = null;

    if (input.perplexityApiKey) {
      console.log(
        `Perplexity API key found. Implement Perplexity API call here for topic: "${input.topic}". This implementation should return data in the FindResearchLinksOutput format.`
      );
      // Example of how you might call a hypothetical Perplexity service:
      // try {
      //   const perplexityResult = await callPerplexityService(input.topic, input.numLinks, input.perplexityApiKey, input.outputLanguage);
      //   researchData = perplexityResult; // Assuming callPerplexityService returns FindResearchLinksOutput
      // } catch (e) {
      //   console.error("Perplexity API call failed:", e);
      //   // Fall through to Gemini
      // }
    }

    if (!researchData) {
      console.log(
        `Using Gemini to find research links and detailed content for topic: "${input.topic}".`
      );
      const {output} = await findResearchLinksPrompt(input);
      if (!output || !output.links) {
        console.error("AI output for findResearchLinks (Gemini) was null, undefined, or links array was missing:", output);
        throw new Error("AI (Gemini) failed to find research or the output was not in the expected format.");
      }
      researchData = output;
    }
    
    if (researchData.links.length === 0) {
      console.warn("AI (Gemini or Perplexity fallback) returned an empty list of links for topic:", input.topic);
    }

    return researchData;
  }
);
