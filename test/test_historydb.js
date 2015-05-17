/**
 * Created by aleckim on 14. 11. 15..
 */

'use strict';

var assert  = require('assert');
var History = require('../models/historydb');
var tD = require('./test_data');
if (!global.log) {
    global.log = require('winston');
}

var testHistory = tD.testHistory;

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

