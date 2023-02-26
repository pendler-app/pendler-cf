export type DepartureDTO = {
  name: string;
  type: string;
  time: string;
  date: string;
  rtTime: string | undefined;
  rtDate: string | undefined;
  track: string | undefined;
  rtTrack: string | undefined;
  direction: string;
  JourneyDetailRef: {
    ref: string;
  };
};
