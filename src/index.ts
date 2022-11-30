import moment from "moment-timezone";

import cron from "./cron.js";
import queue from "./queue.js";
import route from "./router.js";

moment.tz.setDefault("Europe/Copenhagen");

export default {
  fetch: route,
  queue: queue,
  cron: cron,
};
