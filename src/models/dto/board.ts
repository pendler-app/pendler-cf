import type { DepartureDTO } from "./departure.js";

export type IntermediateBoardDTO = {
  Departure: DepartureDTO[];
};

export type BoardDTO = {
  DepartureBoard: IntermediateBoardDTO;
};
