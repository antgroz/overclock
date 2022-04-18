import { BaseTask, BaseTaskOptions } from './base-task';

export type HeartbeatTaskOptions<R> = BaseTaskOptions<R> & {
  heartbeatIntervalMillis: number;
};

export class HeartbeatTask<R>
  extends BaseTask<R>
  implements HeartbeatTaskOptions<R>
{
  private _interval: NodeJS.Timeout | null = null;
  public heartbeatIntervalMillis: number;

  /**
   * @param options - Task options
   */
  public constructor(options: HeartbeatTaskOptions<R>) {
    super(options);
  }

  protected _start() {
    this._interval = setInterval(() => {
      this._spawn();
    }, this.heartbeatIntervalMillis);

    this._spawn();

    super._start();
  }

  protected async _stop() {
    clearInterval(this._interval);
    this._interval = null;

    return super._stop();
  }
}
