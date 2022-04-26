const { describe, it } = require('mocha');
const errors = require('../lib/errors');
const { should } = require('chai');

should();

describe('errors', () => {
  for (const name in errors) {
    const E = errors[name];

    describe(name, () => {
      it('should have a correct name', () => {
        new E().name.should.eq(name);
      });

      it('should have a stack trace', () => {
        new E().stack.should.not.be.undefined;
      });

      it('should accept a message', () => {
        const message = 'foo';
        new E(message).message.should.eq(message);
      });
    });
  }
});
