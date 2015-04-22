/**
 * Created by zNine on 2014-09-28.
 */

"use strict";

/**
 Usage on other modules:

 var log = require('winston');
 log.debug("This is debug log.");
 log.info("This is info log.");
 log.warning("This is warning log.");
 log.error("This is error log.");
 */

//var log = require('winston');
//
//log.setLevels(
//    {
//        debug:  0,
//        info:   1,
//        warning:   2,
//        error:  3
//    }
//);
//
//log.addColors(
//    {
//        debug:  'blue',
//        info:   'green',
//        warning:   'yellow',
//        error:  'red'
//    }
//);
//
//log.remove(log.transports.Console);
//log.add(log.transports.Console, { level: 'debug', colorize: true });
//
//module.exports = log;

//log.debug("message");
//log.info("message");
//log.notice("message");
//log.warning("message");
//log.error("message");
//log.alert("message");
//log.crit("message");
var winston = require('winston');

winston.setLevels(winston.config.syslog.levels);
//winston.addColors(
//    {
//        debug:  'blue',
//        info:   'green',
//        warning:   'yellow',
//        error:  'red'
//    }
//);

module.exports = function(filename) {
    var logger = new winston.Logger({
        transports: [
            new winston.transports.Console({
                level      : "error",
                colorize   : true
            }),
            new winston.transports.File({
                level      : "debug",
                json       : false,
                filename   : filename
            })
        ]
    });

    //debug, info, notice, warning, error, crit, alert, emerg
    logger.setLevels(winston.config.syslog.levels); logger.exitOnError = false;
    return logger;
};

