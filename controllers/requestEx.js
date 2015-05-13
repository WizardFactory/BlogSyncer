/**
 * Created by aleckim on 15. 4. 15..
 */

"use strict";

var req = require('request');

/**
 * insert statusCode to error for response.
 * @param error
 * @param response
 * @param body
 * @param callback
 * @returns {*}
 */

req.checkError = function(error, response, body, callback) {
    var meta = {};
    meta.cName = "requestEx";
    meta.fName = "checkError";

    if (error) {
        //it didn't check this works.
        error.statusCode = 503;
        if (callback) {
            callback(error);
        }
        return error;
    }

    try {
        if (response.statusCode >= 400) {
            var err = {};
            err.statusCode = response.statusCode;
            err.body = JSON.stringify(body);
            if (callback) {
                callback(err);
            }
            return err;
        }
    }
    catch(e) {
        e.statusCode = 500;
        log.error(e,meta);
        log.error(body, meta);
        //it didn't check this works.
        if(callback) {
            callback(e);
        }
        return e;
    }

    if (callback) {
        callback(null, response, body);
    }
    return null;
};

/**
 *
 * @param url
 * @param options
 * @param callback
 */
req.getEx = function(url, options, callback) {
    req.get(url, options, function(error, response, body) {
        req.checkError(error, response, body, function (error, response, body) {
           if (error)  {
               error.url = url;
           }
            callback(error, response, body);
        });
    });
};

/**
 *
 * @param url
 * @param options
 * @param callback
 */
req.postEx = function(url, options, callback) {
    req.post(url, options, function(error, response, body) {
        req.checkError(error, response, body, function (error, response, body) {
           if (error)  {
               error.url = url;
           }
            callback(error, response, body);
        });
    });
};

module.exports = req;


