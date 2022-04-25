import { describe, it } from 'mocha';
import { expect, should } from 'chai';
import { Heartbeat } from '../../lib/heartbeat.js';
import { spy, useFakeTimers } from 'sinon';
import { Base } from '../../lib/base.js';

should();

describe('heartbeat', () => {
  const clock = useFakeTimers();

  describe('constructor', () => {
    it('should set up additional parameters', () => {
      const task = new Heartbeat({ heartbeatIntervalMillis: 300 });
      task.heartbeatIntervalMillis.should.eq(300);
    });

    it('should use defaults when necessary', () => {
      const task = new Heartbeat({});
      task.heartbeatIntervalMillis.should.eq(1000);
    });
  });

  describe('_start', () => {
    it('should set up the heartbeat interval', () => {
      const task = new Heartbeat({});
      task._spawn = () => {};
      task._start();
      task._interval.should.not.be.null;
      clock.next();
      clearInterval(task._interval);
    });

    it('should call _spawn method right away', () => {
      const task = new Heartbeat({});
      task._spawn = spy();
      task._start();
      task._spawn.calledOnce.should.be.true;
      clearInterval(task._interval);
    });

    it('should call parent _start method', () => {
      const task = new Heartbeat({});
      task._spawn = () => {};
      Base.prototype._start = spy();
      task._start();
      Base.prototype._start.calledOnce.should.be.true;
      clearInterval(task._interval);
    });
  });

  describe('_tryStop', () => {
    it('should call the parent _tryStop method', async () => {
      const task = new Heartbeat({});
      Base.prototype._tryStop = spy();
      await task._tryStop();
      Base.prototype._tryStop.calledOnce.should.be.true;
    });

    it('should clean up heartbeat interval', async () => {
      const task = new Heartbeat({});
      task._interval = setInterval(() => null, 1000);
      Base.prototype._tryStop = async () => {
        expect(task._interval).to.be.null;
      };
      await task._tryStop();
    });
  });
});
