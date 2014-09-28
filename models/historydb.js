/**
 * Created by aleckim on 2014. 9. 20..
 */

var fs = require('fs');
var dbfileName = 'history.db';

var log = require('winston');

function HistoryDb(histories) {
    this.histories = histories;
}

/*
   histories = [
            {
              tryTime:date
              src:{"providerName":"wordpress", "blogId":"wzdfac", "postId":"dddd", "postUrl":"http://"}, //post objects
              status:200,
              dst:{"providerName":"wordpress", "blogId":"wzdfac", "postId":"dddd", "postUrl":"http://"}},
   ];
 */


HistoryDb.prototype.init = function () {
  try {
    this.histories = JSON.parse(fs.readFileSync(dbfilename)).histories;
  }
  catch (e) {
    log.debug(e);
    return false;
  }

  return true;
};

HistoryDb.prototype.saveFile = function () {
  try {
    fs.writeFile(dbfilename, JSON.stringify({"histories":this.histories}), function (err) {
        if (err) throw err;
        log.debug('It\'s saved!');
    });
  }
  catch(e) {
      log.debug(e);
      return false;
  }

  return true;
};

HistoryDb.prototype.addHistory = function(src, status, dst) {
    var time = new Date();
    this.histories.push({"tryTime":time, "src":src, "status":status, "dst":dst});
};

HistoryDb.prototype.getHistorys = function(startIndex, counts) {
    return this.histories.slice(startIndex, startIndex+counts);
};


module.exports = HistoryDb;

