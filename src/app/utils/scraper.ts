import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import * as cheerio from "cheerio";
import { Logger } from "./logger";

const logger = new Logger("scraper");

// settings for puppeteer
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

export async function scrapeURL(url: string) {
  const isLocal = !!process.env.CHROME_EXECUTABLE_PATH;

  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    args: isLocal ? puppeteer.defaultArgs() : chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath:
      process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath()),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const html = await page.content();
    const $ = cheerio.load(html);

    // remove the unnecessary elements from the webpage
    $("script, style, nav, footer, header, aside").remove();
    // Select the main content containers
    let mainContent = $("main").text(); // Check for <main> tag
    if (!mainContent.trim()) {
      mainContent = $("article").text(); // Fallback to <article>
    }
    if (!mainContent.trim()) {
      mainContent = $("body").text(); // Fallback to the full body text
    }

    // Clean up whitespace and line breaks
    return mainContent.replace(/\s+/g, " ").trim();
    // const content = $("body").text();

    // return content.trim();

    // const pageTitle = await page.title();
    // console.log("the title is ", pageTitle);
  } catch (error) {
    console.error("Scraping error:", error);
    return "Unable to scrape webpage.";
  } finally {
    await browser.close();
  }
}
