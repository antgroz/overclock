/**
 * Simple event emitter
 */
export class Emitter {
  constructor() {
    this._events = new Map();
  }

  /**
   * Attach a handler to an event
   *
   * @param {string} event - Event name
   * @param {Function} handler - Handler function
   * @returns {Emitter} - This
   */
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

  /**
   * Detach a handler from an event.
   * When no handler is specified, detaches all handlers
   *
   * @param {string} event - Event name
   * @param {Function} [handler] - Handler function
   * @returns {Emitter} - This
   */
  off(event, handler) {
    const handlers = this._events.get(event);
    if (!handlers) {
      return this;
    }

    if (!handler) {
      this._events.delete(event);
      return this;
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

  /**
   * Emit an event with optional arguments
   *
   * @param {string} event - Event name
   * @param {...*} args - Optional arguments
   * @returns {Emitter} - This
   */
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
