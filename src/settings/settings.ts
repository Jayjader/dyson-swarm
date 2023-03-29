import { writable } from "svelte/store";

export const SETTINGS_CONTEXT = Symbol("settings");

export const makeSettingsStore = () => writable({ show3dRender: false });
