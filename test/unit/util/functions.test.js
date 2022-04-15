'use strict';

var functions = require('../../../lib/util/functions');
var throttle = functions.throttle;
var chai = require('chai');
var expect = chai.expect;
chai.should();

describe('functions', function () {
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
});
