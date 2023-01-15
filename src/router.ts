import { Router } from "itty-router";
import { Toucan } from "toucan-js";

import { version } from "../package.json";
import type { Env } from "./config.js";
import stations from "./routes/stations.js";
import departures from "./routes/departures.js";
import { Context } from "toucan-js/dist/types";

const router = Router();

router.get("/", () => new Response(JSON.parse(`{"versiosn: "${version}"}`)));
router.get("/stations", stations);
router.get("/departures", departures);
router.all("*", () => new Response(null, { status: 404 }));

async function route(
  request: Request,
  env: Env,
  context: Context
): Promise<Response> {
  const sentry = new Toucan({
    dsn: env.SENTRY_DSN,
    release: version,
    context,
    request,
  });

  return router
    .handle(request, env)
    .catch((err) => {
      sentry.captureException(err);
      return new Response(
        JSON.stringify({
          version: version,
          status: "An error occoured",
        }),
        {
          status: 500,
        }
      );
    })
    .then((res) => {
      res.headers.set("Content-type", "application/json");
      res.headers.set("Access-Control-Allow-Origin", "*");
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

      return res;
    });
}

export default route;
