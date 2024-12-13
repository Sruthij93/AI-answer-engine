// TODO: Implement the code here to add rate limiting with Redis
// Refer to the Next.js Docs: https://nextjs.org/docs/app/building-your-application/routing/middleware
// Refer to Redis docs on Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const rateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
});

//  quick way to do rate limiting, is through the User's IP address.
// improve ratelimiting using session- iron session examples- app router. this is not the best way to do rate limiting. --SERVER ACTIONS. to protect apis

export async function middleware(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

    const { success, limit, reset, remaining } = await rateLimit.limit(ip);

    const response = success
      ? NextResponse.next()
      : NextResponse.json({ error: "Too Many Reqyests" }, { status: 429 });

    // Add rate limit info to response headers
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());

    return response;

    // const response = NextResponse.next();

    return response;
  } catch (error) {
    console.error("Middleware error.");
    return NextResponse.next;
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

// cache scraped content from the webpage.
// set up another file to handle logging-
// have a separate file for redis
