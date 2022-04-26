exports.DEFAULT_CONCURRENCY_LIMIT = -1;
exports.DEFAULT_LIVENESS_THRESHOLD = -1;
exports.DEFAULT_FACTORY_CAPACITY = -1;
exports.DEFAULT_GENERATION_LIMIT = -1;
exports.DEFAULT_START_TIMEOUT = 0;
exports.DEFAULT_RUN_TIMEOUT = -1;
exports.DEFAULT_STOP_TIMEOUT = 0;
exports.DEFAULT_GRACEFUL_TIMEOUT = -1;
exports.DEFAULT_HEARTBEAT_INTERVAL = 1000;
exports.DEFAULT_REACTOR_TIMEOUT = 1000;
exports.DEFAULT_TASK_TYPE = 'heartbeat';

exports.EVENTS = new Set([
  'starting',
  'started',
  'spawning',
  'spawned',
  'tick',
  'tock',
  'stopping',
  'stopped',
]);
