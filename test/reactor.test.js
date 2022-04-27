const { before, describe, it } = require('mocha');
const Reactor = require('../lib/reactor');
const { expect, should } = require('chai');
const { spy, useFakeTimers } = require('sinon');
const Base = require('../lib/base');

should();

describe('reactor', () => {
  let clock;

  before(() => {
    clock = useFakeTimers();
  });

  describe('constructor', () => {
    it('should check that reactor timeout is valid', () => {
      const options = {
        name: 'foo',
        executable: () => 0,
        reactorTimeoutMillis: -2,
      };
      const ctor = () => new Reactor(options);
      ctor.should.throw();
    });

    it('should check that reactor branching limit is valid', () => {
      const options = {
        name: 'foo',
        executable: () => 0,
        reactorBranchingLimit: 2.3,
      };
      const ctor = () => new Reactor(options);
      ctor.should.throw();
    });

    it('should set up additional parameters', () => {
      const task = new Reactor({
        name: 'foo',
        executable: () => null,
        reactorTimeoutMillis: 300,
      });
      task.reactorTimeoutMillis.should.eq(300);
    });

    it('should use defaults when necessary', () => {
      const task = new Reactor({ name: 'foo', executable: () => null });
      task.reactorTimeoutMillis.should.eq(1000);
    });
  });

  describe('_start', () => {
    it('should spawn the first generation', () => {
      const task = new Reactor({ name: 'foo', executable: () => null });
      task._spawn = spy();
      task._started();
      task._spawn.calledOnce.should.be.true;
    });

    it('should call the parent _started method', () => {
      const task = new Reactor({ name: 'foo', executable: () => null });
      Base.prototype._started = spy();
      task._spawn = () => {};
      task._started();
      Base.prototype._started.calledOnce.should.be.true;
    });
  });

  describe('_tock', () => {
    it('should call the parent _tock method', () => {
      const task = new Reactor({ name: 'foo', executable: () => null });
      task._spawn = () => {};
      const data = {};
      Base.prototype._tock = spy();
      task._tock(data);
      Base.prototype._tock.calledOnceWith(data).should.be.true;
      clock.runAll();
    });

    it('should do nothing more if stopping', () => {
      const task = new Reactor({ name: 'foo', executable: () => null });
      task._isStopping = true;
      task._tock({});
      expect(task._timeout).to.be.null;
    });

    it('should do nothing more if stopped', () => {
      const task = new Reactor({ name: 'foo', executable: () => null });
      task._isStopped = true;
      task._tock({});
      expect(task._timeout).to.be.null;
    });

    it('should initiate stopping if reactor branching limit is zero', async () => {
      const task = new Reactor({
        name: 'foo',
        executable: () => null,
        reactorBranchingLimit: 0,
      });
      task._tryStop = spy(async () => {});
      task._tock();
      task._tryStop.calledOnce.should.be.true;
      await clock.runAllAsync();
    });

    it('should spawn with error if reactor branching limit is reached', () => {
      const task = new Reactor({
        name: 'foo',
        executable: () => null,
        reactorBranchingLimit: 2,
      });
      task._timeouts = new Set([0, 1]);
      task._spawned = spy();
      task._tock();
      task._spawned.calledOnce.should.be.true;
    });

    it('should schedule the next spawning when possible', () => {
      const task = new Reactor({
        name: 'foo',
        executable: () => null,
        reactorBranchingLimit: -1,
      });
      task._spawn = () => {};
      task._isStopped = false;
      task._isStarted = true;
      task._tock({});
      task._timeouts.size.should.be.gt(0);
      clock.runAll();
    });
  });

  describe('_tryStop', () => {
    it('clears all timeouts', async () => {
      const task = new Reactor({ name: 'foo', executable: () => null });
      task._timeouts.add(setTimeout(() => 5, 10000));
      task._tryStop();
      task._timeouts.size.should.eq(0);
      await clock.runAllAsync();
    });

    it('should call the parent _tryStop method', async () => {
      const s = spy(Base.prototype, '_tryStop');
      const task = new Reactor({ name: 'foo', executable: () => null });
      task._timeouts.add(setTimeout(() => 5, 10000));
      task._tryStop();
      s.calledOnce.should.be.true;
      await clock.runAllAsync();
    });
  });
});
