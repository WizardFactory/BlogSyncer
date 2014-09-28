/**
 * Created by zNine on 2014-09-28.
 */

/**
 Usage on other modules:

 var log = require('winston');
 log.debug("This is debug log.");
 log.info("This is info log.");
 log.warn("This is warning log.");
 log.error("This is error log.");
 */

var log = require('winston');

log.setLevels(
    {
        debug:  0,
        info:   1,
        warn:   2,
        error:  3
    }
);

log.addColors(
    {
        debug:  'blue',
        info:   'green',
        warn:   'yellow',
        error:  'red'
    }
);

log.remove(log.transports.Console);
log.add(log.transports.Console, { level: 'debug', colorize: true });
module.exports = log;
