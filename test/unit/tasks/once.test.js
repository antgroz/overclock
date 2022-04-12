'use strict';

var Once = require('../../../lib/tasks/once');
var makeOptions = require('../../helpers/task').makeOptions;
var LifecycleError = require('../../../lib/util/errors').LifecycleError;
var TimeoutError = require('../../../lib/util/errors').TimeoutError;
var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;
chai.should();

var fn = function () {
  return true;
};
var undef = undefined;

describe('once task', function () {
  var clock = sinon.useFakeTimers();

  describe('_init', function () {
    describe('when task is already starting', function () {
      it('should report a lifecycle error', function () {
        var options = makeOptions('task', fn, 5000, 500, 0, 0);
        var task = new Once(options, {});
        task._init();
        task._init.bind(task).should.throw('Task is already starting');
        clock.runAll();
      });
    });

    describe('when task is already started', function () {
      it('should report a lifecycle error', function () {
        var executable = function (callback) {
          setTimeout(function () {
            callback(null, 5);
          }, 5000);
        };
        var options = makeOptions('task', executable, undef, 500, 0, 0);
        var task = new Once(options, {});
        task._init();
        task._init.bind(task).should.throw('Task is already started');
      });
    });

    describe('when task is not started yet or is stopped', function () {
      it('should emit a starting event with task data', function (done) {
        var options = makeOptions('task', fn, 5000, 500, 0, 0);
        var task = new Once(options, {});
        task.once('starting', function (data) {
          data.task.should.eq(task);
          clock.runAll();
          done();
        });
        task._init();
      });

      it('should start execution right away if start timeout is undefined', function () {
        var options = makeOptions('t', fn, undef, 500, undef, undef);
        var task = new Once(options, {});
        task._init();
        expect(task._timeout).to.be.null;
        clock.runAll();
      });

      it('should use timeout for starting if start timeout is defined', function () {
        var options = makeOptions('t', fn, 10, 500, undef, undef);
        var task = new Once(options, {});
        task._init();
        expect(task._timeout).not.to.be.null;
        clock.runAll();
      });

      it('should emit a started event with task data', function (done) {
        var options = makeOptions('t', fn, undef, 500, undef, undef);
        var task = new Once(options, {});
        task.once('started', function (data) {
          data.task.should.eq(task);
          clock.runAll();
          done();
        });
        task._init();
      });

      it('should change data on execution', function (done) {
        var options = makeOptions('t', fn, 5, 500, undef, undef);
        var task = new Once(options, {});
        task.once('started', function () {
          task.isStarting.should.be.false;
          task.isStarted.should.be.true;
          task.startedAt.should.be.instanceof(Date);
          task.isStopped.should.be.false;
          clock.runAll();
          done();
        });
        task._init();
        clock.next();
      });
    });
  });

  describe('destroy', function () {
    it('should emit a stopping event with task data', function (done) {
      var options = makeOptions('t', fn, undef, 500, undef, undef);
      var task = new Once(options, {});
      task.once('stopping', function (data) {
        data.task.should.eq(task);
        done();
      });
      task._init();
      clock.runAll();
      task._destroy();
    });

    it('should change the state of execution', function (done) {
      var options = makeOptions('t', fn, undef, 500, undef, undef);
      var task = new Once(options, {});
      task.once('stopping', function () {
        task.isStopping.should.be.true;
        task.stoppingAt.should.be.instanceof(Date);
        done();
      });
      task._init();
      clock.runAll();
      task._destroy();
    });

    it('should start destruction right away if stop timeout is undefined', function (done) {
      var options = makeOptions('t', fn, undef, 500, undef, undef);
      var task = new Once(options, {});
      task._init();
      task.once('stopping', function () {
        expect(task._timeout).to.be.null;
        done();
      });
      task._destroy(function () {});
      clock.runAll();
    });

    it('should use timeout for destruction if stop timeout is defined', function (done) {
      var options = makeOptions('t', fn, undef, 500, 5, undef);
      var task = new Once(options, {});
      task._init();
      task.once('stopping', function () {
        task._timeout.should.not.be.null;
        done();
      });
      task._destroy(function () {});
      clock.runAll();
    });

    describe('when task is not started yet', function () {
      it('should stop it right away', function (done) {
        var options = makeOptions('t', fn, 50, 500, undef, undef);
        var task = new Once(options, {});
        task._init();
        task.isStarting.should.be.true;
        task.isStarted.should.be.false;
        task.isStopping.should.be.false;
        task.isStopped.should.be.true;
        task._destroy(function () {
          expect(task._timeout).to.be.null;
          task.isStarting.should.be.false;
          task.isStarted.should.be.false;
          task.isStopping.should.be.false;
          task.isStopped.should.be.true;
          task.stoppedAt.should.be.instanceof(Date);
          done();
        });
      });
    });

    describe('when task is running', function () {
      describe('when graceful timeout is not set', function () {
        it('should wait for the task to stop execution', function (done) {
          var executable = function (callback) {
            setTimeout(function () {
              callback(null, 5);
            }, 5000);
          };
          var options = makeOptions('t', executable, undef, 500, undef, undef);
          var task = new Once(options, {});
          task._init();
          task._destroy(function () {
            expect(task._postTock).to.be.undefined;
            done();
          });
          expect(task._timeout).to.be.null;
          task._postTock.should.be.instanceof(Function);
          clock.runAll();
        });
      });

      describe('when graceful timeout is set and is not reached', function () {
        it('should wait for the task to stop execution', function (done) {
          var executable = function (callback) {
            setTimeout(function () {
              callback(null, 5);
            }, 5);
          };
          var options = makeOptions('t', executable, undef, 500, undef, 1000);
          var task = new Once(options, {});
          task._init();
          task._destroy(function (error) {
            expect(error).to.be.undefined;
            expect(task._timeout).to.be.null;
            expect(task._postTock).to.be.undefined;
            done();
          });
          expect(task._timeout).not.to.be.null;
          task._postTock.should.be.instanceof(Function);
          clock.runAll();
        });
      });

      describe('when graceful timeout is set and is reached', function () {
        it('should report a timeout error', function (done) {
          var executable = function (callback) {
            setTimeout(function () {
              callback(null, 5);
            }, 5000);
          };
          var options = makeOptions('t', executable, undef, 500, undef, 5);
          var task = new Once(options, {});
          task._init();
          task._destroy(function (error) {
            expect(error).to.be.instanceof(TimeoutError);
            expect(task._timeout).to.be.null;
            task.isStopped.should.be.false;
            done();
          });
          expect(task._timeout).not.to.be.null;
          task._postTock.should.be.instanceof(Function);
          clock.runAll();
        });

        it('should not prevent the task from stopping on its own', function (done) {
          var executable = function (callback) {
            setTimeout(function () {
              callback(null, 5);
            }, 5000);
          };
          var options = makeOptions('t', executable, undef, 500, undef, 5);
          var task = new Once(options, {});
          task._init();
          task.on('stopped', function () {
            done();
          });
          task._destroy(function (error) {
            expect(error).to.be.instanceof(TimeoutError);
            expect(task._timeout).to.be.null;
            task.isStopped.should.be.false;
          });
          expect(task._timeout).not.to.be.null;
          task._postTock.should.be.instanceof(Function);
          clock.runAll();
        });

        it('should call the provided callback only once', function () {
          var executable = function (callback) {
            setTimeout(function () {
              callback(null, 5);
            }, 5000);
          };
          var options = makeOptions('t', executable, undef, 500, undef, 5);
          var task = new Once(options, {});
          task._init();
          var callback = sinon.spy(function (error) {
            expect(error).to.be.instanceof(TimeoutError);
            expect(task._timeout).to.be.null;
            task.isStopped.should.be.false;
          });
          task._destroy(callback);
          expect(task._timeout).not.to.be.null;
          task._postTock.should.be.instanceof(Function);
          clock.runAll();
          callback.calledOnce.should.be.true;
        });
      });
    });

    describe('when task is stopping', function () {
      it('should report a lifecycle error', function (done) {
        var options = makeOptions('t', fn, undef, 500, 5000, 5);
        var task = new Once(options, {});
        task._init();
        task._destroy(function () {});
        task._destroy(function (error) {
          error.should.be.instanceof(LifecycleError);
          clock.runAll();
          done();
        });
      });
    });

    describe('when task is stopped', function () {
      it('should report a lifecycle error', function (done) {
        var options = makeOptions('t', fn, undef, 500, undef, 5);
        var task = new Once(options, {});
        task._init();
        task._destroy(function (error) {
          expect(error).to.be.undefined;
        });
        task._destroy(function (error) {
          error.should.be.instanceof(LifecycleError);
          done();
        });
      });
    });
  });

  // TODO
  describe('lifecycle', function () {});
});
