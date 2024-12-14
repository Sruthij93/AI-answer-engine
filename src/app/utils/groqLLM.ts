import { OpenAI } from "openai";

const client = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function groqLLMResponse(llmMessages: ChatMessage[]) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an expert search engine. You will give answers based on the context given to you and you will always cite your sources.`,
    },
    ...llmMessages,
  ];
  const completion = await client.chat.completions.create({
    messages,
    model: "llama-3.1-8b-instant",
  });

  console.log("ai response: ", completion);
  return completion.choices[0].message.content;
}
