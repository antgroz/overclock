export const DEFAULT_TASK_TYPE = 'heartbeat';
export const DEFAULT_HEARTBEAT_INTERVAL = 1000;
export const DEFAULT_REACTOR_TIMEOUT = 1000;

export const EVENTS = new Set([
  'starting',
  'started',
  'spawning',
  'spawned',
  'tick',
  'tock',
  'stopping',
  'stopped',
]);
