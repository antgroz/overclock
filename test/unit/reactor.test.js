import { describe, it } from 'mocha';
import { Reactor } from '../../lib/reactor.js';
import { expect, should } from 'chai';
import { spy, useFakeTimers } from 'sinon';
import { Base } from '../../lib/base.js';

should();

describe('reactor', () => {
  const clock = useFakeTimers();

  describe('constructor', () => {
    it('should set up additional parameters', () => {
      const task = new Reactor({ reactorTimeoutMillis: 300 });
      task.reactorTimeoutMillis.should.eq(300);
    });

    it('should use defaults when necessary', () => {
      const task = new Reactor({});
      task.reactorTimeoutMillis.should.eq(1000);
    });
  });

  describe('_start', () => {
    it('should spawn the first generation', () => {
      const task = new Reactor({});
      task._spawn = spy();
      task._start();
      task._spawn.calledOnce.should.be.true;
    });

    it('should call the parent _start method', () => {
      const task = new Reactor({});
      Base.prototype._start = spy();
      task._spawn = () => {};
      task._start();
      Base.prototype._start.calledOnce.should.be.true;
    });
  });

  describe('_tock', () => {
    it('should call the parent _tock method', () => {
      const task = new Reactor({});
      task._spawn = () => {};
      const data = {};
      Base.prototype._tock = spy();
      task._tock(data);
      Base.prototype._tock.calledOnceWith(data).should.be.true;
      clock.runAll();
    });

    it('should do nothing more if stopping', () => {
      const task = new Reactor({});
      task._isStopping = true;
      task._tock({});
      expect(task._timeout).to.be.null;
    });

    it('should do nothing more if stopped', () => {
      const task = new Reactor({});
      task._isStopped = true;
      task._tock({});
      expect(task._timeout).to.be.null;
    });

    it('should schedule the next spawning when possible', () => {
      const task = new Reactor({});
      task._spawn = () => {};
      task._isStopped = false;
      task._isStarted = true;
      task._tock({});
      task._timeout.should.not.be.null;
      clock.runAll();
    });
  });
});
