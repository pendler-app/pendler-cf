import type { StopDTO } from "./stop.js";

export type DetailedDepartureDTO = {
  JourneyDetail: {
    Stop: StopDTO[];
    MessageList:
      | {
          Message:
            | {
                Header: {
                  $: string;
                };
                Text: {
                  $: string;
                };
              }
            | [
                {
                  Header: {
                    $: string;
                  };
                  Text: {
                    $: string;
                  };
                }
              ];
        }
      | undefined;
  };
};
