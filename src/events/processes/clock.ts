import {
  type ClockState,
  getPrimitive,
  indirectPause,
  indirectResume,
  isEditing,
  isIndirectPause,
  isPause,
  isPlay,
  pause,
  setPrimitive, setSpeed,
  startEditing,
  stopEditing,
  unPause,
} from "../../hud/types";
import type { BusEvent, Events } from "../events";
import type { Simulation, SubscriptionsFor } from "../index";
import type { EventProcessor } from "./index";

export type Clock = EventProcessor<
  "clock",
  {
    state: ClockState;
    lastOutsideTickProvokingSimulationTick: DOMHighResTimeStamp;
    received: Events<
      Exclude<SubscriptionsFor<"clock">, "simulation-clock-tick">
    >[];
  }
>;
const clockDefaults = { mode: "pause", speed: 1, tick: 0 } as const;

export function createClock(
  lastOutsideTickProvokingSimulationTick: number,
  id: Clock["id"] = "clock-0",
  options: Partial<{
    speed: number;
    tick: number;
    mode: "play" | "pause" | "indirect-pause";
  }> = {}
): Clock {
  const mode = options?.mode ?? clockDefaults.mode;
  const speed = options?.speed ?? clockDefaults.speed;
  const tick = options?.tick ?? clockDefaults.tick;
  const primitive = { speed, tick };
  const state: ClockState = mode === "play" ? [primitive] : [primitive, mode];
  return {
    id,
    incoming: [],
    tag: "clock",
    data: {
      state,
      lastOutsideTickProvokingSimulationTick,
      received: [],
    },
  };
}

export function clockProcess(clock: Clock): [Clock, BusEvent[]] {
  let event;
  const emitted = [] as BusEvent[];
  while ((event = clock.incoming.shift())) {
    switch (event.tag) {
      case "command-simulation-clock-play":
        if (isPause(clock.data.state)) {
          clock.data.state = unPause(clock.data.state);
          clock.data.lastOutsideTickProvokingSimulationTick =
            event.timeStamp - 1;
          emitted.push({
            tag: "simulation-clock-play",
            beforeTick: event.afterTick + 1,
          });
        }
        break;
      case "command-simulation-clock-pause":
        if (isPlay(clock.data.state)) {
          clock.data.state = pause(clock.data.state);
          emitted.push({
            tag: "simulation-clock-pause",
            beforeTick: event.afterTick + 1,
          });
        }
        break;
      case "command-simulation-clock-indirect-pause":
        if (isPlay(clock.data.state)) {
          clock.data.state = indirectPause(clock.data.state);
          emitted.push({
            tag: "simulation-clock-indirect-pause",
            beforeTick: event.afterTick + 1,
          });
        }
        break;
      case "command-simulation-clock-indirect-resume":
        if (isIndirectPause(clock.data.state)) {
          clock.data.state = indirectResume(clock.data.state);
          clock.data.lastOutsideTickProvokingSimulationTick =
            event.timeStamp - 1;
          emitted.push({
            tag: "simulation-clock-indirect-resume",
            beforeTick: event.afterTick + 1,
          });
        }
        break;
      case "command-simulation-clock-start-editing-speed": {
        if (!isEditing(clock.data.state)) {
          clock.data.state = startEditing(clock.data.state);
          emitted.push({
            tag: "simulation-clock-editing-speed",
            beforeTick: event.afterTick + 1,
          });
        }
        break;
      }
      case "command-simulation-clock-set-speed":
        if (isEditing(clock.data.state)) {
          clock.data.state = stopEditing(clock.data.state);
        }

        clock.data.state = setSpeed(clock.data.state, event.speed)
        emitted.push({
          tag: "simulation-clock-new-speed",
          speed: event.speed,
          beforeTick: event.afterTick + 1,
        });
        break;
      case "outside-clock-tick":
        if (!isPlay(clock.data.state)) {
          // note: in the future we might want to replace this `break;` with something along the lines of
          // `clock.data.lastOutsideTickProvokingSimulationTick = event.timestamp;`
          // until proven otherwise, this is not a good idea!
          // all the other relevant events will still need timestamps to order them properly between ticks regardless,
          // thus for now we save on complexity by having the "resume" command provide both the timestamp (ie data)
          // for the related behavior and a single location in the codebase for said behavior (that `case`).
          break;
        }
        const { speed, tick } = getPrimitive(clock.data.state);
        const timeElapsed = Math.floor(
          event.timeStamp - clock.data.lastOutsideTickProvokingSimulationTick
        );
        const timeStep = Math.floor(1000 / speed);
        const advanced = Math.floor(timeElapsed / timeStep);
        if (advanced <= 0) {
          break;
        }
        clock.data.lastOutsideTickProvokingSimulationTick = event.timeStamp;
        clock.data.state = setPrimitive(clock.data.state, {
          speed,
          tick: tick + advanced,
        });
        for (let index = 1; index <= advanced; index++)
          emitted.push({
            tag: "simulation-clock-tick",
            tick: tick + index,
          });
        break;
    }
  }
  return [clock, emitted];
}

export function getClock(simulation: Simulation): ClockState {
  return (
    (simulation.processors.get("clock-0") as Clock | undefined)?.data.state ??
    ([{ tick: 0, speed: 1 }] as ClockState)
  );
}
