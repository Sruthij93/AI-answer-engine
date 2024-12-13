// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer

import { OpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";
import { scrapeURL } from "@/app/utils/scraper";

const client = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const urlRegex = /(https?:\/\/[^\s]+)/;
    const url = message.match(urlRegex);
    let urlContent: string;
    // console.log(typeof url[0]);
    if (url) {
      urlContent = await scrapeURL(url[0]);
    } else {
      urlContent = "";
      console.log("No url found in the message");
    }
    // console.log(url[0]);
    // console.log(hasURL(message));
    // console.log(typeof message);
    console.log(urlContent);
    console.log("length of html content: ", urlContent.length);
    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an expert search engine. You will give answers to the questions asked by searching information from the web.",
        },
        {
          role: "user",
          content: `Using the following information, answer the question or perform: "${message}". \n\n${urlContent}`,
        },
      ],
      model: "llama-3.1-8b-instant",
    });

    console.log("ai response: ", completion);
    return NextResponse.json({
      response: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error: ", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
