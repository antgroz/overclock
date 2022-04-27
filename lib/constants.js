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

const c = exports;

c.DEFAULT_CONCURRENCY_LIMIT = 1;
c.DEFAULT_LIVENESS_THRESHOLD = -1;
c.DEFAULT_FACTORY_CAPACITY = -1;
c.DEFAULT_GENERATION_LIMIT = -1;
c.DEFAULT_START_TIMEOUT = 0;
c.DEFAULT_RUN_TIMEOUT = -1;
c.DEFAULT_STOP_TIMEOUT = 0;
c.DEFAULT_GRACE_TIMEOUT = -1;
c.DEFAULT_HEARTBEAT_INTERVAL = 1000;
c.DEFAULT_REACTOR_TIMEOUT = 1000;
c.DEFAULT_TASK_TYPE = 'heartbeat';

c.EVENT_MAP = new Map([
  [kStarting, 'starting'],
  [kStarted, 'started'],
  [kSpawning, 'spawning'],
  [kSpawned, 'spawned'],
  [kTick, 'tick'],
  [kTock, 'tock'],
  [kStopping, 'stopping'],
  [kStopped, 'stopped'],
]);

c.EVENT_SYMBOLS = new Set(c.EVENT_MAP.keys());
c.EVENT_NAMES = new Set(c.EVENT_MAP.values());
