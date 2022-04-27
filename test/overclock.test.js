'use strict';

const { describe, it } = require('mocha');
const { should } = require('chai');
const overclock = require('../overclock');
const Manager = require('../lib/manager');

should();

describe('overclock', () => {
  it('creates a new manager without options', () => {
    overclock().should.be.instanceof(Manager);
  });

  it('creates a new manager with options', () => {
    overclock({ tasks: [] }).should.be.instanceof(Manager);
  });
});
