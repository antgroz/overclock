class LifecycleError extends Error {
}

LifecycleError.prototype.name = 'LifecycleError';

class ParameterError extends Error {
}

ParameterError.prototype.name = 'ParameterError';

class TimeoutError extends Error {
}

TimeoutError.prototype.name = 'TimeoutError';

module.exports = {
  LifecycleError,
  ParameterError,
  TimeoutError,
};
