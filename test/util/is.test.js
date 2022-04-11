'use strict';

var is = require('../../lib/util/is');
require('chai').should();

var fn = function () {};
var t = true;
var f = false;
var undef = undefined;

describe('is', function () {
  describe('undefined', function () {
    it('should return true for undefined', function () {
      is.undefined(undefined).should.be.true;
    });

    it('should return false for everything else', function () {
      var params = [5, 0, -3, 'foo', '', null, {}, [], fn, t, f];
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        is.undefined(param).should.be.false;
      }
    });
  });

  describe('null', function () {
    it('should return true for null', function () {
      is.null(null).should.be.true;
    });

    it('should return false for everything else', function () {
      var params = [5, 0, -3, 'foo', '', undef, {}, [], fn, t, f];
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        is.null(param).should.be.false;
      }
    });
  });

  describe('nullish', function () {
    it('should return true for null and undefined', function () {
      is.nullish(undefined).should.be.true;
      is.nullish(null).should.be.true;
    });

    it('should return false for everything else', function () {
      var params = [5, 0, -3, 'foo', '', {}, fn, [], t, f];
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        is.nullish(param).should.be.false;
      }
    });
  });

  describe('object', function () {
    it('should return true for an object', function () {
      is.object({}).should.be.true;
    });

    var params = [5, 0, -3, 'foo', '', undef, null, fn, [], t, f];
    it('should return false for everything else', function () {
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        is.object(param).should.be.false;
      }
    });
  });

  describe('function', function () {
    it('should return true for an function', function () {
      is.function(fn).should.be.true;
    });

    it('should return false for everything else', function () {
      var params = [5, 0, -3, 'foo', '', undef, null, [], t, f, {}];
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        is.function(param).should.be.false;
      }
    });
  });

  describe('boolean', function () {
    it('should return true for a boolean', function () {
      is.boolean(true).should.be.true;
      is.boolean(false).should.be.true;
    });

    it('should return false for everything else', function () {
      var params = [5, 0, -3, 'foo', '', undef, null, [], fn, {}];
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        is.boolean(param).should.be.false;
      }
    });
  });

  describe('non-negative number', function () {
    it('should return true for a non-negative number', function () {
      is.nonNegativeNumber(0).should.be.true;
      is.nonNegativeNumber(2.03).should.be.true;
      is.nonNegativeNumber(100).should.be.true;
    });

    it('should return false for everything else', function () {
      var params = [-3, 'foo', '', undef, null, [], fn, {}, t, f];
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        is.nonNegativeNumber(param).should.be.false;
      }
    });
  });

  describe('array', function () {
    it('should return true for an array', function () {
      is.array([]).should.be.true;
    });

    it('should return false for everything else', function () {
      var params = [5, 0, -3, 'foo', '', undef, null, {}, fn, t, f];
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        is.array(param).should.be.false;
      }
    });
  });

  describe('string', function () {
    it('should return true for a string', function () {
      is.string('foo').should.be.true;
      is.string('').should.be.true;
    });

    it('should return false for everything else', function () {
      var params = [5, 0, -3, [], undef, null, {}, fn, t, f];
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        is.string(param).should.be.false;
      }
    });
  });
});
