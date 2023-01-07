type Primitive = {
  speed: number;
  tick: number;
};
export type Play = [Primitive];
export type Pause = ["pause", Primitive];
export type IndirectPause = ["indirect-pause", Primitive];
export type ClockState = Play | Pause | IndirectPause;
export function isPlay(c: ClockState): c is Play {
  return c.length === 1;
}
export function isPause(c: ClockState): c is Pause {
  return c[0] === "pause";
}
export function isIndirectPause(c: ClockState): c is IndirectPause {
  return c[0] === "indirect-pause";
}

export function getPrimitive(c: ClockState): Primitive {
  return (c.slice(-1) as Play)[0];
}
export function setPrimitive(c: ClockState, p: Primitive): ClockState {
  return c.splice(-1, 1, p) as ClockState;
}
