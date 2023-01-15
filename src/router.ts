import { Router, Request } from "itty-router";

import type { Env } from "./config.js";
import stations from "./routes/stations.js";
import departures from "./routes/departures.js";

const router = Router();

router.get("/", () => new Response());
router.get("/stations", stations);
router.get("/departures", departures);
router.all("*", () => new Response(null, { status: 404 }));

async function route(request: Request, env: Env): Promise<Response> {
  return router.handle(request, env).then((res) => {
    res.headers.set("Content-type", "application/json");
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    return res;
  });
}

export default route;
