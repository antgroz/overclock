'use strict';

const { before, describe, it, after } = require('mocha');
const { expect, should } = require('chai');
const Heartbeat = require('../lib/heartbeat');
const { spy, useFakeTimers } = require('sinon');
const Base = require('../lib/base');

should();

describe('heartbeat', () => {
  let clock;

  before(() => {
    clock = useFakeTimers();
  });

  after(() => {
    clock.restore();
  });

  describe('constructor', () => {
    it('should check that heartbeat interval is valid', () => {
      const options = {
        name: 'foo',
        executable: () => 0,
        heartbeatIntervalMillis: -2,
      };
      const ctor = () => new Heartbeat(options);
      const message =
        'Task heartbeat interval must be a finite non-negative number';
      ctor.should.throw(message);
    });

    it('should set up additional parameters', () => {
      const task = new Heartbeat({
        name: 'foo',
        executable: () => null,
        heartbeatIntervalMillis: 300,
      });
      task.heartbeatIntervalMillis.should.eq(300);
    });

    it('should use defaults when necessary', () => {
      const task = new Heartbeat({ name: 'foo', executable: () => null });
      task.heartbeatIntervalMillis.should.eq(1000);
    });
  });

  describe('_start', () => {
    it('should set up the heartbeat interval', () => {
      const task = new Heartbeat({ name: 'foo', executable: () => null });
      task._spawn = () => {};
      task._started();
      task._interval.should.not.be.null;
      clock.next();
      clearInterval(task._interval);
    });

    it('should call _spawn method right away', () => {
      const task = new Heartbeat({ name: 'foo', executable: () => null });
      task._spawn = spy();
      task._started();
      task._spawn.calledOnce.should.be.true;
      clearInterval(task._interval);
    });

    it('should call parent _started method', () => {
      const task = new Heartbeat({ name: 'foo', executable: () => null });
      task._spawn = () => {};
      Base.prototype._started = spy();
      task._started();
      Base.prototype._started.calledOnce.should.be.true;
      clearInterval(task._interval);
    });
  });

  describe('_tryStop', () => {
    it('should call the parent _tryStop method', async () => {
      const task = new Heartbeat({ name: 'foo', executable: () => null });
      Base.prototype._tryStop = spy();
      await task._tryStop();
      Base.prototype._tryStop.calledOnce.should.be.true;
    });

    it('should clean up heartbeat interval', async () => {
      const task = new Heartbeat({ name: 'foo', executable: () => null });
      task._interval = setInterval(() => null, 1000);
      Base.prototype._tryStop = async () => {
        expect(task._interval).to.be.null;
      };
      await task._tryStop();
    });
  });
});
