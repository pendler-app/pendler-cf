import type { Env } from "./config.js";
import config from "./config.js";

import { WikiDataEntry } from "./sparql.js";
import type { LocationDTO } from "./models/dto/location.js";
import type { SearchDTO } from "./models/dto/search.js";
import type { Station } from "./models/station.js";

async function queue(batch: MessageBatch<WikiDataEntry>, env: Env) {
  const stations = await Promise.all(
    batch.messages.map(async (b) => {
      // If WikiData already knows the UIC, let's validate that it's a station in Rejseplanen
      if (b.body.uic != undefined) {
        const response = await fetch(
          config.urls.baseUrl + config.urls.searchUrl + b.body.uic.value,
          {
            cf: {
              cacheTtl: 3600,
              cacheEverything: true,
            },
          }
        );
        const search: SearchDTO = await response.json();
        return search.LocationList.StopLocation;
      }

      // If WikiData doesn't know the UIC, let's try to find it by coordinates
      const response = await fetch(
        config.urls.baseUrl +
          config.urls.nearbyUrl +
          "&coordX=" +
          b.body.lat.value +
          "&coordY=" +
          b.body.long.value,
        {
          cf: {
            cacheTtl: 3600,
            cacheEverything: true,
          },
        }
      );
      const search: SearchDTO = await response.json();

      return search.LocationList.StopLocation;
    })
  );

  await Promise.all(
    stations
      .filter((item): item is LocationDTO | LocationDTO[] => !!item)
      .map(async (l) => {
        return Array.isArray(l) ? l[0] : l;
      })
      .filter((s) => s != null)
      .map(async (s) => {
        const location: LocationDTO = await s;

        let station: Station = {
          id: parseInt(location.id),
          coord: {
            lat: parseInt(location.y) / 1_000_000,
            long: parseInt(location.x) / 1_000_000,
          },
          name: location.name.replace(/\s*\(.*?\)\s*/g, ""),
        };

        return station;
      })
      .map(async (s) => {
        let station = await s;

        return env.kv.put("station:" + station.name, JSON.stringify(station), {
          expirationTtl: 60 * 60 * 24 * 3, // Forget stations after three days
        });
      })
  );
}

export default queue;
