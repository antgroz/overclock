'use strict';

var EventEmitter = require('events').EventEmitter;
var Base = require('../../../lib/tasks/base-task');
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
    var fn = function () {
      return true;
    };

    it('should check that options is an object', function () {
      Base.should.throw('Options must be an object');
    });

    it('should check that name is a string', function () {
      Base.bind(null, {}).should.throw('Name must be a string');
    });

    it('should check that executable is a function', function () {
      var options = makeOptions('task', null);
      var ctor = Base.bind(null, options);
      ctor.should.throw('Executable must be a function');
    });

    it('should check that start timeout is a non-negative number', function () {
      var options = makeOptions('task', fn, -8);
      var ctor = Base.bind(null, options);
      ctor.should.throw('Start timeout must be a non-negative number');
    });

    it('should check that run interval is a non-negative number', function () {
      var options = makeOptions('task', fn, 3, 'foo');
      var ctor = Base.bind(null, options);
      ctor.should.throw('Run interval must be a non-negative number');
    });

    it('should check that stop timeout is a non-negative number', function () {
      var options = makeOptions('task', fn, 3, 4, '');
      var ctor = Base.bind(null, options);
      ctor.should.throw('Stop timeout must be a non-negative number');
    });

    it('should check that graceful timeout is a non-negative number', function () {
      var options = makeOptions('task', fn, 3, 4, 10, -9);
      var ctor = Base.bind(null, options);
      ctor.should.throw('Graceful timeout must be a non-negative number');
    });

    it('should check that Promise is a function is a non-negative number', function () {
      var options = makeOptions('task', fn, 3, 4, 10, 9, 'foo');
      var ctor = Base.bind(null, options);
      ctor.should.throw('Promise must be a constructor function');
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

    it('should not use defaults when options are set', function () {
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

    it('should set up the lifecycle state correctly', function () {
      var options = makeOptions('task', fn, 0, 0, 0);
      var task = new Base(options, {});
      task.isStarting.should.be.false;
      task.isStarted.should.be.false;
      task.runningCount.should.eq(0);
      task.isStopping.should.be.false;
      task.isStopped.should.be.true;
    });

    it('set up the EventEmitter super class', function () {
      var options = makeOptions('task', function () {});
      var defaults = makeDefaults(5000, 10000, 500, 0);
      var task = new Base(options, defaults);
      task.should.be.instanceof(EventEmitter);
    });
  });

  describe('start', function () {
    var options = makeOptions('task', function () {});
    var defaults = makeDefaults(5000, 10000, 500, 0);
    var task = new Base(options, defaults);

    afterEach(function () {
      delete task._init;
    });

    it('should call _init', function () {
      var spy = sinon.spy();
      task._init = spy;
      task.start();
      spy.calledOnce.should.be.true;
    });

    it('should return this', function () {
      task._init = function () {};
      task.start().should.eq(task);
    });
  });

  describe('_init', function () {
    it('should throw if not implemented', function () {
      Base.prototype._init.should.throw('Method not implemented');
    });
  });

  describe('_tick', function () {
    var options = makeOptions('task', function () {});
    var defaults = makeDefaults(5000, 10000, 500, 0);
    var task = new Base(options, defaults);

    afterEach(function () {
      delete task._preTick;
      delete task._postTick;
      delete task._run;
      task.runningCount = 0;
    });

    it('should call pre-tick hook if provided', function () {
      var spy = sinon.spy();
      task._preTick = spy;
      task._tick();
      spy.calledOnce.should.be.true;
    });

    it('should call post-tick hook if provided', function () {
      var spy = sinon.spy();
      task._postTick = spy;
      task._tick();
      spy.calledOnce.should.be.true;
    });

    it('should emit a tick emit with execution data', function (done) {
      task.once('tick', function (data) {
        data.task.should.eq(task);
        done();
      });
      task._tick();
    });

    it('should increment the running count', function (done) {
      task.once('tick', function () {
        task.runningCount.should.eq(1);
        done();
      });
      task._tick();
    });

    it('should call the run wrapper with a callback', function () {
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
        spy.calledOnce.should.be.true;
        spy.withArgs(null, '5').calledOnce.should.be.true;
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
        spy.calledOnce.should.be.true;
        spy.withArgs(error, null).calledOnce.should.be.true;
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
        spy.calledOnce.should.be.true;
        spy.withArgs(null, 500).calledOnce.should.be.true;
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
        spy.calledOnce.should.be.true;
        spy.withArgs(error, null).calledOnce.should.be.true;
      });
    });

    describe('async promise native function', function () {
      it('should pass result to the callback', function (done) {
        var spy = sinon.spy(function (error, result) {
          expect(error).to.be.null;
          result.should.be.true;
          spy.calledOnce.should.be.true;
          done();
        });
        var options = makeOptions('task', function () {
          return global.Promise.resolve(true);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0, global.Promise);
        var task = new Base(options, defaults);
        task._run(spy);
      });

      it('should pass error to the callback', function (done) {
        var error = new Error('something bad');
        var spy = sinon.spy(function (e, result) {
          e.should.be.eq(error);
          expect(result).to.be.null;
          spy.calledOnce.should.be.true;
          done();
        });
        var options = makeOptions('task', function () {
          return global.Promise.reject(error);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0, global.Promise);
        var task = new Base(options, defaults);
        task._run(spy);
      });

      it('should pass promise result when misconfigured and resolves', function (done) {
        var spy = sinon.spy(function (error, result) {
          expect(error).to.be.null;
          result.should.be.instanceof(global.Promise);
          spy.calledOnce.should.be.true;
          done();
        });
        var options = makeOptions('task', function () {
          return global.Promise.resolve(5);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);
        task._run(spy);
      });

      it('should pass promise result when misconfigured and rejects', function (done) {
        var spy = sinon.spy(function (error, result) {
          expect(error).to.be.null;
          result.should.be.instanceof(global.Promise);
          spy.calledOnce.should.be.true;
          done();
        });
        var error = new Error('something bad');
        var options = makeOptions('task', function () {
          return global.Promise.reject(error);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);
        task._run(spy);
      });
    });

    describe('async promise library function', function () {
      it('should pass result to the callback', function (done) {
        var spy = sinon.spy(function (error, result) {
          expect(error).to.be.null;
          result.should.be.true;
          spy.calledOnce.should.be.true;
          done();
        });
        var options = makeOptions('task', function () {
          return Promise.resolve(true);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0, Promise);
        var task = new Base(options, defaults);
        task._run(spy);
      });

      it('should pass error to the callback', function (done) {
        var error = new Error('something bad');
        var spy = sinon.spy(function (e, result) {
          e.should.eq(error);
          expect(result).to.be.null;
          spy.calledOnce.should.be.true;
          done();
        });
        var options = makeOptions('task', function () {
          return Promise.reject(error);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0, Promise);
        var task = new Base(options, defaults);
        task._run(spy);
      });

      it('should pass promise result when misconfigured and resolves', function (done) {
        var spy = sinon.spy(function (error, result) {
          expect(error).to.be.null;
          result.should.be.instanceof(Promise);
          spy.calledOnce.should.be.true;
          done();
        });
        var options = makeOptions('task', function () {
          return Promise.resolve(5);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);
        task._run(spy);
      });

      it('should pass undefined result when misconfigured and rejects', function (done) {
        var spy = sinon.spy(function (error, result) {
          expect(error).to.be.null;
          result.should.be.instanceof(Promise);
          spy.calledOnce.should.be.true;
          done();
        });
        var error = new Error('something bad');
        var options = makeOptions('task', function () {
          return Promise.reject(error);
        });
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);
        task._run(spy);
      });
    });
  });

  describe('_tock', function () {
    var options = makeOptions('task', function () {});
    var defaults = makeDefaults(5000, 10000, 500, 0);
    var task = new Base(options, defaults);

    afterEach(function () {
      delete task._preTock;
      delete task._postTock;
      task.runningCount = 0;
    });

    it('should call pre-tock hook if provided', function () {
      var spy = sinon.spy();
      task._preTock = spy;
      task._tock({});
      spy.calledOnce.should.be.true;
    });

    it('should call post-tock hook if provided', function () {
      var spy = sinon.spy();
      task._postTock = spy;
      task._tock({});
      spy.calledOnce.should.be.true;
    });

    it('should emit a tock emit with execution data', function (done) {
      var executionData = {};
      task.once('tock', function (data) {
        data.should.eq(executionData);
        done();
      });
      task._tock(executionData);
    });

    it('should decrement the running count', function (done) {
      task.runningCount = 1;
      task.once('tock', function () {
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

  describe('stop', function () {
    describe('when no callback is passed', function () {
      describe('when no promise is provided', function () {
        var options = makeOptions('task', function () {});
        var defaults = makeDefaults(5000, 10000, 500, 0);
        var task = new Base(options, defaults);

        it('should throw an error', function () {
          task.stop.bind(task).should.throw('Done callback must be provided');
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
