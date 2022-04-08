"use strict";

var Promise = global.Promise;

if (!Promise) {
  try {
    Promise = require("bluebird");
  } catch (_) {
    // use callbacks only
  }
}

module.exports = Promise;
