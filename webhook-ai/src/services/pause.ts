let pausedGlobal = false;

export function isGloballyPaused() {
  return pausedGlobal;
}

export function setGlobalPause(p: boolean) {
  pausedGlobal = !!p;
}
