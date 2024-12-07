import { createResource } from "@/lib/actions/resources";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";
import { findRelevantContent } from "@/lib/ai/embedding";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-1.5-flash-8b-latest"),
    system: `You are a helpful assistant. Check your knowledge base before answering any questions. you can also do multi step reasoning.`,
    messages,
    maxSteps: 10,
    tools: {
      isHarmful: tool({
        description: `Determines whether a given product or label is harmful based on predefined criteria.`,
        parameters: z.object({
          product: z
            .string()
            .describe(
              "The name of the product or label to evaluate for potential harm."
            ),
        }),
        execute: async ({ product }) => {
          // Placeholder logic for determining if the product is harmful
          return `The product ${product} is not harmful.`;
        },
      }),
      addResource: tool({
        description: `add a resource to your knowledge base.
            If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
        parameters: z.object({
          content: z
            .string()
            .describe("the content or resource to add to the knowledge base"),
        }),
        execute: async ({ content }) => createResource({ content }),
      }),
      getInformation: tool({
        description: `get information from knowledge base to answer questions.`,
        parameters: z.object({
          question: z.string().describe("the users question"),
        }),
        execute: async ({ question }) => findRelevantContent(question),
      }),
    },
  });

  return result.toDataStreamResponse();
}
