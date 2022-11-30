import { Router, Request } from "itty-router";

import type { Env } from "./config.js";
import stations from "./routes/stations.js";
import departures from "./routes/departures.js";

const router = Router();

router.get("/", () => new Response("OK"));
router.get("/stations", stations);
router.get("/departures", departures);
router.all("*", () => new Response("404", { status: 404 }));

async function route(request: Request, env: Env): Promise<Response> {
  return router.handle(request, env);
}

export default route;
