type Primitive = {
  speed: number;
  tick: number;
};
export type Play = [Primitive];
export type Pause = [Primitive, "pause"];
export type IndirectPause = [...(Play | Pause), "indirect-pause"];
export type NotEditing = Play | Pause | IndirectPause;
export type EditingSpeed = [...NotEditing, "editing-speed"];
export type ClockState = NotEditing | EditingSpeed;
export function isPlay(c: ClockState): c is Play {
  return c.length === 1;
}
export function isPause(c: ClockState): c is Pause {
  return c.at(-1) === "pause";
}
export function isIndirectPause(c: ClockState): c is IndirectPause {
  return c.at(-1) === "indirect-pause";
}
export function isEditing(c: ClockState): c is EditingSpeed {
  return c.at(-1) === "editing-speed";
}

export function getPrimitive(c: ClockState): Primitive {
  return c[0];
}
export function setPrimitive(c: ClockState, p: Primitive): ClockState {
  c[0] = p;
  return c;
}

export function unPause(c: Pause): Play {
  c.pop();
  // @ts-ignore
  return c;
}
export function pause(c: Play): Pause {
  // @ts-ignore
  c.push("pause");
  //@ts-ignore
  return c;
}
export function indirectPause(c: Play | Pause): IndirectPause {
  // @ts-ignore
  c.push("indirect-pause");
  // @ts-ignore
  return c;
}
export function indirectResume(c: IndirectPause): Play | Pause {
  c.pop();
  // @ts-ignore
  return c;
}
export function startEditing(c: NotEditing): EditingSpeed {
  // @ts-ignore
  c.push("editing-speed");
  // @ts-ignore
  return c;
}

export function stopEditing(c: EditingSpeed): NotEditing {
  c.pop();
  // @ts-ignore
  return c;
}

export function setSpeed(c: NotEditing, speed: number): NotEditing {
  getPrimitive(c).speed = speed;
  return c;
}
