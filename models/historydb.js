/**
 * Created by aleckim on 2014. 9. 20..
 */

var mongoose = require('mongoose');
var historySchema;

historySchema = mongoose.Schema({
    userId: Object,
    histories: [{
        tryTime: Date,
        status: String,
        src: {
            title: String, id: String, url: String
        },
        dst: {
            id: String,  url: String
        }
    }]
});

module.exports = mongoose.model('History', historySchema);



