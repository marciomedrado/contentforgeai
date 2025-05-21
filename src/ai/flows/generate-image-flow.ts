'use server';
/**
 * @fileOverview A Genkit flow for generating images based on a text prompt.
 *
 * - generateImage - A function that generates an image from a prompt.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated image as a data URI. Format: 'data:image/png;base64,<encoded_data>'."
    ),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input: GenerateImageInput) => {
    try {
      console.log(`Generating image with prompt: "${input.prompt}"`);
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // IMPORTANT: Use exactly this model
        prompt: input.prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // MUST provide both
          // You might want to add safetySettings here if needed, e.g.:
          // safetySettings: [
          //   {
          //     category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          //     threshold: 'BLOCK_NONE', // Example: Adjust as needed
          //   },
          // ],
        },
      });

      if (!media || !media.url) {
        throw new Error('Image generation failed or did not return a valid media URL.');
      }

      console.log('Image generated successfully.');
      return {imageDataUri: media.url};
    } catch (error) {
      console.error('Error in generateImageFlow:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate image: ${errorMessage}`);
    }
  }
);
