import type { LocationDTO } from "./location.js";

export type SearchDTO = {
  LocationList: {
    StopLocation: LocationDTO[] | LocationDTO | undefined;
  };
};
