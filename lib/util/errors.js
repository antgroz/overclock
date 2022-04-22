export class LifecycleError extends Error {
}

LifecycleError.prototype.name = 'LifecycleError';

class ParameterError extends Error {
}

ParameterError.prototype.name = 'ParameterError';

export class TimeoutError extends Error {
}

TimeoutError.prototype.name = 'TimeoutError';
