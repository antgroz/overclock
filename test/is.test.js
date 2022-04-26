const { describe, it } = require('mocha');
const is = require('../lib/is');
const { should } = require('chai');

should();

describe('is', () => {
  describe('is nullish', () => {
    for (const value of [null, undefined]) {
      it(`should return true for ${value}`, () => {
        is.nullish(value).should.be.true;
      });
    }

    for (const value of ['foo', 3, -2, 1.1, Number.NEGATIVE_INFINITY]) {
      it(`should return false for ${value}`, () => {
        is.nullish(value).should.be.false;
      });
    }
  });

  describe('is nullish or integer', () => {
    for (const value of [null, undefined, 3, 0, -2]) {
      it(`should return true for ${value}`, () => {
        is.nullishOrInteger(value).should.be.true;
      });
    }

    for (const value of ['foo', -2.332, Number.POSITIVE_INFINITY, 1.1]) {
      it(`should return false for ${value}`, () => {
        is.nullishOrInteger(value).should.be.false;
      });
    }
  });

  describe('is nullish or finite non-negative number', () => {
    for (const value of [null, undefined, 3.2, 0, 2]) {
      it(`should return true for ${value}`, () => {
        is.nullishOrFiniteNonNegativeNumber(value).should.be.true;
      });
    }

    for (const value of ['foo', -2.332, Number.POSITIVE_INFINITY]) {
      it(`should return false for ${value}`, () => {
        is.nullishOrFiniteNonNegativeNumber(value).should.be.false;
      });
    }
  });

  describe('is nullish or finite number', () => {
    for (const value of [null, undefined, 3.2, 0, 2, -2, -9.23]) {
      it(`should return true for ${value}`, () => {
        is.nullishOrFiniteNumber(value).should.be.true;
      });
    }

    for (const value of ['foo', Number.NEGATIVE_INFINITY]) {
      it(`should return false for ${value}`, () => {
        is.nullishOrFiniteNumber(value).should.be.false;
      });
    }
  });
});
