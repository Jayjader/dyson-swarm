import type { Simulation, SubscriptionsFor } from "../index";
import type { Events } from "../events";
import type { EventProcessor } from "./index";

export type EventStream = EventProcessor<
  "stream",
  {
    received: Events<SubscriptionsFor<"stream">>[];
  }
>;

export function createMemoryStream(
  id: EventStream["id"] = "stream-0"
): EventStream {
  return {
    id,
    incoming: [],
    tag: "stream",
    data: { received: [] },
  };
}

export function memoryStreamProcess(stream: EventStream): EventStream {
  // if (
  //   stream.incoming.length >= 1 &&
  //   stream.incoming[0].tag !== "outside-clock-tick"
  // ) {
  //   console.debug({ eventStream: stream.incoming });
  // }
  stream.data.received.push(...stream.incoming);
  stream.incoming = [];
  return stream;
}

export function getEventStream(simulation: Simulation) {
  return (simulation.processors.get("stream-0") as EventStream).data.received;
}
