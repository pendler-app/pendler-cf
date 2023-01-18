import type { Env } from "./config.js";
import { SPARQLQueryDispatcher } from "./sparql.js";

const endpointUrl = "https://query.wikidata.org/sparql";
const sparqlQuery = `SELECT distinct ?itemLabel ?lat ?long ?uic
WHERE
{
    { ?item wdt:P31 wd:Q2175765 ; wdt:P17 wd:Q35 }
    UNION
    { ?item wdt:P31 wd:Q55488 ; wdt:P17 wd:Q35 }
    UNION
    { ?item wdt:P31 wd:Q928830 ; wdt:P17 wd:Q35 }

    ?item p:P625 ?coordinate.
    ?coordinate ps:P625 ?coord.
    ?coordinate psv:P625 ?coordinate_node.
    ?coordinate_node wikibase:geoLongitude ?long.
    ?coordinate_node wikibase:geoLatitude ?lat.
  
    OPTIONAL {?item wdt:P722 ?uic.}

    SERVICE wikibase:label {
     bd:serviceParam wikibase:language "da".

  }
}`;

async function cron(_: ScheduledEvent, env: Env) {
  /* The cron is triggered twice every night
   * The first run will fetch all known stations from WikiData and set a flag
   * that data was synchronised in the KV store.
   * The second run will take all stations known in the system and create
   * a static cached list of stations.
   */

  // Has the data been synchronised from WikiData?
  if (await env.kv.get("meta:synchronised")) {
    const keys = (await env.kv.list()).keys;

    // Get all keys that have station in the metadata field and parse the
    // JSON-formatted station details. Save the result in the KV store.
    const cache = await Promise.all(
      keys
        .filter((k) => {
          return k.name.startsWith("station:");
        })
        .map(async (k) => {
          return await env.kv.get(k.name, {
            cacheTtl: 3 * 3600,
          });
        })
    );

    await env.kv.put("meta:cache", JSON.stringify(cache));
  } else {
    // Query WikiData for all known stations in Denmark. See query in the top.
    const queryDispatcher = new SPARQLQueryDispatcher(endpointUrl);
    await queryDispatcher.query(sparqlQuery).then(async (r) => {
      return r.results.bindings.map(async (station) => {
        return await env.queue.send(station);
      });
    });

    // Put flag into the KV-store such that the next run will update the cache.
    await env.kv.put("meta:synchronised", "1", { expirationTtl: 60 * 60 });
  }

  return true;
}

export default cron;
