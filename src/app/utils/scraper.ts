import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import * as cheerio from "cheerio";
import { Logger } from "./logger";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { getCachedContent, cacheContent } from "@/app/utils/cache";

const logger = new Logger("scraper");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

interface ScrapedContent {
  url: string;
  title: string;
  headings: {
    h1: string;
    h2: string;
  };
  content: string;
  error: string;
  cachedAt?: number;
}

// settings for puppeteer
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
}

export async function scrapeURL(url: string) {
  try {
    const isLocal = !!process.env.CHROME_EXECUTABLE_PATH;

    const cached = await getCachedContent(url);

    if (cached) {
      logger.info(`Using cached content for ${url}`);
      return cached;
    }
    logger.info(`Cache content not found. WebScraping this ${url}.`);

    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({
      args: isLocal ? puppeteer.defaultArgs() : chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath:
        process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath()),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const html = await page.content();
    const $ = cheerio.load(html);

    // remove the unnecessary elements from the webpage
    $("script, style, noscript, iframe, nav, footer, header, aside").remove();
    // get the title of the page
    const title = $("title").text();

    // get h1 and h2
    const h1 = $("h1")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const h2 = $("h2")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");

    // Select the main content containers
    let mainContent = $("main").text(); // Check for <main> tag
    if (!mainContent.trim()) {
      mainContent = $("article").text(); // Fallback to <article>
    }
    if (!mainContent.trim()) {
      mainContent = $("body").text(); // Fallback to the full body text
    }
    mainContent = mainContent.replace(/\s+/g, " ").trim();

    // logger.info("MAIN CONTENT SCRAPED: ", mainContent);

    // select paragraph text
    const paragraphs = $("p")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");

    // logger.info("PARAGRAPHS SCRAPED: ", paragraphs);

    let combinedScrapedContent = [title, h1, h2, mainContent, paragraphs].join(
      " "
    );
    // Clean up whitespace and line breaks
    combinedScrapedContent = cleanText(combinedScrapedContent).slice(0, 40000);

    const finalScrapedContent: ScrapedContent = {
      url,
      title: cleanText(title),
      headings: { h1: cleanText(h1), h2: cleanText(h2) },
      content: combinedScrapedContent,
      error: "",
    };

    logger.info("scraped content: ", finalScrapedContent);

    // add the scraped content to the cache
    await cacheContent(url, finalScrapedContent);

    await browser.close();
    return finalScrapedContent;
  } catch (error) {
    console.error("Scraping error:", error);
    return {
      url,
      title: "",
      headings: {},
      content: "",
      paragraphs: "",
      error: error,
    };
  }
  //   finally {
  //     await browser.close();
  //   }
}
