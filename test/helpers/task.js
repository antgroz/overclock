/**
 * Construct an object of task defaults
 *
 * @returns {object} - Object of defaults
 */
exports.makeDefaults = function () {
  var keys = [
    'startTimeoutMillis',
    'runIntervalMillis',
    'stopTimeoutMillis',
    'gracefulTimeoutMillis',
    'Promise',
  ];

  var defaults = {};
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    defaults[key] = arguments[i];
  }

  return defaults;
};

/**
 * Construct an object of task options
 *
 * @returns {object} - Object of options
 */
exports.makeOptions = function () {
  var common = Array.prototype.slice.call(arguments, 2);
  var options = exports.makeDefaults.apply(null, common);
  options.name = arguments[0];
  options.executable = arguments[1];
  return options;
};
