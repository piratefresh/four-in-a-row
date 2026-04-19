import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

const allowedOrigin = process.env.CLIENT_ORIGIN ?? "*";

function corsHeaders(origin = allowedOrigin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "origin",
  };
}

http.route({
  path: "/validateWord",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: new Headers(corsHeaders()),
    });
  }),
});

http.route({
  path: "/validateWord",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const word = url.searchParams.get("word");
    if (!word) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Missing word",
        }),
        {
          status: 400,
          headers: new Headers({
            ...corsHeaders(),
            "Content-Type": "application/json",
          }),
        },
      );
    }

    const result = await ctx.runAction(
      internal.validateWord.validateDictionaryWord,
      {
        word,
      },
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: new Headers({
        ...corsHeaders(),
        "Content-Type": "application/json",
      }),
    });
  }),
});

authComponent.registerRoutes(http, createAuth);

export default http;
