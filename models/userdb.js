/**
 * Created by aleckim on 2014. 7. 11..
 */

var mongoose = require('mongoose');

// define Schema =================
var userSchema = mongoose.Schema({
    providers : [{providerName: String,
                providerId : String,
                accessToken : String,
                refreshToken : String,
                displayName : String }]
});


userSchema.methods.findProvider = function(providerName, providerId) {
    var u;
    var i;
    var p;
    var tmp;

    for ( i=0; i<this.providers.length; i++) {
        tmp = this.providers[i];
        if (tmp.providerName === providerName) {
            if (providerId == undefined) {
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
        console.log("Fail to find providers");
    }

    return p;
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);


