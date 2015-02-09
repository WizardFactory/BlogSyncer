/**
 * Created by aleckim on 14. 11. 15..
 */

var assert  = require('assert');
var History = require('../models/historydb');
if (!global.log) {
    global.log = require('winston');
}

var d = new Date();

var testHistory = {
    tryTime: d,
    status: "200",
    src: {
        title: "XXXXX", id: "ASDFED", url: "DJDJDJD"
    },
    dst: {
        id: "DFCddd",  url: "e83ed0"
    }
};

describe('historyDb', function () {
    describe('Function', function () {
        var historyDb;
        it('create historyDb', function () {
            historyDb = new History();
            assert.notEqual(typeof historyDb, "undefined", "Fail to create historyDb");
        });
        it('add historyDb', function () {
            historyDb.histories.push(testHistory);
            assert.equal(historyDb.histories[0].src.title, testHistory.src.title, "Fail to add historyDb");
        });
    });
});

