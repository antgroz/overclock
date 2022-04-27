'use strict';

const { describe, it } = require('mocha');
const errors = require('../lib/errors');
const { should } = require('chai');

should();

describe('errors', () => {
  for (const code in errors) {
    const E = errors[code];

    describe(code, () => {
      it('should have a correct name', () => {
        new E().name.should.eq('OverclockError');
      });

      it('should have a correct code', () => {
        new E().code.should.eq(code);
      });

      it('should have a stack trace', () => {
        new E().stack.should.not.be.undefined;
      });
    });
  }
});
