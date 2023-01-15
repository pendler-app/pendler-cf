import { WikiDataEntry } from "./sparql.js";

export interface Env {
  readonly kv: KVNamespace;
  readonly queue: Queue<WikiDataEntry>;
  readonly SENTRY_DSN: string;
  readonly VERSION: string;
}

export default {
  urls: {
    baseUrl: "http://xmlopen.rejseplanen.dk/bin/rest.exe/",
    departuresUrl: "departureBoard?useBus=0&format=json&id=",
    searchUrl: "location?format=json&input=",
    nearbyUrl: "stopsNearby?format=json&maxRadius=50&maxNumber=1",
  },
};
