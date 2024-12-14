// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer

import { NextRequest, NextResponse } from "next/server";
import { scrapeURL } from "@/app/utils/scraper";
import { groqLLMResponse } from "@/app/utils/groqLLM";

export async function POST(req: Request) {
  try {
    const { message, messages } = await req.json();

    const urlRegex = /(https?:\/\/[^\s]+)/;
    const url = message.match(urlRegex);
    let urlContent: string;
    // console.log(typeof url[0]);

    // limit the messages to last 10 messages
    const limitedMessages = messages.slice(-10);
    // console.log("prev chat convo", messages);

    if (url) {
      const urlScraper = await scrapeURL(url[0]);
      urlContent = urlScraper.content;
    } else {
      urlContent = " ";
      console.log("No url found in the message");
    }
    // console.log(url[0]);
    // console.log(hasURL(message));
    // console.log(typeof message);
    // console.log(urlContent);
    console.log("length of html content: ", urlContent.length);

    const userMessage = message.replace(url ? url[0] : "", "").trim();
    console.log("The usermessage is: ", userMessage);

    const userPrompt = `Answer the question or perform: "${userMessage}". 
                      Using the following content 
                    <content>
                    ${urlContent}
                    </content>,
                    DO NOT mention anything about the content or context provided to you.`;
    const llmMessages = [
      ...limitedMessages,
      {
        role: "user",
        content: userPrompt,
      },
    ];

    const response = await groqLLMResponse(llmMessages);

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("Error: ", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
