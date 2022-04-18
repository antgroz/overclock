export const EVENTS = [
  'starting',
  'started',
  'spawning',
  'spawned',
  'tick',
  'tock',
  'stopping',
  'stopped',
] as const;

export const TASK_TYPE_HEARTBEAT = 'heartbeat' as const;
export const TASK_TYPE_REACTOR = 'reactor' as const;
export const TASK_TYPES = [TASK_TYPE_HEARTBEAT, TASK_TYPE_REACTOR] as const;
