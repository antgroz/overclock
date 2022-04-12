var EventEmitter = require('events');
var Racer = require('../../lib/racer');
require('chai').should();

describe('Racer', function () {
  describe('constructor', function () {
    it('should work without parameters', function () {
      new Racer();
    });

    it('should be an instance of EventEmitter', function () {
      var racer = new Racer();
      racer.should.be.instanceof(EventEmitter);
    });

    it('should check that passed parameters are an object', function () {
      var error;
      try {
        new Racer(null);
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Racer params must be an object');
      new Racer({});
    });

    // TODO: fix this test after the logger check is fixed
    it('should check that logger is a function', function () {
      var error;
      try {
        new Racer({ logger: 'foo' });
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Racer logger must be a function');
    });

    it('should check that start timeout is a valid duration', function () {
      var error;
      try {
        new Racer({ startTimeoutMillis: -3 });
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Racer start timeout must be a valid duration');
      new Racer({ startTimeoutMillis: 30 });
    });

    it('should check that run interval is a valid duration', function () {
      var error;
      try {
        new Racer({ runIntervalMillis: {} });
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Racer run interval must be a valid duration');
      new Racer({ runIntervalMillis: 0 });
    });

    it('should check that stop timeout is a valid duration', function () {
      var error;
      try {
        new Racer({ stopTimeoutMillis: true });
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Racer stop timeout must be a valid duration');
      new Racer({ stopTimeoutMillis: 200 });
    });

    it('should check that awaited is a boolean', function () {
      var error;
      try {
        new Racer({ awaited: 'foo' });
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Racer awaited must be a boolean');
      new Racer({ awaited: false });
    });

    it('should check that callback is a function', function () {
      var error;
      try {
        new Racer({ callback: null });
      } catch (e) {
        error = e;
      }
      error.message.should.eq('Racer callback must be a function');
      new Racer({ callback: function () {} });
    });

    it('should freeze the defaults', function () {
      new Racer()._defaults.should.be.frozen;
    });
  });
});
