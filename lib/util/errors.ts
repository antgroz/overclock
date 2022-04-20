export class LifecycleError extends Error {
  public readonly name = 'LifecycleError'
}

export class ParameterError extends Error {
  public readonly name = 'ParameterError'
}

export class TimeoutError extends Error {
  public readonly name = 'TimeoutError'
}
