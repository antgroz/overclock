'use strict';

var functions = require('../../../lib/util/functions');
var throttle = functions.throttle;
var delay = functions.delay;
var run = functions.run;
var chai = require('chai');
var sinon = require('sinon');
var Promise = require('bluebird');
var expect = chai.expect;
chai.should();

describe('functions', function () {
  var clock = sinon.useFakeTimers();

  describe('throttle', function () {
    it('should limit executions when limit is positive', function () {
      var limit = 3;
      var count = 0;
      var executable = function () {
        count++;
        return true;
      };
      var throttled = throttle(executable, limit);
      while (throttled()) {
        /* run till throttle is activated */
      }
      count.should.eq(limit);
    });

    it('should disallow executions when limit is zero', function () {
      var executable = function () {
        return true;
      };
      var throttled = throttle(executable, 0);
      expect(throttled).should.not.eq(true);
    });

    it('should not limit executions when limit is negative', function () {
      var count = 3;
      var executable = function () {
        count--;
      };
      var throttled = throttle(executable, -1);
      for (var i = 0; i < 3; i++) {
        throttled();
      }
      count.should.eq(0);
    });

    it('should pass the arguments to the underlying function', function () {
      var executable = function (first, second) {
        first.should.eq(1);
        second.should.eq(2);
      };
      var throttled = throttle(executable, 1);
      throttled(1, 2);
    });
  });

  describe('delay', function () {
    it('should execute the function right away if timeout is nullish', function () {
      var count = 0;
      var executable = function () {
        count++;
      };
      delay(executable);
      delay(executable, null);
      delay(executable, undefined);
      count.should.eq(3);
    });

    it('should set a timeout for the function if timeout is defined', function () {
      var count = 0;
      var executable = function () {
        count++;
      };
      delay(executable, 1000);
      clock.next();
      count.should.eq(1);
      delay(executable, 2000);
      clock.next();
      count.should.eq(2);
      delay(executable, 3000);
      clock.next();
      count.should.eq(3);
    });
  });

  describe('run', function () {
    describe('when promise native constructor is provided', function () {
      it('should return a promise', function () {
        var executable = function (done) {
          done();
        };
        var promise = run(executable, global.Promise);
        expect(promise).instanceof(global.Promise);
        clock.runAll();
      });

      it('should resolve with result if it is returned', function (done) {
        var executable = function (done) {
          done(null, 5);
        };
        var promise = run(executable, global.Promise);
        promise.then(function (result) {
          result.should.eq(5);
          done();
        });
      });

      it('should reject with error if it is returned', function (done) {
        var error = new Error('something bad');
        var executable = function (done) {
          done(error);
        };
        var promise = run(executable, global.Promise);
        promise.then(null, function (e) {
          e.should.eq(error);
          done();
        });
      });
    });

    describe('when promise library constructor is provided', function () {
      it('should return a promise', function () {
        var executable = function (done) {
          done();
        };
        var promise = run(executable, Promise);
        expect(promise).instanceof(Promise);
        clock.runAll();
      });

      it('should resolve with result if it is returned', function (done) {
        var executable = function (done) {
          done(null, 5);
        };
        var promise = run(executable, Promise);
        promise.then(function (result) {
          result.should.eq(5);
          done();
        });
      });

      it('should reject with error if it is returned', function (done) {
        var error = new Error('something bad');
        var executable = function (done) {
          done(error);
        };
        var promise = run(executable, Promise);
        promise.then(null, function (e) {
          e.should.eq(error);
          done();
        });
      });
    });

    describe('when callback is provided', function () {
      it('should resolve with result if it is returned', function (done) {
        var executable = function (done) {
          done(null, 5);
        };
        run(executable, null, function (error, result) {
          expect(error).to.be.null;
          result.should.eq(5);
          done();
        });
      });

      it('should resolve with error if it is returned', function (done) {
        var error = new Error('something bad');
        var executable = function (done) {
          done(error);
        };
        run(executable, null, function (e, result) {
          e.should.eq(error);
          expect(result).to.be.undefined;
          done();
        });
      });
    });
  });
});
