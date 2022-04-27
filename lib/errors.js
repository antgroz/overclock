const { format } = require('util');
const { EVENT_NAMES } = require('./constants');

const e = exports;

/**
 * Create an error class
 *
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {*} [Base] - Base error class
 * @returns {Function} - Error class
 */
function createError(code, message, Base = Error) {
  class OverclockError extends Base {
    constructor(...args) {
      const formatted = format(message, ...args);
      super(formatted);

      this.code = code;
    }
  }

  OverclockError.prototype.name = 'OverclockError';
  OverclockError.prototype[Symbol.toStringTag] = code;

  return OverclockError;
}

e.OCK_ERR_TSK_PARAM_NAME_MISSING = createError(
  'OCK_ERR_TSK_PARAM_NAME_MISSING',
  'Task options are missing a name'
);

e.OCK_ERR_TSK_PARAM_NAME_INVALID = createError(
  'OCK_ERR_TSK_PARAM_NAME_INVALID',
  'Task name must be a non-empty string, received %j',
  TypeError
);

e.OCK_ERR_TSK_PARAM_EXEC_MISSING = createError(
  'OCK_ERR_TSK_PARAM_EXEC_MISSING',
  'Task options are missing an executable'
);

e.OCK_ERR_TSK_PARAM_EXEC_INVALID = createError(
  'OCK_ERR_TSK_PARAM_EXEC_INVALID',
  'Task executable must be a function, received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_PARAM_CONCUR_LIM_INVALID = createError(
  'OCK_ERR_TSK_PARAM_CONCUR_LIM_INVALID',
  'Task concurrency limit must be an integer ' +
    '(positive to limit concurrency, zero to inhibit execution, ' +
    'negative to have no limit), received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_PARAM_LIVE_THRESH_INVALID = createError(
  'OCK_ERR_TSK_PARAM_LIVE_THRESH_INVALID',
  'Task liveness threshold must be an integer ' +
    '(positive to set up a threshold, zero to inhibit execution, ' +
    'negative to have no threshold), received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_PARAM_INIT_CAP_INVALID = createError(
  'OCK_ERR_TSK_PARAM_INIT_CAP_INVALID',
  'Task initial capacity must be an integer ' +
    '(positive or zero to limit initial capacity, ' +
    'negative to produce up to concurrency limit), received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_PARAM_FAC_CAP_INVALID = createError(
  'OCK_ERR_TSK_PARAM_FAC_CAP_INVALID',
  'Task factory capacity must be an integer ' +
    '(positive to limit factory capacity, zero to inhibit execution, ' +
    'negative to produce up to concurrency limit), received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_PARAM_GEN_LIM_INVALID = createError(
  'OCK_ERR_TSK_PARAM_GEN_LIM_INVALID',
  'Task generation limit must be an integer ' +
    '(positive to set up a limit on generations, zero to inhibit execution, ' +
    'negative to execute indefinitely), received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_PARAM_START_TMO_INVALID = createError(
  'OCK_ERR_TSK_PARAM_START_TMO_INVALID',
  'Task start timeout must be a finite non-negative number ' +
    '(positive to set up a deferral of starting the task, zero to start right away), ' +
    'received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_PARAM_HRT_INTVL_INVALID = createError(
  'OCK_ERR_TSK_PARAM_HRT_INTVL_INVALID',
  'Task heartbeat interval must be a finite non-negative number ' +
    '(positive to set up a period of spawning executables, zero to always spawn ' +
    'as soon as possible) received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_PARAM_RCT_TMO_INVALID = createError(
  'OCK_ERR_TSK_PARAM_RCT_TMO_INVALID',
  'Task reactor timeout must be a finite non-negative number ' +
    '(positive to set up a waiting period for spawning executables, zero ' +
    'to always spawn as soon as an executable finishes or times out), ' +
    'received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_PARAM_RCT_BRC_LIM_INVALID = createError(
  'OCK_ERR_TSK_PARAM_RCT_BRC_LIM_INVALID',
  'Task reactor branching limit must be an integer ' +
    '(positive to set up a limit on deferred spawning, zero to inhibit spawning, ' +
    'negative to always schedule spawning), received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_PARAM_RUN_TMO_INVALID = createError(
  'OCK_ERR_TSK_PARAM_RUN_TMO_INVALID',
  'Task run timeout must be a finite number ' +
    '(positive to set up a run timeout on executables, zero to time out immediately, ' +
    'negative to wait for executable indefinitely), received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_PARAM_STOP_TMO_INVALID = createError(
  'OCK_ERR_TSK_PARAM_STOP_TMO_INVALID',
  'Task stop timeout must be a finite non-negative number ' +
    '(positive to set up a deferral of stopping the task, zero to stop right away), ' +
    'received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_PARAM_GRC_TMO_INVALID = createError(
  'OCK_ERR_TSK_PARAM_GRC_TMO_INVALID',
  'Task grace timeout must be a finite number ' +
    '(positive to set up a timeout on stopping the task, zero to time out ' +
    'immediately, negative to for stopping indefinitely), received %j for task "%s"',
  TypeError
);

