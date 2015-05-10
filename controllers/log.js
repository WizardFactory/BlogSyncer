/**
 * Created by zNine on 2014-09-28.
 */

"use strict";

var winston = require('winston');

//silly, debug, verbose, info, warn, error

module.exports = function(filename) {
    var logger = new winston.Logger({
        transports: [
            new winston.transports.Console({
                level      : 'info',
                colorize   : true
            }),
            new winston.transports.File({
                level      : "debug",
                json       : false,
                filename   : filename
            })
        ]
    });
    logger.exitOnError = false;
    return logger;
};

