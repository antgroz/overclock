'use strict';

const { describe, it } = require('mocha');
const { expect, should, use } = require('chai');
const { EVENT_NAMES } = require('../lib/constants');
const Manager = require('../lib/manager');
const { spy } = require('sinon');
const Heartbeat = require('../lib/heartbeat');
const Base = require('../lib/base');
const chaiAsPromised = require('chai-as-promised');

use(chaiAsPromised);
should();

describe('manager', () => {
  describe('constructor', () => {
    it('should check that tasks is an array', () => {
      const ctor = () => new Manager({ tasks: 'abcd' });
      ctor.should.throw();
    });

    it('should initialize task listeners', () => {
      const manager = new Manager();
      for (const event of EVENT_NAMES.keys()) {
        manager._listeners.has(event).should.be.true;
      }
    });

    it('should call add method for each task options object', () => {
      const options = { name: 'foo', executable: () => 5 };
      const addSpy = spy(Manager.prototype, 'add');
      new Manager({ tasks: [options] });
      addSpy.calledOnceWith(options).should.be.true;
    });
  });

  describe('add', () => {
    it('should throw if no options provided', () => {
      const man = new Manager();
      man.add.bind(man).should.throw();
    });

    it('should throw if options is not an object', () => {
      const man = new Manager();
      man.add.bind(man, 'ab').should.throw();
    });

    it('should throw if task type is unknown', () => {
      const man = new Manager();
      man.add.bind(man, { type: 'foo' }).should.throw();
    });

    it('should create a heartbeat task by default', () => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      man._tasks.get('foo').should.be.instanceof(Heartbeat);
    });

    it('should throw if task is added already', () => {
      const man = new Manager();
      const options = { name: 'foo', executable: () => 5 };
      man.add(options);
      man.add.bind(man, options).should.throw();
    });

    it('should save the created task to a map', () => {
      const man = new Manager();
      const options = { type: 'reactor', name: 'foo', executable: () => 5 };
      man.add(options);
      man._tasks.has('foo').should.be.true;
    });

    it('should subscribe to task events', (done) => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      man.on('starting', () => {
        done();
      });
      man._tasks.get('foo').emit('starting');
    });
  });

  describe('get', () => {
    it('should throw if task name is not provided', () => {
      const man = new Manager();
      man.get.bind(man).should.throw();
    });

    it('should throw if task name is invalid', () => {
      const man = new Manager();
      man.get.bind(man, 5).should.throw();
    });

    it('should return the task if is added', () => {
      const man = new Manager();
      man.subscribe = () => {};
      const options = { name: 'foo', executable: () => 5 };
      man.add(options);
      man.get('foo').should.be.instanceof(Base);
    });

    it('should return nothing if the task is not added', () => {
      const man = new Manager();
      expect(man.get('foo')).to.be.undefined;
    });
  });

  describe('has', () => {
    it('should throw if task name is not provided', () => {
      const man = new Manager();
      man.has.bind(man).should.throw();
    });

    it('should throw if task name is invalid', () => {
      const man = new Manager();
      man.has.bind(man, 5).should.throw();
    });

    it('should return true if is added', () => {
      const man = new Manager();
      man.subscribe = () => {};
      const options = { name: 'foo', executable: () => 5 };
      man.add(options);
      man.has('foo').should.be.true;
    });

    it('should return false if is not added', () => {
      const man = new Manager();
      man.has('foo').should.be.false;
    });
  });

  describe('delete', () => {
    it('should throw if task name is not provided', () => {
      const man = new Manager();
      man.delete.bind(man).should.throw();
    });

    it('should throw if task name is invalid', () => {
      const man = new Manager();
      man.delete.bind(man, 5).should.throw();
    });

    it('should return false if task is not added', () => {
      const man = new Manager();
      man.delete('foo').should.be.false;
    });

    it('should unsubscribe from task', () => {
      const man = new Manager();
      man.subscribe = () => {};
      man.unsubscribe = spy();
      man.add({ name: 'foo', executable: () => 5 });
      man.delete('foo').should.be.true;
      man.unsubscribe.calledOnceWith('foo').should.be.true;
    });

    it('should delete task map entry', () => {
      const man = new Manager();
      man.subscribe = () => {};
      man.unsubscribe = () => {};
      man.add({ name: 'foo', executable: () => 5 });
      man.delete('foo').should.be.true;
      man._tasks.has('foo').should.be.false;
    });
  });

  describe('subscribe', () => {
    it('should throw if task name is not provided', () => {
      const man = new Manager();
      man.subscribe.bind(man).should.throw();
    });

    it('should throw if task name is invalid', () => {
      const man = new Manager();
      man.subscribe.bind(man, 5).should.throw();
    });

    it('should throw if task is not added', () => {
      const man = new Manager();
      man.subscribe.bind(man, 'foo').should.throw();
    });

    it('should throw if event is invalid', () => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      man.subscribe.bind(man, 'foo', 'foo').should.throw();
    });

    it('should attach a listener to a task event', () => {
      const man = new Manager();
      man.subscribe = () => {};
      man.add({ name: 'foo', executable: () => 5 });
      delete man.subscribe;
      man.subscribe('foo', 'stopping');
      const listeners = man._tasks.get('foo').listeners('stopping');
      listeners.length.should.eq(1);
    });

    it('should attach a listener to all task events', () => {
      const man = new Manager();
      man.subscribe = () => {};
      man.add({ name: 'foo', executable: () => 5 });
      delete man.subscribe;
      man.subscribe('foo');
      for (const event of EVENT_NAMES) {
        const listeners = man._tasks.get('foo').listeners(event);
        listeners.length.should.eq(1);
      }
    });

    it('should leave only one listener', () => {
      const man = new Manager();
      man.subscribe = () => {};
      man.add({ name: 'foo', executable: () => 5 });
      delete man.subscribe;
      man.subscribe('foo');
      man.subscribe('foo');
      for (const event of EVENT_NAMES) {
        const listeners = man._tasks.get('foo').listeners(event);
        listeners.length.should.eq(1);
      }
    });
  });

  describe('unsubscribe', () => {
    it('should throw if task name is not provided', () => {
      const man = new Manager();
      man.unsubscribe.bind(man).should.throw();
    });

    it('should throw if task name is invalid', () => {
      const man = new Manager();
      man.unsubscribe.bind(man, 5).should.throw();
    });

    it('should throw if task is not added', () => {
      const man = new Manager();
      man.unsubscribe.bind(man, 'foo').should.throw();
    });

    it('should throw if event is invalid', () => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      man.unsubscribe.bind(man, 'foo', 'foo').should.throw();
    });

    it('should detach a listener from a task event', () => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      man.unsubscribe('foo', 'stopping');
      const listeners = man._tasks.get('foo').listeners('stopping');
      listeners.length.should.eq(0);
    });

    it('should detach a listener from all task events', () => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      man.unsubscribe('foo');
      for (const event of EVENT_NAMES) {
        const listeners = man._tasks.get('foo').listeners(event);
        listeners.length.should.eq(0);
      }
    });

    it('should detach all listeners', () => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      const listener = man._listeners.get('starting');
      man._tasks.get('foo').on('starting', listener);
      man._tasks.get('foo').listeners('starting').length.should.eq(2);
      man.unsubscribe('foo', 'starting');
      man._tasks.get('foo').listeners('starting').length.should.eq(0);
    });

    it('should ignore custom listeners', () => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      const task = man._tasks.get('foo');
      task.on('starting', () => null);
      man.unsubscribe('foo', 'starting');
      task.listeners('starting').length.should.eq(1);
    });
  });

  describe('start', () => {
    it('should throw if task name is invalid', () => {
      const man = new Manager();
      man.start.bind(man, 5).should.throw();
    });

    it('should throw if task is not added', () => {
      const man = new Manager();
      man.start.bind(man, 'foo').should.throw();
    });

    it('should start the task if added', () => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      const task = man._tasks.get('foo');
      task.start = spy();
      man.start('foo');
      task.start.calledOnce.should.be.true;
    });

    it('should start all tasks', () => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      man.add({ name: 'bar', executable: () => 7 });
      const tasks = man._tasks;
      for (const task of tasks.values()) {
        task.start = spy();
      }
      man.start();
      for (const task of tasks.values()) {
        task.start.calledOnce.should.be.true;
      }
    });
  });

  describe('stop', () => {
    it('should throw if task name is invalid', async () => {
      const man = new Manager();
      await man.stop(5).should.eventually.be.rejectedWith;
    });

    it('should throw if task is not added', async () => {
      const man = new Manager();
      await man.stop('foo').should.eventually.be.rejectedWith;
    });

    it('should stop the task if added', async () => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      const task = man._tasks.get('foo');
      task.stop = spy(() => 8);
      await man.stop('foo').should.eventually.eq(8);
      task.stop.calledOnce.should.be.true;
    });

    it('should stop all tasks', async () => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      man.add({ name: 'bar', executable: () => 7 });
      const tasks = man._tasks;
      for (const task of tasks.values()) {
        task.stop = spy();
      }
      await man.stop();
      for (const task of tasks.values()) {
        task.stop.calledOnce.should.be.true;
      }
    });
  });
});
