import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { Logger } from "./logger";

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
  error: string | null;
  cachedAt?: number;
}

//Cache TTL in seconds (7 days)
const CACHE_TTL = 7 * (24 * 60 * 60);
const MAX_CACHE_SIZE = 1024000; // 1 MB limit

function validateScrapedContent(data: any): data is ScrapedContent {
  //   console.log("validate scrape function:::::::::");
  //   console.log("Data type:", typeof data);
  //   //   console.log("Data: ", data);
  //   console.log("url type:", typeof data.url);
  //   console.log("title type:", typeof data.title);
  //   console.log("headings type:", typeof data.headings);
  //   console.log("h1 type:", typeof data.headings.h1);
  //   console.log("h2 type:", typeof data.headings.h2);
  //   console.log("content type", typeof data.content);
  //   console.log("error type", typeof data.error);
  //   console.log("error ", data.error);

  return (
    typeof data === "object" &&
    data != null &&
    typeof data.url === "string" &&
    typeof data.title === "string" &&
    typeof data.headings === "object" &&
    typeof data.headings.h1 === "string" &&
    typeof data.headings.h2 === "string" &&
    typeof data.content === "string" &&
    (data.error === null || typeof data.error === "string")
  );
}

// function to get a key for the url
export default function getCacheKey(url: string): string {
  const optimalURL = url.slice(0, 200);
  return `ws:${optimalURL}`; // ws: WebScrape
}

// function to get cachedContent using cacheKey
export async function getCachedContent(
  url: string
): Promise<ScrapedContent | null> {
  try {
    const cacheKey = getCacheKey(url);
    console.log("cache key:", cacheKey);

    const cachedContent = await redis.get(cacheKey);

    if (!cachedContent) {
      logger.info("No cached content found.");
      return null;
    }

    let returnedContent: any;
    if (typeof cachedContent === "string") {
      try {
        returnedContent = JSON.parse(cachedContent);
      } catch (parseError) {
        console.log("Could not parse content: ", parseError);
        await redis.del(cacheKey);
        return null;
      }
    } else {
      returnedContent = cachedContent;
    }

    if (validateScrapedContent(returnedContent)) {
      const age = Date.now() - (returnedContent.cachedAt || 0);
      console.log(
        `Cached content age : ${Math.round(age / 1000 / 60)} minutes`
      );
      return returnedContent;
    } else {
      console.log(`Invalid cached content for ${url}.`);
      await redis.del(cacheKey);
      return null;
    }
  } catch (error) {
    console.log("Cache retrieval error: ", error);
    return null;
  }
}

export async function cacheContent(
  url: string,
  content: ScrapedContent
): Promise<void> {
  try {
    const cacheKey = getCacheKey(url);
    content.cachedAt = Date.now();
    console.log(
      "Entered cacheContent function. the content to be cached : ",
      content
    );

    console.log("is it valid?: ", validateScrapedContent(content));

    //validate the content to be cached
    if (!validateScrapedContent(content)) {
      logger.warn(`Attempted to cache invalid content format for : ${url}`);
      return;
    }

    // check if the content is within size limits
    const serializedContent = JSON.stringify(content);
    const contentSize = Buffer.byteLength(serializedContent, "utf-8");

    if (contentSize > MAX_CACHE_SIZE) {
      console.log(
        `Content size (${contentSize} bytes) exceeds MAX_CACHE_SIZE (${MAX_CACHE_SIZE} bytes) for: ${url}`
      );
      return;
    }

    await redis.set(cacheKey, serializedContent, { ex: CACHE_TTL });

    console.log(`Content cached successfully for ${url}`);
  } catch (error) {
    console.error(`Error in caching content for ${url}`);
  }
}
