'use strict';

var errors = require('../../../lib/util/errors');
require('chai').should();

describe('errors', function () {
  for (var name in errors) {
    var E = errors[name];

    describe(name, function () {
      it('should have a correct name', function () {
        new E().name.should.eq(name);
      });

      it('should have a stack trace', function () {
        new E().stack.should.not.be.undefined;
      });

      it('should accept a message', function () {
        var message = 'foo';
        new E(message).message.should.eq(message);
      });
    });
  }
});
