const { before, describe, it } = require('mocha');
const { expect, should, use } = require('chai');
const Base = require('../lib/base');
const { spy, useFakeTimers } = require('sinon');
const chaiAsPromised = require('chai-as-promised');
const { kTock } = require('../lib/symbols');
const {
  DEFAULT_LIVENESS_THRESHOLD,
  DEFAULT_RUN_TIMEOUT,
  DEFAULT_STOP_TIMEOUT,
} = require('../lib/constants');

use(chaiAsPromised);
should();

describe('base task', () => {
  let clock;

  before(() => {
    clock = useFakeTimers();
  });

  describe('constructor', () => {
    it('should set up options correctly', async () => {
      const options = {
        name: 'task',
        executable: () => 5,
        concurrencyLimit: 0,
        livenessThreshold: null,
        factoryCapacity: 10,
        generationLimit: 500,
        startTimeoutMillis: 0,
        runTimeoutMillis: null,
        stopTimeoutMillis: null,
        gracefulTimeoutMillis: 5,
      };

      const task = new Base(options);

      task.name.should.eq(options.name);
      task.executable.should.eq(options.executable);
      task.concurrencyLimit.should.eq(options.concurrencyLimit);
      task.livenessThreshold.should.eq(DEFAULT_LIVENESS_THRESHOLD);
      task.factoryCapacity.should.eq(options.factoryCapacity);
      task.generationLimit.should.eq(options.generationLimit);
      task.startTimeoutMillis.should.eq(options.startTimeoutMillis);
      task.runTimeoutMillis.should.eq(DEFAULT_RUN_TIMEOUT);
      task.stopTimeoutMillis.should.eq(DEFAULT_STOP_TIMEOUT);
      task.gracefulTimeoutMillis.should.eq(options.gracefulTimeoutMillis);
    });

    it('should check that name is provided', () => {
      const ctor = () => new Base({ executable: () => 5 });
      const message = 'Task name must be a non-empty string';
      ctor.should.throw(message);
    });

    it('should check that executable is provided', () => {
      const ctor = () => new Base({ name: 'foo' });
      const message = 'Task executable must be a function';
      ctor.should.throw(message);
    });

    it('should check that concurrency limit is valid', () => {
      const ctor = () =>
        new Base({
          name: 'foo',
          executable: () => null,
          concurrencyLimit: 1.5,
        });
      const message = 'Task concurrency limit must be an integer';
      ctor.should.throw(message);
    });

    it('should check that liveness threshold is valid', () => {
      const ctor = () =>
        new Base({
          name: 'foo',
          executable: () => null,
          livenessThreshold: 1.5,
        });
      const message = 'Task liveness threshold must be an integer';
      ctor.should.throw(message);
    });

    it('should check that factory capacity is valid', () => {
      const ctor = () =>
        new Base({ name: 'foo', executable: () => null, factoryCapacity: '' });
      const message = 'Task factory capacity must be an integer';
      ctor.should.throw(message);
    });

    it('should check that generation limit is valid', () => {
      const options = { name: 'a', executable: () => 0, generationLimit: -0.1 };
      const ctor = () => new Base(options);
      const message = 'Task generation limit must be an integer';
      ctor.should.throw(message);
    });

    it('should check that start timeout is valid', () => {
      const options = {
        name: 'a',
        executable: () => 0,
        startTimeoutMillis: '',
      };
      const ctor = () => new Base(options);
      const message = 'Task start timeout must be a finite non-negative number';
      ctor.should.throw(message);
    });

    it('should check that run timeout is valid', () => {
      const options = {
        name: 'a',
        executable: () => 0,
        runTimeoutMillis: Number.POSITIVE_INFINITY,
      };
      const ctor = () => new Base(options);
      const message = 'Task run timeout must be a finite number';
      ctor.should.throw(message);
    });

    it('should check that stop timeout is valid', () => {
      const options = {
        name: 'a',
        executable: () => 0,
        stopTimeoutMillis: -5,
      };
      const ctor = () => new Base(options);
      const message = 'Task stop timeout must be a finite non-negative number';
      ctor.should.throw(message);
    });

    it('should check that graceful timeout is valid', () => {
      const options = {
        name: 'a',
        executable: () => 0,
        gracefulTimeoutMillis: '2',
      };
      const ctor = () => new Base(options);
      const message = 'Task graceful timeout must be a finite number';
      ctor.should.throw(message);
    });
  });

  describe('_starting', () => {
    it('should change the state', () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._starting();
      task.isStarting.should.be.true;
      task.startingAt.should.be.instanceof(Date);
      clock.runAll();
    });

    it('should emit a starting event', (done) => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task.on('starting', () => {
        done();
      });
      task._starting();
      clock.runAll();
    });
  });

  describe('_started', () => {
    it('should change the state', () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._started();
      expect(task._timeout).to.be.null;
      task.isStarting.should.be.false;
      task.isStarted.should.be.true;
      task.startedAt.should.be.instanceof(Date);
      task.isStopped.should.be.false;
    });

    it('should emit a started event', (done) => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task.on('started', () => {
        done();
      });
      task._started();
    });
  });

  describe('_stopping', () => {
    it('should change the state of the task', () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._stopping();
      task.isStopping.should.be.true;
      task.stoppingAt.should.be.instanceof(Date);
    });

    it('should emit a stopping event', (done) => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task.on('stopping', () => {
        done();
      });
      task._stopping();
    });
  });

  describe('_stopped', () => {
    it('should clear the timeout', () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._timeout = setTimeout(() => null, 3000);
      task._stopped();
      expect(task._timeout).to.be.null;
    });

    it('should change the state of the task', () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._isStarted = true;
      task._stopped();
      task.isStarting.should.be.false;
      task.isStarted.should.be.false;
      task.isStopping.should.be.false;
      task.isStopped.should.be.true;
      task.stoppedAt.should.be.instanceof(Date);
    });

    it('should emit the stopped event', (done) => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task.on('stopped', () => {
        done();
      });
      task._stopped();
    });
  });

  describe('_run', () => {
    it('should execute the wrapper when unlimited timeout is given', async () => {
      const task = new Base({
        name: 'foo',
        executable: () => 5,
        runTimeoutMillis: -1,
      });
      await task._run().should.eventually.eq(5);
    });

    it('should throw a timeout error when times out', async () => {
      const task = new Base({
        name: 'foo',
        executable: () => new Promise((resolve) => setTimeout(resolve, 5)),
        runTimeoutMillis: 0,
      });
      const error = 'Run timeout of 0 ms reached';
      const promise = task._run().should.eventually.be.rejectedWith(error);
      clock.runAll();
      return promise;
    });

    it('should pass abort signal if supported', async () => {
      if (!global.AbortController) return;
      let signal;
      const task = new Base({
        name: 'foo',
        executable: (options) => (signal = options.signal),
        runTimeoutMillis: 0,
      });
      const promise = task._run().should.eventually.be.rejectedWith;
      clock.runAll();
      await promise;
      signal.should.be.instanceof(AbortSignal);
      signal.aborted.should.be.true;
    });
  });

  describe('_tick', () => {
    it('should increment the counts', async () => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
      });
      task._tick();
      task.ticks.should.eq(1);
      task.population.should.eq(1);
      return clock.runAllAsync();
    });

    it('should emit a tick event', (done) => {
      const task = new Base({ name: 'foo', executable: () => 5 });
      task.on('tick', (data) => {
        data.task.should.eq(task);
        data.tickAt.should.be.instanceof(Date);
        expect(data.tockAt).to.be.null;
        expect(data.result).to.be.null;
        expect(data.error).to.be.null;
        done();
      });
      task._tick();
      clock.runAll();
    });

    it('should call _run', async () => {
      const task = new Base({ name: 'foo', executable: () => 7 });
      task._run = spy(task, '_run');
      task._tick();
      task._run.calledOnce.should.be.true;
      return clock.runAllAsync();
    });

    it('should call _tock with results of execution', (done) => {
      const task = new Base({ name: 'foo', executable: () => 7 });
      task._tock = (data) => {
        data.task.should.eq(task);
        data.tickAt.should.be.instanceof(Date);
        data.tockAt.should.be.instanceof(Date);
        data.result.should.eq(7);
        expect(data.error).to.be.null;
        done();
      };
      task._tick();
    });

    it('should call _tock with errors of execution', (done) => {
      const error = new Error('something');
      const task = new Base({
        name: 'foo',
        executable: () => {
          throw error;
        },
      });
      task._tock = (data) => {
        data.task.should.eq(task);
        data.tickAt.should.be.instanceof(Date);
        data.tockAt.should.be.instanceof(Date);
        expect(data.result).to.be.null;
        data.error.should.eq(error);
        done();
      };
      task._tick();
    });

    it('should modify the _tick data with results of execution', (done) => {
      const task = new Base({ name: 'foo', executable: () => 5 });
      let data;
      task.on('tick', (d) => (data = d));
      task._tock = () => {
        data.task.should.eq(task);
        data.tickAt.should.be.instanceof(Date);
        data.tockAt.should.be.instanceof(Date);
        data.result.should.eq(5);
        expect(data.error).to.be.null;
        done();
      };
      task._tick();
    });
  });

  describe('_tock', () => {
    it('should alter the counters', () => {
      const task = new Base({ name: 'foo', executable: () => null });
      task._tocks = 5;
      task._population = 3;
      task._tock({});
      task.tocks.should.eq(6);
      task.population.should.eq(2);
    });

    it('should emit the tock event with data', (done) => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      let data = {};
      task.on('tock', (d) => {
        d.should.eq(data);
        done();
      });
      task._tock(data);
    });
  });

  describe('_spawn', () => {
    it('should emit a spawning event', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        generationLimit: 0,
      });
      task.on('spawning', () => {
        done();
      });
      task._spawn();
    });

    it('should emit a spawned event', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        generationLimit: 0,
      });
      task.on('spawned', () => {
        done();
      });
      task._spawn();
    });

    it('should emit error when generation limit is 0', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        generationLimit: 0,
      });
      task.on('spawned', (data) => {
        const { message } = data.error;
        message.should.eq('Spawning is inhibited by generation limit of 0');
        done();
      });
      task._spawn();
    });

    it('should initiate stopping when generation limit is 0', () => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        generationLimit: 0,
      });
      task._stopping = spy();
      task._tryStop = spy();
      task._spawn();
      task._stopping.calledOnce.should.be.true;
      task._tryStop.calledOnce.should.be.true;
    });

    it('should emit error when concurrency limit is 0', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        concurrencyLimit: 0,
      });
      task.on('spawned', (data) => {
        const { message } = data.error;
        message.should.eq('Spawning is inhibited by concurrency limit of 0');
        done();
      });
      task._spawn();
    });

    it('should initiate stopping when concurrency limit limit is 0', () => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        concurrencyLimit: 0,
      });
      task._stopping = spy();
      task._tryStop = spy();
      task._spawn();
      task._stopping.calledOnce.should.be.true;
      task._tryStop.calledOnce.should.be.true;
    });

    it('should emit error when liveness threshold is 0', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        livenessThreshold: 0,
      });
      task.on('spawned', (data) => {
        const { message } = data.error;
        message.should.eq('Spawning is inhibited by liveness threshold of 0');
        done();
      });
      task._spawn();
    });

    it('should initiate stopping when liveness threshold is 0', () => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        livenessThreshold: 0,
      });
      task._stopping = spy();
      task._tryStop = spy();
      task._spawn();
      task._stopping.calledOnce.should.be.true;
      task._tryStop.calledOnce.should.be.true;
    });

    it('should emit error when factory capacity is 0', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        factoryCapacity: 0,
      });
      task.on('spawned', (data) => {
        const { message } = data.error;
        message.should.eq('Spawning is inhibited by factory capacity of 0');
        done();
      });
      task._spawn();
    });

    it('should initiate stopping when factory capacity is 0', () => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        factoryCapacity: 0,
      });
      task._stopping = spy();
      task._tryStop = spy();
      task._spawn();
      task._stopping.calledOnce.should.be.true;
      task._tryStop.calledOnce.should.be.true;
    });

    it('should emit error when generation limit is reached', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        generationLimit: 5,
      });
      task._generations = 5;
      task.on('spawned', (data) => {
        const { message } = data.error;
        message.should.eq('Not spawning because generation limit is reached');
        done();
      });
      task._spawn();
    });

    it('should initiate stopping when generation limit is reached', () => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        generationLimit: 5,
      });
      task._generations = 5;
      task._stopping = spy();
      task._tryStop = spy();
      task._spawn();
      task._stopping.calledOnce.should.be.true;
      task._tryStop.calledOnce.should.be.true;
    });

    it('should emit error when concurrency limit is reached', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        concurrencyLimit: 2,
      });
      task._population = 3;
      task.on('spawned', (data) => {
        const { message } = data.error;
        message.should.eq('Not spawning because concurrency limit is reached');
        done();
      });
      task._spawn();
    });

    it('should emit error when liveness threshold is satisfied', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        livenessThreshold: 3,
      });
      task._population = 3;
      task.on('spawned', (data) => {
        const { message: m } = data.error;
        m.should.eq('Not spawning because liveness threshold is satisfied');
        done();
      });
      task._spawn();
    });

    it('should spawn up to concurrency limit', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        concurrencyLimit: 3,
      });
      task._population = 1;
      task._tick = () => {};
      task.on('spawned', (data) => {
        data.result.should.eq(2);
        done();
      });
      task._spawn();
    });

    it('should spawn up to factory capacity', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        factoryCapacity: 3,
      });
      task._population = 1;
      task._tick = () => {};
      task.on('spawned', (data) => {
        data.result.should.eq(3);
        done();
      });
      task._spawn();
    });

    it('should satisfy both limits', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        concurrencyLimit: 2,
        factoryCapacity: 3,
      });
      task._population = 1;
      task._tick = () => {};
      task.on('spawned', (data) => {
        data.result.should.eq(1);
        done();
      });
      task._spawn();
    });

    it('should spawn one when there are no limits', (done) => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._population = 1;
      task._tick = () => {};
      task.on('spawned', (data) => {
        data.result.should.eq(1);
        done();
      });
      task._spawn();
    });

    it('should increment the count of generations when spawning', (done) => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._population = 1;
      task._tick = () => {};
      task.on('spawned', () => {
        task.generations.should.eq(1);
        done();
      });
      task._spawn();
    });

    it('should not increment the count of generations when not spawning', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        factoryCapacity: 0,
      });
      task._population = 1;
      task._tick = () => {};
      task.on('spawned', () => {
        task.generations.should.eq(0);
        done();
      });
      task._spawn();
    });

    it('should call tick as many times as spawning', (done) => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        factoryCapacity: 5,
      });
      task._population = 1;
      task._tick = spy(() => {});
      task.on('spawned', () => {
        task._tick.callCount.should.eq(5);
        done();
      });
      task._spawn();
    });
  });

  describe('start', () => {
    it('should throw an error if task is starting', () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._isStarting = true;
      task.start.bind(task).should.throw('Task is already starting');
    });

    it('should throw an error if task is started', () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._isStarted = true;
      task.start.bind(task).should.throw('Task is already started');
    });

    it('should call the _starting method', () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._starting = spy();
      task.start();
      task._starting.calledOnce.should.be.true;
      clock.runAll();
    });

    it('should schedule the start of the task', () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task.start();
      task._timeout.should.not.be.null;
      clock.runAll();
    });

    it('should call the _started method', () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._started = spy();
      task.start();
      clock.runAll();
      task._started.calledOnce.should.be.true;
    });
  });

  describe('_tryStop', () => {
    it('should stop right away when population is zero', async () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      await task._tryStop();
      task.isStopped.should.be.true;
    });

    it('should stop right away when population is zero', async () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      await task._tryStop();
      task.isStopped.should.be.true;
    });

    it('should wait for entire population to tock', (done) => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      let calls = 0;
      task._population = 3;
      task.prependListener(kTock, () => calls++);
      task._tryStop().then(() => {
        calls.should.eq(3);
        task.listenerCount(kTock).should.eq(0);
        done();
      });
      while (task.population) {
        task._tock();
      }
    });

    it('should throw if graceful timeout is fired', async () => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        gracefulTimeoutMillis: 100,
      });
      task._population = 3;
      const message = 'Graceful timeout of 100 ms reached';
      const promise = task
        ._tryStop()
        .should.eventually.be.rejectedWith(message);
      await clock.runAllAsync();
      return promise;
    });

    it('should not prevent stopping if graceful timeout fires', async () => {
      const task = new Base({
        name: 'foo',
        executable: () => 0,
        gracefulTimeoutMillis: 100,
      });
      task._population = 3;
      let error = null;
      task._tryStop().catch((e) => (error = e));
      await clock.runAllAsync();
      while (task.population) {
        task._tock();
      }
      error.should.not.be.null;
      task.isStopped.should.be.true;
    });
  });

  describe('stop', () => {
    it('should throw if task is stopping', async () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._isStopping = true;
      const error = 'Task cannot be stopped again while it is stopping';
      await task.stop().should.eventually.be.rejectedWith(error);
    });

    it('should throw if task is stopped', async () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._isStopped = true;
      const error = 'Task is already stopped';
      await task.stop().should.eventually.be.rejectedWith(error);
    });

    it('should call the _stopping method', async () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._stopping = spy();
      task.stop();
      await clock.runAllAsync();
      task._stopping.calledOnce.should.be.true;
    });

    it('should schedule the stopping of the task', async () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._stop = async () => {};
      task.stop();
      task._timeout.should.not.be.null;
      await clock.runAllAsync();
    });

    it('should clear the timeout and set it to null when fires', async () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._stop = async () => {
        expect(task._timeout).to.be.null;
        await clock.runAllAsync();
      };
      task.stop();
    });

    it('should resolve when _stopped resolves', async () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      task._stopped = async () => {};
      const promise = task.stop().should.eventually.be.undefined;
      await clock.runAllAsync();
      return promise;
    });

    it('should reject when _stopped rejects', async () => {
      const task = new Base({ name: 'foo', executable: () => 0 });
      const message = 'something';
      task._stopped = async () => {
        throw new Error(message);
      };
      const promise = task.stop().should.eventually.be.rejectedWith(message);
      await clock.runAllAsync();
      return promise;
    });
  });
});
