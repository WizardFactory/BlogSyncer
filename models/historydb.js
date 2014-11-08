/**
 * Created by aleckim on 2014. 9. 20..
 */

var log = require('winston');
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

//HistoryDb.prototype.addHistory = function(src, status, dst) {
//    var time = new Date();
//    this.histories.push({"tryTime":time, "src":src, "status":status, "dst":dst});
//};
//
//HistoryDb.prototype.getHistorys = function(startIndex, counts) {
//    return this.histories.slice(startIndex, startIndex+counts);
//};


