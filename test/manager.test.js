import { describe, it } from 'mocha';
import { expect, should } from 'chai';
import { EVENTS } from '../lib/constants.js';
import { Manager } from '../lib/manager.js';
import { spy } from 'sinon';
import { Heartbeat } from '../lib/heartbeat.js';
import { Base } from '../lib/base.js';

should();

describe('manager', () => {
  describe('constructor', () => {
    it('should check that tasks is an array', () => {
      const ctor = () => new Manager({ tasks: 'abcd' });
      ctor.should.throw('Tasks must be an array of option objects');
    });

    it('should initialize task listeners', () => {
      const manager = new Manager();
      for (const event of EVENTS.keys()) {
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
      man.add.bind(man).should.throw('Task options must be an object');
    });

    it('should throw if options is not an object', () => {
      const man = new Manager();
      man.add.bind(man, 'ab').should.throw('Task options must be an object');
    });

    it('should throw if task type is unknown', () => {
      const man = new Manager();
      const error = `Task type 'foo' is invalid`;
      man.add.bind(man, { type: 'foo' }).should.throw(error);
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
      const message = `Task 'foo' is added already`;
      man.add.bind(man, options).should.throw(message);
    });

    it('should save the created task to a map', () => {
      const man = new Manager();
      const options = { name: 'foo', executable: () => 5 };
      man.add(options);
      man._tasks.has('foo').should.be.true;
    });

    it('should subscribe to task events', () => {
      const man = new Manager();
      man.subscribe = spy();
      const options = { name: 'foo', executable: () => 5 };
      man.add(options);
      man.subscribe.calledOnceWith('foo').should.be.true;
    });
  });

  describe('get', () => {
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
    it('should throw if task is not added', () => {
      const man = new Manager();
      const message = `Task 'foo' has not been added yet`;
      man.subscribe.bind(man, 'foo').should.throw(message);
    });

    it('should throw if event is invalid', () => {
      const man = new Manager();
      man.add({ name: 'foo', executable: () => 5 });
      const message = `Event 'foo' is invalid`;
      man.subscribe.bind(man, 'foo', 'foo').should.throw(message);
    });
  });
});
