/**
 * Created by aleckim on 2014. 7. 11..
 */
"use strict";

var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    providers : [{providerName: String,
                providerId : String,
                displayName : String,
                accessToken : String,
                refreshToken : String,
                token : String,
                tokenSecret : String,
                tokenExpireTime : Date,
                signUpTime: Date}]
});

/**
 *
 * @param providerName
 * @param providerId
 * @returns {*}
 */
userSchema.methods.findProvider = function(providerName, providerId) {
    var i;
    var p;
    var tmp;
    var meta = {};

    meta.cName = "userSchema";
    meta.fName = "findProvider";
    meta.providerName = providerName;
    meta.providerId = providerId;

    for ( i=0; i<this.providers.length; i+=1) {
        tmp = this.providers[i];
        if (tmp.providerName === providerName) {
            if (!providerId) {
                p = tmp;
                break;
            }
            else if(tmp.providerId === providerId) {
                p = tmp;
                break;
            }
        }
    }

    if (i === this.providers.length) {
        log.error("Fail to find providers", meta);
    }

    return p;
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);


