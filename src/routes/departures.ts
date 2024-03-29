import moment from "moment-timezone";
import * as CryptoJS from "crypto-js";

import config, { Env } from "../config.js";

import type { BoardDTO } from "../models/dto/board.js";
import type { Departure } from "../models/departure.js";
import type { DetailedDepartureDTO } from "../models/dto/detailedDeparture.js";
import type { Message } from "../models/message.js";
import type { Stop } from "../models/stop.js";
import { Station } from "../models/station.js";
import { IRequest } from "itty-router";

function hashString(input: string): string {
  // Using SHA-256 algorithm
  const hash = CryptoJS.SHA256(input);

  // Convert the hash to a hexadecimal string
  const hashString = hash.toString(CryptoJS.enc.Hex);

  return hashString;
}

// https://masoudx.medium.com/sorting-and-filtering-location-data-in-typescript-7c2f929f6a91
function distance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // Latitude of first point converted to radians
  const φ2 = (lat2 * Math.PI) / 180; // Latitude of second point converted to radians
  const Δφ = ((lat2 - lat1) * Math.PI) / 180; // Change in latitude converted to radians
  const Δλ = ((lon2 - lon1) * Math.PI) / 180; // Change in longitude converted to radians

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // Distance in meters
  return d;
}

async function departures(request: IRequest, env: Env) {
  /* No station ID provided */
  if (!request.params || !request.params["id"]) {
    return new Response("400", { status: 400 });
  }

  /* Fetch departures from the station */
  /* Tell Cloudflare to cache the result for 30 seconds */
  const url =
    config.urls.baseUrl + config.urls.departuresUrl + request.params.id;
  let response = await fetch(url, {
    cf: {
      cacheTtl: 30,
      cacheEverything: true,
    },
  });

  // Get the list of stations from the KV store
  const stations: Station[] = JSON.parse(
    (await env.kv.get("meta:cache", { cacheTtl: 3 * 3600 })) ?? "[]"
  );

  // If we don't have the list of stations in the KV store, return a 503
  if (!stations || stations.length === 0) {
    return new Response("503", { status: 503 });
  }

  /* Declare list of departures to be of type BoardDTO */
  const board: BoardDTO = await response.json();

  /* Map over all departures and convert from DTO to final model */
  const departures: Departure[] = await Promise.all(
    board.DepartureBoard.Departure.map(async (d) => {
      /* Parse departure time to moment object */
      const time = moment(d.date + d.time, "DD.MM.YY hh:mm");

      /* Fetch details about this particture departure */
      /* Tell Cloudflare to cache the result for 30 seconds */
      const journey = await fetch(d.JourneyDetailRef.ref, {
        cf: {
          cacheTtl: 30,
          cacheEverything: true,
        },
      });

      /* Declare the details to be of type DetailedDepartureDTO */
      const details: DetailedDepartureDTO = await journey.json();

      const stops: Stop[] = details.JourneyDetail.Stop
        ? await Promise.all(
            details.JourneyDetail.Stop.map(async (s) => {
              /* Parse departure and arrival time to moment objects */
              const arr = s.arrTime
                ? moment(s.arrDate + s.arrTime, "DD.MM.YY hh:mm")
                : null;
              const dep = s.depTime
                ? moment(s.depDate + s.depTime, "DD.MM.YY hh:mm")
                : null;
              const delay = s.rtTime
                ? moment(s.rtDate + s.rtTime, "DD.MM.YY hh:mm").diff(dep)
                : 0;

              /* If a track is provided, yield that. Else null */
              let track = null;
              if (s.rtTrack) track = parseInt(s.rtTrack);
              else if (s.track) track = parseInt(s.track);

              const lat = parseInt(s.y) / 1000000;
              const lon = parseInt(s.x) / 1000000;

              // Find the station in the list of stations with 150 meters of this stop
              const nearestStations = stations.sort((a, b) => {
                return (
                  distance(a.coord.lat, a.coord.long, lat, lon) -
                  distance(b.coord.lat, b.coord.long, lat, lon)
                );
              });

              // If the nearest station is more than 150 meters away, set id to null
              const id =
                distance(
                  nearestStations[0].coord.lat,
                  nearestStations[0].coord.long,
                  lat,
                  lon
                ) > 250
                  ? null
                  : nearestStations[0].id;

              return {
                name: s.name,
                track: track,
                arrival: arr ? arr.format() : null,
                departure: dep ? dep.format() : null,
                delay: delay,
                id: id,
              };
            })
          )
        : [];

      let messages: Message[] = [];
      if (
        details &&
        details.JourneyDetail &&
        details.JourneyDetail.MessageList
      ) {
        /* If we have multiple messages, it will be resturned as an array */
        /* Else it is returned as an object */
        if (Array.isArray(details.JourneyDetail.MessageList.Message)) {
          messages = details.JourneyDetail.MessageList.Message.map((m) => {
            return {
              title: m.Header.$.trim(),
              text: m.Text.$.trim(),
            };
          });
        } else {
          messages = [
            {
              title: details.JourneyDetail.MessageList.Message.Header.$.trim(),
              text: details.JourneyDetail.MessageList.Message.Text.$.trim(),
            },
          ];
        }
      }

      /* If a track is provided, yield that. Else null */
      let track = null;
      if (d.rtTrack) track = parseInt(d.rtTrack);
      else if (d.track) track = parseInt(d.track);

      const delay = d.rtTime
        ? moment(d.rtDate + d.rtTime, "DD.MM.YY hh:mm").diff(time, "minutes")
        : 0;

      // ID is the hash of the first station name and departure time and direction
      // This is to ensure that the ID is the same for all stations in the same
      // direction and time.
      // If we don't have any stops, we don't have enough details about the journey to create an ID
      const id =
        stops.length > 0
          ? hashString(`${stops[0].name}-${d.direction}-${stops[0].departure}`)
          : null;

      return {
        id: id,
        name: d.name.replace("Metro ", "").replace("Letbane ", ""),
        type: d.type,
        direction: d.direction,
        time: time.format(),
        delay: delay,
        track: track,
        messages: messages,
        limited: !details.JourneyDetail.Stop,
        cancelled: d.cancelled === "true",
        stops: stops,
      };
    })
  );

  response = new Response(JSON.stringify(departures), response);
  response.headers.set("Cache-Control", "max-age=30");
  response.headers.set("Content-type", "application/json");
  return response;
}

export default departures;
