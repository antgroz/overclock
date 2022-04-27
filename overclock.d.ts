import { EventEmitter } from 'node:events';

export type TaskType = 'heartbeat' | 'reactor';

export type TaskEvent =
  | 'starting'
  | 'started'
  | 'spawning'
  | 'spawned'
  | 'tick'
  | 'tock'
  | 'stopping'
  | 'stopped';

export type TaskExecutable<R = any> = () => R | Promise<R>;

export type TaskDataTick<R = any> = {
  task: Task<R>;
  tickAt: Date;
  tockAt: null;
  error: null;
  result: null;
};

export type TaskDataTock<R = any> = {
  task: Task<R>;
  tickAt: Date;
  tockAt: Date;
  error: Error | null;
  result: null | R;
};

export type TaskDataSpawned<R = any> = {
  task: Task<R>;
  error: Error | null;
  result: null | number;
};

export type TaskDataOther<R = any> = {
  task: Task<R>;
};

export type TaskData<R> =
  | TaskDataTick<R>
  | TaskDataTock<R>
  | TaskDataSpawned<R>
  | TaskDataOther<R>;

export type TaskListener<R = any> = (data: TaskData<R>) => void;

export type BaseTaskOptions<R = any> = {
  name: string;
  executable: TaskExecutable<R>;
  concurrencyLimit?: number;
  livenessThreshold?: number;
  initialCapacity?: number;
  factoryCapacity?: number;
  generationLimit?: number;
  startTimeoutMillis?: number;
  runTimeoutMillis?: number;
  stopTimeoutMillis?: number;
  graceTimeoutMillis?: number;
};

declare class Base<R = any> extends EventEmitter {
  readonly name: string;
  readonly executable: TaskExecutable<R>;
  readonly concurrencyLimit: number;
  readonly livenessThreshold: number;
  readonly initialCapacity: number;
  readonly factoryCapacity: number;
  readonly generationLimit: number;
  readonly startTimeoutMillis: number;
  readonly runTimeoutMillis: number;
  readonly stopTimeoutMillis: string;
  readonly graceTimeoutMillis: string;
  readonly isStarting: boolean;
  readonly isStarted: boolean;
  readonly isStopping: boolean;
  readonly isStopped: boolean;
  readonly startingAt: Date | null;
  readonly startedAt: Date | null;
  readonly stoppingAt: Date | null;
  readonly stoppedAt: Date | null;
  readonly population: number;
  readonly generations: number;
  readonly ticks: number;
  readonly tocks: number;

  addListener(event: TaskEvent, listener: TaskListener): this;

  on(event: TaskEvent, listener: TaskListener): this;

  once(event: TaskEvent, listener: TaskListener): this;

  removeListener(event: TaskEvent, listener: TaskListener): this;

  off(event: TaskEvent, listener: TaskListener): this;

  removeAllListeners(event?: TaskEvent): this;

  start(): void;

  stop(): Promise<void>;
}

export type HeartbeatTaskOptions<R = any> = BaseTaskOptions<R> & {
  heartbeatIntervalMillis?: number;
};

declare class Heartbeat<R = any> extends Base<R> {
  readonly heartbeatIntervalMillis: number;

  constructor(options: HeartbeatTaskOptions<R>);
}

export type ReactorTaskOptions<R = any> = BaseTaskOptions<R> & {
  reactorTimeoutMillis?: number;
};

declare class Reactor<R = any> extends Base<R> {
  readonly reactorTimeoutMillis: number;

  constructor(options: ReactorTaskOptions<R>);
}

export type TaskOptions<R = any> = { type?: TaskType } & (
  | HeartbeatTaskOptions<R>
  | ReactorTaskOptions<R>
);

export type Task<R = any> = Heartbeat<R> | Reactor<R>;

export type ManagerOptions = {
  tasks?: TaskOptions[];
};

declare class Manager extends EventEmitter {
  constructor(options?: ManagerOptions);

  addListener(event: TaskEvent, listener: TaskListener): this;

  on(event: TaskEvent, listener: TaskListener): this;

  once(event: TaskEvent, listener: TaskListener): this;

  removeListener(event: TaskEvent, listener: TaskListener): this;

  off(event: TaskEvent, listener: TaskListener): this;

  removeAllListeners(event?: TaskEvent): this;

  add<R = any>(options: TaskOptions<R>): this;

  get<R = any>(task: string): Task<R> | undefined;

  has(task: string): boolean;

  delete(task: string): boolean;

  subscribe(task: string, event?: TaskEvent): this;

  unsubscribe(task: string, event?: TaskEvent): this;

  start(task?: string): this;

  stop(task?: string): Promise<void>;
}

export function overclock(options?: ManagerOptions): Manager;

export default overclock;
