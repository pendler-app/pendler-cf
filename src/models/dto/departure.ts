export type DepartureDTO = {
  name: string;
  type: string;
  time: string;
  date: string;
  track: string | undefined;
  rtTrack: string | undefined;
  direction: string;
  JourneyDetailRef: {
    ref: string;
  };
};
