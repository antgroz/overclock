import { describe, it } from 'mocha';
import { Emitter } from '../../../lib/util/emitter.js';
import * as chai from 'chai';

chai.should();

describe('emitter', () => {
  describe('on', () => {
    it('should attach a handler to an event', () => {
      const emitter = new Emitter();
      const handler = () => 5;
      emitter.on('foo', handler);
      emitter._events.get('foo').get(handler).should.eq(1);
    });

    it('should attach a handler multiple times', () => {
      const emitter = new Emitter();
      const handler = () => 5;
      emitter.on('foo', handler);
      emitter.on('foo', handler);
      emitter._events.get('foo').get(handler).should.eq(2);
    });
  });

  describe('off', () => {
    it('should not trow if no handlers are attached', () => {
      const emitter = new Emitter();
      emitter.off('foo', () => 7);
    });

    it('should detach all handlers if one is not provided', () => {
      const emitter = new Emitter();
      emitter.on('foo', () => 5);
      emitter.on('foo', () => 6);
      emitter.off('foo');
      emitter._events.has('foo').should.be.false;
    });

    it('should detach one instance of handler', () => {
      const emitter = new Emitter();
      const handler = () => 5;
      emitter.on('foo', handler);
      emitter.on('foo', handler);
      emitter.off('foo', handler);
      emitter._events.get('foo').get(handler).should.eq(1);
    });

    it('should detach one instance of handler', () => {
      const emitter = new Emitter();
      const handler = () => 5;
      emitter.on('foo', handler);
      emitter.on('foo', handler);
      emitter.off('foo', handler);
      emitter._events.get('foo').get(handler).should.eq(1);
    });

    it('should remove the handler map if there are none', () => {
      const emitter = new Emitter();
      const handler = () => 5;
      emitter.on('foo', handler);
      emitter.off('foo', handler);
      emitter._events.has('foo').should.be.false;
    });
  });

  describe('emit', () => {
    it('should execute the attached handler', () => {
      let count = 0;
      const emitter = new Emitter();
      emitter.on('foo', () => (count += 5));
      emitter.on('foo', () => (count += 7));
      emitter.emit('foo');
      count.should.eq(12);
    });

    it('should execute multiple handlers', () => {
      let count = 0;
      const emitter = new Emitter();
      const handler = () => (count += 5);
      emitter.on('foo', handler);
      emitter.on('foo', handler);
      emitter.on('foo', () => (count += 7));
      emitter.emit('foo');
      count.should.eq(17);
    });

    it('should execute wildcard handlers', () => {
      let count = 0;
      const emitter = new Emitter();
      const handler = () => (count += 5);
      emitter.on('*', handler);
      emitter.on('foo', handler);
      emitter.on('foo', () => (count += 7));
      emitter.emit('foo');
      count.should.eq(17);
    });

    it('should pass the arguments to the handler', () => {
      let count = 0;
      const emitter = new Emitter();
      emitter.on('foo', (n) => (count += n));
      emitter.emit('foo', 5);
      emitter.emit('foo', 3);
      count.should.eq(8);
    });

    it('should add event to wildcard handler arguments', () => {
      let event;
      const emitter = new Emitter();
      emitter.on('*', (s) => (event = s));
      emitter.emit('foo');
      event.should.eq('foo');
    });
  });
});
