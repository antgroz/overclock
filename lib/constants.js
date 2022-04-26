export const DEFAULT_CONCURRENCY_LIMIT = -1;
export const DEFAULT_LIVENESS_THRESHOLD = -1;
export const DEFAULT_FACTORY_CAPACITY = -1;
export const DEFAULT_GENERATION_LIMIT = -1;
export const DEFAULT_START_TIMEOUT = 0;
export const DEFAULT_RUN_TIMEOUT = -1;
export const DEFAULT_STOP_TIMEOUT = 0;
export const DEFAULT_GRACEFUL_TIMEOUT = -1;
export const DEFAULT_HEARTBEAT_INTERVAL = 1000;
export const DEFAULT_REACTOR_TIMEOUT = 1000;
export const DEFAULT_TASK_TYPE = 'heartbeat';

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
