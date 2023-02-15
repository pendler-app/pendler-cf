import type { Message } from "./message.js";
import type { Stop } from "./stop.js";

export type Departure = {
  name: string;
  type: string;
  track: number | null;
  direction: string;
  time: string;
  messages: Message[];
  stops: Stop[];
  limited: boolean;
};
