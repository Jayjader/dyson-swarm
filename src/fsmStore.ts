import { sm } from "jssm";
import { derived, writable } from "svelte/store";

export function createFsm(fsmDsl: string) {
  const { subscribe, update } = writable(sm`${fsmDsl}`);
  return {
    subscribe,
    action: (a: string) => {
      update(($fsm) => {
        console.debug(`pre-action: ${$fsm.state()}`);
        const success = $fsm.action(a);
        if (!success) {
          console.warn("action failed");
        }
        console.debug(`post-action: ${$fsm.state()}`);
        return $fsm;
      });
    },
  };
}

type FsmStore = ReturnType<typeof createFsm>;

export function state<States extends string>($fsm: FsmStore) {
  return derived($fsm, ($fsm_) => $fsm_.state() as States);
}
