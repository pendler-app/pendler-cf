import type { Env } from "../config.js";

async function stations(_: Request, env: Env) {
  const response = new Response(
    await env.kv.get("meta:cache", { cacheTtl: 3 * 3600 })
  );
  response.headers.set("Cache-Control", "max-age=86400");
  response.headers.set("Content-type", "application/json");
  return response;
}

export default stations;
