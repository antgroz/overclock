import { HeartbeatTask, HeartbeatTaskOptions } from './tasks/heartbeat-task';
import { ReactorTask, ReactorTaskOptions } from './tasks/reactor-task';
import { ParameterError } from './util/errors';
import * as is from './util/is';

export type TaskType = 'heartbeat' | 'reactor';
export type Task<R = any> = HeartbeatTask<R> | ReactorTask<R>;
export type TaskOptions<R = any> = {
  type: TaskType;
} & HeartbeatTaskOptions<R> &
  ReactorTaskOptions<R>;
export type TaskListener = (...args: unknown[]) => void;

export function createTask<R = any>(options: TaskOptions<R>): Task<R> {
  if (!is.object(options)) {
    const message = 'Task options must be an object';
    throw new ParameterError(message);
  }

  const { type } = options;
  if (type === 'heartbeat') return new HeartbeatTask(options);
  if (type === 'reactor') return new ReactorTask(options);

  const message = `Task type '${type}' is invalid`;
  throw new ParameterError(message);
}
