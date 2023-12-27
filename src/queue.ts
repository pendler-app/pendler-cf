import type { Env } from "./config.js";
import config from "./config.js";

import { WikiDataEntry } from "./sparql.js";
import type { LocationDTO } from "./models/dto/location.js";
import type { SearchDTO } from "./models/dto/search.js";
import type { Station } from "./models/station.js";

// This is not a perfect UIC validator, but it's good enough for our use case
function isValidUIC(uic: string): boolean {
  // Remove leading zeros and check if the UIC matches the pattern
  const cleanedUIC = uic.replace(/^0+/, ""); // Remove leading zeros
  const uicRegex = /^\d{7}|\d{8}$/;
  return uicRegex.test(cleanedUIC);
}

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
        if (Array.isArray(l)) {
          return l.filter((item) => isValidUIC(item.id))[0];
        }

        return isValidUIC(l.id) ? l : null;
      })
  ).then((stations) =>
    Promise.all(
      stations
        .filter((item): item is LocationDTO => !!item)
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
        .filter(function (elem, index, self) {
          return index === self.indexOf(elem);
        })
        .map(async (s) => {
          let station = await s;

          return env.kv.put("station:" + station.id, JSON.stringify(station), {
            expirationTtl: 60 * 60 * 24 * 3, // Forget stations after three days
          });
        })
    )
  );
}

export default queue;
