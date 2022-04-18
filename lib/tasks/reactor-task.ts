import { BaseTask, BaseTaskOptions } from './base-task';

export type ReactorTaskOptions<R> = BaseTaskOptions<R> & {
  reactorTimeoutMillis: number;
};

export class ReactorTask<R>
  extends BaseTask<R>
  implements ReactorTaskOptions<R>
{
  public reactorTimeoutMillis: number;

  /**
   * @param options - Task options
   */
  public constructor(options: ReactorTaskOptions<R>) {
    super(options);
  }

  protected _start() {
    this._spawn();

    super._start();
  }

  protected _tock(data) {
    super._tock(data);

    if (this._isStopping || this._isStopped) {
      return;
    }

    this._timeout = setTimeout(() => {
      this._spawn();
    }, this.reactorTimeoutMillis || 0);
  }
}
