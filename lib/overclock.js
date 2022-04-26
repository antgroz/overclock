import { Manager } from './manager.js';

/**
 * Initialize a new instance
 *
 * @param {object} [options] - Manager options
 * @returns {Manager} - New instance
 */
export function overclock(options) {
  return new Manager(options);
}

export default overclock;
