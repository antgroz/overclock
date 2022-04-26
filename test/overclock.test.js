import { describe, it } from 'mocha';
import { should } from 'chai';
import overclock, { overclock as exported } from '../lib/overclock.js';
import { Manager } from '../lib/manager.js';

should();

describe('overclock', () => {
  describe('exported', () => {
    it('creates a new manager without options', () => {
      exported().should.be.instanceof(Manager);
    });

    it('creates a new manager with options', () => {
      exported({ tasks: [] }).should.be.instanceof(Manager);
    });
  })

  describe('default', () => {
    it('creates a new manager without options', () => {
      overclock().should.be.instanceof(Manager);
    });

    it('creates a new manager with options', () => {
      overclock({ tasks: [] }).should.be.instanceof(Manager);
    });
  })
});
