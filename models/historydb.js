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
        title: String,
        description: String,
        src: {
            providerName: String,
            blogId: String,
            postId: String,
            url: String
        },
        dst: {
            providerName: String,
            blogId: String,
            postId: String,
            url: String
        }
    }]
});

module.exports = mongoose.model('History', historySchema);



