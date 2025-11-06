'use server';

/**
 * @fileOverview AI-powered prediction of steelmaking operation durations.
 *
 * - predictOperationDuration - Predicts the duration of a steelmaking operation using historical data.
 * - PredictOperationDurationInput - The input type for the predictOperationDuration function.
 * - PredictOperationDurationOutput - The return type for the predictOperationDuration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictOperationDurationInputSchema = z.object({
  heatId: z.string().describe('The ID of the heat.'),
  steelGrade: z.string().describe('The grade of steel being produced.'),
  unit: z.string().describe('The unit performing the operation (e.g., BOF1, LF2).'),
  startTime: z.string().describe('The start time of the operation (ISO format).'),
  historicalData: z.string().describe('Historical data of previous steelmaking operations in JSON format.'),
});

export type PredictOperationDurationInput = z.infer<typeof PredictOperationDurationInputSchema>;

const PredictOperationDurationOutputSchema = z.object({
  predictedDurationMinutes: z.number().describe('The predicted duration of the operation in minutes.'),
  explanation: z.string().describe('Explanation of how the duration was predicted.'),
});

export type PredictOperationDurationOutput = z.infer<typeof PredictOperationDurationOutputSchema>;

export async function predictOperationDuration(input: PredictOperationDurationInput): Promise<PredictOperationDurationOutput> {
  return predictOperationDurationFlow(input);
}

const predictOperationDurationPrompt = ai.definePrompt({
  name: 'predictOperationDurationPrompt',
  input: {schema: PredictOperationDurationInputSchema},
  output: {schema: PredictOperationDurationOutputSchema},
  prompt: `You are an AI assistant specialized in predicting the duration of steelmaking operations.
  Based on the following information and historical data, predict the duration (in minutes) of the operation and explain your reasoning.

  Heat ID: {{{heatId}}}
  Steel Grade: {{{steelGrade}}}
  Unit: {{{unit}}}
  Start Time: {{{startTime}}}

  Here's historical data from previous operations: {{{historicalData}}}

  Consider factors such as steel grade, unit, and historical durations to make the most accurate prediction.
  Make sure predictedDurationMinutes is a number.`,
});

const predictOperationDurationFlow = ai.defineFlow(
  {
    name: 'predictOperationDurationFlow',
    inputSchema: PredictOperationDurationInputSchema,
    outputSchema: PredictOperationDurationOutputSchema,
  },
  async input => {
    const {output} = await predictOperationDurationPrompt(input);
    return output!;
  }
);
