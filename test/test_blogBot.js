/**
 * Created by aleckim on 2015. 6. 4..
 */
'use strict';

var assert  = require('assert');
var bB = require('../controllers/blogbot');
var tD = require('./test_data');
if (!global.log) {
    global.log = require('winston');
}

describe('blogBot', function () {
    describe('botTeaser', function () {
        it('get botTeaser', function (done) {
            this.timeout(4000);

            bB.getTeaser(tD.testTeaserUrl, function (err, botTeaser) {
                assert.equal(botTeaser.description, tD.testTeaserDescription, "Mismatch description");
                done();
            });
        });
    });
});
