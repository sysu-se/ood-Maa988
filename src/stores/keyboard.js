import { derived } from 'svelte/store';
import { gamePaused } from './_core.js';

export const keyboardDisabled = derived(gamePaused, $gamePaused => $gamePaused);