export class Emitter {
  constructor() {
    this._events = new Map();
  }

  on(event, handler) {
    let handlers = this._events.get(event);
    if (!handlers) {
      handlers = new Map();
      this._events.set(event, handlers);
    }

    const count = (handlers.get(handler) || 0) + 1;
    handlers.set(handler, count);

    return this;
  }

  off(event, handler) {
    const handlers = this._events.get(event);
    if (!handlers) {
      return;
    }

    const count = handlers.get(handler) - 1;
    if (!count) {
      handlers.delete(handler);
    } else {
      handlers.set(handler, count);
    }

    if (!handlers.size) {
      this._events.delete(event);
    }

    return this;
  }

  emit(event, ...args) {
    let handlers = this._events.get(event) || [];
    for (const [handler, count] of handlers) {
      for (let i = 0; i < count; i++) {
        handler(...args);
      }
    }

    handlers = this._events.get('*') || [];
    for (const [handler, count] of handlers) {
      for (let i = 0; i < count; i++) {
        handler(event, ...args);
      }
    }

    return this;
  }
}