e.OCK_ERR_TSK_LC_STOP_GEN_LIM_ZERO = createError(
  'OCK_ERR_TSK_LC_STOP_GEN_LIM_ZERO',
  'Lifecycle of task "%s" is stopping due to generation limit of zero'
);

e.OCK_ERR_TSK_LC_STOP_CONCUR_LIM_ZERO = createError(
  'OCK_ERR_TSK_LC_STOP_CONCUR_LIM_ZERO',
  'Lifecycle of task "%s" is stopping due to concurrency limit of zero'
);

e.OCK_ERR_TSK_LC_STOP_LIVE_THRESH_ZERO = createError(
  'OCK_ERR_TSK_LC_STOP_LIVE_THRESH_ZERO',
  'Lifecycle of task "%s" is stopping due to liveness threshold of zero'
);

e.OCK_ERR_TSK_LC_STOP_TOT_CAP_ZERO = createError(
  'OCK_ERR_TSK_LC_STOP_TOT_CAP_ZERO',
  'Lifecycle of task "%s" is stopping due to total capacity of zero'
);

e.OCK_ERR_TSK_LC_STOP_FAC_CAP_ZERO = createError(
  'OCK_ERR_TSK_LC_STOP_FAC_CAP_ZERO',
  'Lifecycle of task "%s" is stopping due to factory capacity of zero'
);

e.OCK_ERR_TSK_LC_STOP_RCT_BRC_LIM_ZERO = createError(
  'OCK_ERR_TSK_LC_STOP_RCT_BRC_LIM_ZERO',
  'Lifecycle of task "%s" is stopping due to reactor branching limit of zero'
);

e.OCK_ERR_TSK_LC_STOP_GEN_LIM_RCHD = createError(
  'OCK_ERR_TSK_LC_STOP_GEN_LIM_RCHD',
  'Lifecycle of task "%s" is stopping because generation limit ' +
    'of %d is reached'
);

e.OCK_ERR_TSK_LC_DLA_CONCUR_LIM_RCHD = createError(
  'OCK_ERR_TSK_LC_DLA_CONCUR_LIM_RCHD',
  'Lifecycle of task "%s" is delayed because concurrency limit ' +
    'of %d is reached'
);

e.OCK_ERR_TSK_LC_DLA_LIVE_THRESH_SAT = createError(
  'OCK_ERR_TSK_LC_DLA_LIVE_THRESH_SAT',
  'Lifecycle of task "%s" is delayed because liveness threshold ' +
    'of %d is satisfied'
);

e.OCK_ERR_TSK_LC_DLA_RCT_BRC_LIM_RCHD = createError(
  'OCK_ERR_TSK_LC_DLA_RCT_BRC_LIM_RCHD',
  'Lifecycle of task "%s" is delayed because reactor branching limit ' +
    'of %d is reached'
);

e.OCK_ERR_TSK_RUN_TMO = createError(
  'OCK_ERR_TSK_RUN_TMO',
  'Executable of task "%s" timed out run timeout of %d ms'
);

e.OCK_ERR_TSK_GRC_TMO = createError(
  'OCK_ERR_TSK_GRC_TMO',
  'Stopping task "%s" timed out grace timeout of %d ms'
);

e.OCK_ERR_MGR_PARAM_TSK_INVALID = createError(
  'OCK_ERR_MGR_PARAM_TSK_INVALID',
  'Manager tasks must be an array, received %j',
  TypeError
);

e.OCK_ERR_MGR_PARAM_TSK_OPT_MISSING = createError(
  'OCK_ERR_MGR_PARAM_TSK_OPT_MISSING',
  'Manager task options must be specified',
  TypeError
);

e.OCK_ERR_MGR_PARAM_TSK_OPT_INVALID = createError(
  'OCK_ERR_MGR_PARAM_TSK_OPT_INVALID',
  'Manager task options must be an object, received %j',
  TypeError
);

e.OCK_ERR_MGR_PARAM_TSK_TYPE_INVALID = createError(
  'OCK_ERR_MGR_PARAM_TSK_TYPE_INVALID',
  'Manager task type must be "heartbeat" or "reactor", received %j',
  TypeError
);

e.OCK_ERR_MGR_PARAM_TSK_NAME_MISSING = createError(
  'OCK_ERR_MGR_PARAM_TSK_NAME_MISSING',
  'Manager task name must be specified'
);

e.OCK_ERR_MGR_PARAM_TSK_NAME_INVALID = createError(
  'OCK_ERR_MGR_PARAM_TSK_NAME_INVALID',
  'Manager task name must be a non-empty string, received %j',
);

e.OCK_ERR_MGR_TSK_ADDED_ALREADY = createError(
  'OCK_ERR_MGR_TSK_ADDED_ALREADY',
  'Manager task "%s" is already added'
);

e.OCK_ERR_MGR_TSK_UNKNOWN = createError(
  'OCK_ERR_MGR_TSK_UNKNOWN',
  'Manager task "%s" is unknown'
);

e.OCK_ERR_MGR_PARAM_EVT_INVALID = createError(
  'OCK_ERR_MGR_PARAM_EVT_INVALID',
  `Manager event must be one of "${[...EVENT_NAMES].join('", "')}", ` +
    'received %j',
  TypeError
);
