import type { Message } from "./message.js";
import type { Stop } from "./stop.js";

export type Departure = {
  id: string | null;
  name: string;
  type: string;
  track: number | null;
  direction: string;
  time: string;
  delay: number;
  messages: Message[];
  stops: Stop[];
  limited: boolean;
  cancelled: boolean;
};
