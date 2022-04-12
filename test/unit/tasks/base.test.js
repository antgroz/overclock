'use strict';

var EventEmitter = require('events').EventEmitter;
var Base = require('../../../lib/tasks/base');
var sinon = require('sinon');
var Promise = require('bluebird');
var helpers = require('../../helpers/task');
var makeDefaults = helpers.makeDefaults;
var makeOptions = helpers.makeOptions;
var chai = require('chai');
var expect = chai.expect;
chai.should();

describe('base task', function () {
  describe('constructor', function () {
    var fn = function () {};

    it('should check that options is an object', function () {
      (function () {
        new Base();
      }.should.throw('Task options must be an object'));
    });

    it('should check that name is a string', function () {
      (function () {
        new Base({});
      }.should.throw('Task name must be a string'));
    });

    it('should check that executable is a function', function () {
      (function () {
        var options = makeOptions('task', null);
        new Base(options);
      }.should.throw('Task executable must be a function'));
    });

    it('should check that start timeout is a non-negative number', function () {
      (function () {
        var options = makeOptions('task', fn, -8);
        new Base(options);
      }.should.throw('Task start timeout must be a non-negative number'));
    });

    it('should check that run interval is a non-negative number', function () {
      (function () {
        var options = makeOptions('task', fn, 3, null);
        new Base(options);
      }.should.throw('Task run interval must be a non-negative number'));
    });

    it('should check that stop timeout is a non-negative number', function () {
      (function () {
        var options = makeOptions('task', fn, 3, 4, '');
        new Base(options);
      }.should.throw('Task stop timeout must be a non-negative number'));
    });

    it('should check that graceful timeout is a non-negative number', function () {
      (function () {
        var options = makeOptions('task', fn, 3, 4, 10, -9);
        new Base(options);
      }.should.throw('Task graceful timeout must be a non-negative number'));
    });

    it('should check that Promise is a function is a non-negative number', function () {
      (function () {
        var options = makeOptions('task', fn, 3, 4, 10, 9, 'foo');
        new Base(options);
      }.should.throw('Task Promise must be a constructor function'));
    });

    it('should use defaults when options are not set', function () {
      var options = makeOptions('task', fn);
      var defaults = makeDefaults(5000, 10000, 500, 0, fn, fn);
      var task = new Base(options, defaults);

      task.startTimeoutMillis.should.eq(5000);
      task.runIntervalMillis.should.eq(10000);
      task.stopTimeoutMillis.should.eq(500);
      task.gracefulTimeoutMillis.should.eq(0);
      task.Promise.should.eq(fn);
    });

    it('should not defaults when options are set', function () {
      var fn2 = function () {};
      var options = makeOptions('task', fn, 300, 200, 150, 2, fn);
      var defaults = makeDefaults(5000, 10000, 500, 0, fn2);
      var task = new Base(options, defaults);

      task.startTimeoutMillis.should.eq(300);
      task.runIntervalMillis.should.eq(200);
      task.stopTimeoutMillis.should.eq(150);
      task.gracefulTimeoutMillis.should.eq(2);
      task.Promise.should.eq(fn);
    });
  });

  describe('super', function () {
    it('should be EventEmitter', function () {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      task.should.be.instanceof(EventEmitter);
    });
  });

  describe('_init', function () {
    it('should throw if not implemented', function () {
      Base.prototype._init.should.throw('Method not implemented');
    });
  });

  describe('_tick', function () {
    it('should call pre-tick hook if provided', function () {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      var spy = sinon.spy();
      task._preTick = spy;
      task._tick();
      spy.calledOnce.should.be.true;
    });

    it('should call post-tick hook if provided', function () {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      var spy = sinon.spy();
      task._postTick = spy;
      task._tick();
      spy.calledOnce.should.be.true;
    });

    it('should emit a tick emit with execution data', function (done) {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      task.on('tick', function (data) {
        data.task.should.eq(task);
        done();
      });
      task._tick();
    });

    it('should increment the running count', function (done) {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      task.runningCount.should.eq(0);
      task.on('tick', function () {
        task.runningCount.should.eq(1);
        done();
      });
      task._tick();
    });

    it('should call the run wrapper with a callback', function () {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      var spy = sinon.spy();
      task._run = spy;
      task._tick();
      spy.calledOnce.should.be.true;
    });
  });

  describe('_run', function () {
    describe('sync function', function () {
      it('should pass result to the callback', function () {
        var spy = sinon.spy();
        var options = makeOptions('task', function () {
          return '5';
        });
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);
        task._run(spy);
        spy.calledOnce;
        spy.withArgs(null, '5').calledOnce;
      });

      it('should pass error to the callback', function () {
        var spy = sinon.spy();
        var error = new Error('something bad');
        var options = makeOptions('task', function () {
          throw error;
        });
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);
        task._run(spy);
        spy.calledOnce;
        spy.withArgs(error, null).calledOnce;
      });
    });

    describe('async callback function', function () {
      it('should pass result to the callback', function () {
        var spy = sinon.spy();
        var options = makeOptions('task', function (callback) {
          callback(null, 500);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);
        task._run(spy);
        spy.calledOnce;
        spy.withArgs(null, 500).calledOnce;
      });

      it('should pass error to the callback', function () {
        var spy = sinon.spy();
        var error = new Error('something bad');
        var options = makeOptions('task', function (callback) {
          callback(error, null);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);
        task._run(spy);
        spy.calledOnce;
        spy.withArgs(error, null).calledOnce;
      });
    });

    describe('async promise native function', function () {
      it('should pass result to the callback', function () {
        var spy = sinon.spy();
        var options = makeOptions('task', function () {
          return global.Promise.resolve(true);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0, global.Promise);
        var task = new Base(options, defaults);
        task._run(spy);
        spy.calledOnce;
        spy.withArgs(null, true).calledOnce;
      });

      it('should pass error to the callback', function () {
        var spy = sinon.spy();
        var error = new Error('something bad');
        var options = makeOptions('task', function () {
          return global.Promise.reject(error);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0, global.Promise);
        var task = new Base(options, defaults);
        task._run(spy);
        spy.calledOnce;
        spy.withArgs(error, null).calledOnce;
      });

      it('should pass undefined result when misconfigured and resolves', function () {
        var spy = sinon.spy();
        var options = makeOptions('task', function () {
          return global.Promise.resolve(5);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);
        task._run(spy);
        spy.calledOnce;
        spy.withArgs(null, undefined).calledOnce;
      });

      it('should pass undefined result when misconfigured and rejects', function () {
        var spy = sinon.spy();
        var error = new Error('something bad');
        var options = makeOptions('task', function () {
          return global.Promise.reject(error);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);
        task._run(spy);
        spy.calledOnce;
        spy.withArgs(null, undefined).calledOnce;
      });
    });

    describe('async promise library function', function () {
      it('should pass result to the callback', function () {
        var spy = sinon.spy();
        var options = makeOptions('task', function () {
          return Promise.resolve(true);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0, Promise);
        var task = new Base(options, defaults);
        task._run(spy);
        spy.calledOnce;
        spy.withArgs(null, true).calledOnce;
      });

      it('should pass error to the callback', function () {
        var spy = sinon.spy();
        var error = new Error('something bad');
        var options = makeOptions('task', function () {
          return Promise.reject(error);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0, Promise);
        var task = new Base(options, defaults);
        task._run(spy);
        spy.calledOnce;
        spy.withArgs(error, null).calledOnce;
      });

      it('should pass undefined result when misconfigured and resolves', function () {
        var spy = sinon.spy();
        var options = makeOptions('task', function () {
          return Promise.resolve(5);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);
        task._run(spy);
        spy.calledOnce;
        spy.withArgs(null, undefined).calledOnce;
      });

      it('should pass undefined result when misconfigured and rejects', function () {
        var spy = sinon.spy();
        var error = new Error('something bad');
        var options = makeOptions('task', function () {
          return Promise.reject(error);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);
        task._run(spy);
        spy.calledOnce;
        spy.withArgs(null, undefined).calledOnce;
      });
    });
  });

  describe('_tock', function () {
    it('should call pre-tock hook if provided', function () {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      var spy = sinon.spy();
      task._preTock = spy;
      task._tock({});
      spy.calledOnce.should.be.true;
    });

    it('should call post-tock hook if provided', function () {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      var spy = sinon.spy();
      task._postTock = spy;
      task._tock({});
      spy.calledOnce.should.be.true;
    });

    it('should emit a tock emit with execution data', function (done) {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      var executionData = {};
      task.on('tock', function (data) {
        data.should.eq(executionData);
        done();
      });
      task._tock(executionData);
    });

    it('should decrement the running count', function (done) {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      task.runningCount = 1;
      task.on('tock', function () {
        task.runningCount.should.eq(0);
        done();
      });
      task._tock({});
    });
  });

  describe('_destroy', function () {
    it('should throw if not implemented', function () {
      Base.prototype._destroy.should.throw('Method not implemented');
    });
  });

  describe('start', function () {
    it('should call _init', function () {
      var spy = sinon.spy();
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      task._init = spy;
      task.start();
      spy.calledOnce;
    });

    it('should return this', function () {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      task._init = function () {};
      task.start().should.eq(task);
    });
  });

  describe('stop', function () {
    describe('when no callback is passed', function () {
      describe('when no promise is provided', function () {
        var options = makeOptions('task', function () {});
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);

        it('should throw an error', function () {
          (function () {
            task.stop();
          }.should.throw('Done callback must be provided'));
        });
      });

      describe('when promise native is provided', function () {
        var options = makeOptions('task', function () {});
        var defaults = makeDefaults(5000, 10000, 500, 0, global.Promise);
        var task = new Base(options, defaults);

        it('should return a promise native', function () {
          task._destroy = function (done) {
            done(null);
          };
          task.stop().should.be.instanceof(global.Promise);
        });

        it('should resolve to nothing upon success', function (done) {
          task._destroy = function (callback) {
            callback(null);
          };
          task.stop().then(function (result) {
            expect(result).to.be.undefined;
            done();
          });
        });

        it('should reject with error upon failure', function (done) {
          var error = new Error('something bad');
          task._destroy = function (callback) {
            callback(error);
          };
          task.stop().then(null, function (e) {
            e.should.be.eq(error);
            done();
          });
        });
      });

      describe('when promise library is provided', function () {
        var options = makeOptions('task', function () {});
        var defaults = makeDefaults(5000, 10000, 500, 0, Promise);
        var task = new Base(options, defaults);

        it('should return a promise native', function () {
          task._destroy = function (done) {
            done(null);
          };
          task.stop().should.be.instanceof(Promise);
        });

        it('should resolve to nothing upon success', function (done) {
          task._destroy = function (callback) {
            callback(null);
          };
          task.stop().then(function (result) {
            expect(result).to.be.undefined;
            done();
          });
        });

        it('should reject with error upon failure', function (done) {
          var error = new Error('something bad');
          task._destroy = function (callback) {
            callback(error);
          };
          task.stop().then(null, function (e) {
            e.should.be.eq(error);
            done();
          });
        });
      });
    });

    describe('when callback is passed', function () {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);

      it('should pass the callback to _destroy', function (done) {
        task._destroy = function (done) {
          done();
        };
        task.stop(done);
      });

      it('should return nothing', function (done) {
        task._destroy = function (done) {
          expect(result).to.be.undefined;
          done();
        };
        var result = task.stop(done);
      });
    });
  });

  describe('lifecycle', function () {
    it('should complete with a sync function', function (done) {
      var options = makeOptions('task', function () {
        return '5';
      });
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      task.on('tock', function () {
        done();
      });
      task._tick();
    });

    it('should complete with async callback function', function (done) {
      var options = makeOptions('task', function (callback) {
        callback(null, new Error('foo'));
      });
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      task.on('tock', function () {
        done();
      });
      task._tick();
    });

    it('should complete with async promise native function', function (done) {
      var options = makeOptions('task', function () {
        return global.Promise.resolve(5);
      });
      var defaults = makeDefaults(5000, 10000, 500, 0, global.Promise);
      var task = new Base(options, defaults);
      task.on('tock', function () {
        done();
      });
      task._tick();
    });

    it('should complete with async promise library function', function (done) {
      var options = makeOptions('task', function () {
        return Promise.resolve(5);
      });
      var defaults = makeDefaults(5000, 10000, 500, 0, Promise);
      var task = new Base(options, defaults);
      task.on('tock', function () {
        done();
      });
      task._tick();
    });

    it('should emit data on execution', function (done) {
      var options = makeOptions('task', function () {
        return '5';
      });
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      task.on('tock', function (data) {
        data.task.should.eq(task);
        data.tickAt.should.be.instanceof(Date);
        data.tockAt.should.be.instanceof(Date);
        expect(data.error).to.be.null;
        data.result.should.eq('5');
        done();
      });
      task._tick();
    });

    it('should manage running count correctly', function (done) {
      var options = makeOptions('task', function () {
        return '5';
      });
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      task.on('tick', function () {
        task.runningCount.should.eq(1);
      });
      task.on('tock', function () {
        task.runningCount.should.eq(0);
        done();
      });
      task._tick();
    });
  });
});
