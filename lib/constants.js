const {
  kStarting,
  kStarted,
  kSpawning,
  kSpawned,
  kTick,
  kTock,
  kStopping,
  kStopped,
} = require('./symbols');

exports.DEFAULT_CONCURRENCY_LIMIT = 1;
exports.DEFAULT_LIVENESS_THRESHOLD = -1;
exports.DEFAULT_FACTORY_CAPACITY = -1;
exports.DEFAULT_GENERATION_LIMIT = -1;
exports.DEFAULT_START_TIMEOUT = 0;
exports.DEFAULT_RUN_TIMEOUT = -1;
exports.DEFAULT_STOP_TIMEOUT = 0;
exports.DEFAULT_GRACE_TIMEOUT = -1;
exports.DEFAULT_HEARTBEAT_INTERVAL = 1000;
exports.DEFAULT_REACTOR_TIMEOUT = 1000;
exports.DEFAULT_TASK_TYPE = 'heartbeat';

exports.EVENT_MAP = new Map([
  [kStarting, 'starting'],
  [kStarted, 'started'],
  [kSpawning, 'spawning'],
  [kSpawned, 'spawned'],
  [kTick, 'tick'],
  [kTock, 'tock'],
  [kStopping, 'stopping'],
  [kStopped, 'stopped'],
]);

exports.EVENT_SYMBOLS = new Set(exports.EVENT_MAP.keys());
exports.EVENT_NAMES = new Set(exports.EVENT_MAP.values());
