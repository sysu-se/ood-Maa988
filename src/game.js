export { default } from './stores/_core.js';
export {
	applyHint,
	fromJSON,
	game as gameStore,
	gamePaused,
	gameWon,
	canUndo,
	canRedo,
	guess,
	getHintInfo,
	pauseGame,
	pauseGame as pause,
	resumeGame,
	resumeGame as resume,
	startCustom,
	startNew,
	toJSON,
	undo,
	redo
} from './stores/_core.js';