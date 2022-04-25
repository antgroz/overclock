export type TaskType = 'heartbeat' | 'reactor';
export type Task<R = any> = HeartbeatTask<R> | ReactorTask<R>;
export type TaskOptions<R = any> = {
  type: TaskType;
} & HeartbeatTaskOptions<R> &
  ReactorTaskOptions<R>;
export type TaskListener = (...args: unknown[]) => void;

export type PrincipeOptions = {
  tasks?: TaskOptions[];
};

export type BaseTaskOptions<R> = {
  name: string;
  executable: () => R | Promise<R>;
  concurrencyLimit: number;
  livenessThreshold: number;
  factoryCapacity: number;
  generationLimit: number;
  startTimeoutMillis: number;
  runTimeoutMillis: number;
  stopTimeoutMillis: number;
  gracefulTimeoutMillis: number;
};
import { EventEmitter } from 'node:events';


export type HeartbeatTaskOptions<R = any> = BaseTaskOptions<R> & {
  heartbeatIntervalMillis: number;
};

export type ReactorTaskOptions<R> = BaseTaskOptions<R> & {
  reactorTimeoutMillis: number;
};


export type Schedule = 'once' | 'periodic' | 'recurrent' | 'sequential';

export type TaskEvent =
  | 'starting'
  | 'started'
  | 'tick'
  | 'tock'
  | 'stopping'
  | 'stopped';

export type TaskExecutable<R = any> =
  | (() => R)
  | ((callback: (error: Error | null, result: null | R) => void) => void)
  | (() => PromiseLike<R>);

export type TaskOptions<R = any> = {
  name: string;
  executable: TaskExecutable<R>;
  schedule?: Schedule;
  unpipe?: boolean | TaskEvent | TaskEvent[];
  startTimeoutMillis?: number;
  runIntervalMillis?: number;
  stopTimeoutMillis?: number;
  gracefulTimeoutMillis?: number;
  Promise?: PromiseConstructorLike;
};

export type TaskData<R = any> = {
  task: Task<R>;
  tickAt: Date;
  tockAt: Date;
  error: Error;
  result: R;
};

export type TaskListener<R = any> = (data: TaskData<R>) => void;

declare class Task<R = any> extends EventEmitter {
  name: string;
  executable: TaskExecutable<R>;
  startTimeoutMillis?: string;
  runIntervalMillis?: string;
  stopTimeoutMillis?: string;
  gracefulTimeoutMillis?: string;
  Promise?: PromiseConstructorLike;
  isStarting: boolean;
  isStarted: boolean;
  runningCount: number;
  isStopping: boolean;
  isStopped: boolean;
  startingAt?: Date;
  startedAt?: Date;
  stoppingAt?: Date;
  stoppedAt?: Date;

  constructor(options: TaskOptions<R>);

  addListener(event: TaskEvent, listener: TaskListener): this;

  on(event: TaskEvent, listener: TaskListener): this;

  once(event: TaskEvent, listener: TaskListener): this;

  removeListener(event: TaskEvent, listener: TaskListener): this;

  off(event: TaskEvent, listener: TaskListener): this;

  removeAllListeners(event?: TaskEvent): this;

  start(): void;

  stop(): PromiseLike<void>;
  stop(callback: (error: Error | null) => void): void;
}

export type RacerOptions = {
  schedule?: Schedule;
  startTimeoutMillis?: number;
  runIntervalMillis?: number;
  stopTimeoutMillis?: number;
  gracefulTimeoutMillis?: number;
  Promise?: PromiseConstructorLike;
  tasks: Task[];
};

declare class Racer extends EventEmitter {
  schedule: Schedule;
  startTimeoutMillis?: number;
  runIntervalMillis?: number;
  stopTimeoutMillis?: number;
  gracefulTimeoutMillis?: number;
  Promise?: PromiseConstructorLike;
  tasks: Record<string, Task>;
  pipes: Record<TaskEvent, TaskListener>;

  constructor(options?: RacerOptions);

  addListener(event: TaskEvent, listener: TaskListener): this;

  on(event: TaskEvent, listener: TaskListener): this;

  once(event: TaskEvent, listener: TaskListener): this;

  removeListener(event: TaskEvent, listener: TaskListener): this;

  off(event: TaskEvent, listener: TaskListener): this;

  removeAllListeners(event?: TaskEvent): this;

  add<R = any>(options: TaskOptions<R>): this;

  get<R = any>(task: string): Task<R> | undefined;

  has(task: string): boolean;

  del(task: string): boolean;

  pipe(task: string, event?: TaskEvent): this;

  unpipe(task: string, event?: TaskEvent): this;

  start(task?: string): this;

  stop(task?: string): PromiseLike<void>;
  stop(callback: (error: Error | null) => void, task?: string): void;
}

export function taskracer(options?: RacerOptions): Racer;

export default taskracer;
