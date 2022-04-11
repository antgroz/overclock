var EventEmitter = require('events');
var Meister = require('../lib/meister');
require('chai').should();

describe('Meister', function () {
  describe('constructor', function () {
    it('should work without parameters', function () {
      new Meister();
    });

    it('should be an instance of EventEmitter', function () {
      var meister = new Meister();
      meister.should.be.instanceof(EventEmitter);
    });

    it('should check that passed parameters are an object', function () {
      var error;
      try {
        new Meister(null);
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Meister params must be an object');
      new Meister({});
    });

    // TODO: fix this test after the logger check is fixed
    it('should check that logger is a function', function () {
      var error;
      try {
        new Meister({ logger: 'foo' });
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Meister logger must be a function');
    });

    it('should check that start timeout is a valid duration', function () {
      var error;
      try {
        new Meister({ startTimeoutMillis: -3 });
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Meister start timeout must be a valid duration');
      new Meister({ startTimeoutMillis: 30 });
    });

    it('should check that run interval is a valid duration', function () {
      var error;
      try {
        new Meister({ runIntervalMillis: {} });
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Meister run interval must be a valid duration');
      new Meister({ runIntervalMillis: 0 });
    });

    it('should check that stop timeout is a valid duration', function () {
      var error;
      try {
        new Meister({ stopTimeoutMillis: true });
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Meister stop timeout must be a valid duration');
      new Meister({ stopTimeoutMillis: 200 });
    });

    it('should check that awaited is a boolean', function () {
      var error;
      try {
        new Meister({ awaited: 'foo' });
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Meister awaited must be a boolean');
      new Meister({ awaited: false });
    });

    it('should check that callback is a function', function () {
      var error;
      try {
        new Meister({ callback: null });
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Meister callback must be a function');
      new Meister({ callback: function () {} });
    });

    it('should freeze the defaults', function () {
      new Meister()._defaults.should.be.frozen;
    });
  });
});
