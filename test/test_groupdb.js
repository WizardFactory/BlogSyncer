/**
 * Created by aleckim on 14. 11. 15..
 */

'use strict';

var assert  = require('assert');
var Group = require('../models/groupdb');
var tD = require('./test_data');
if (!global.log) {
    global.log = require('winston');
}

var testBlog1 = tD.testBlog1;
var testProvider1 = tD.testProvider1;

describe('groupDb', function () {
    describe('Function', function () {
        var groupDb;
        it('create groupDb', function () {
            groupDb = new Group();
            assert.notEqual(typeof groupDb, "undefined", "Fail to create groupDb");
        });
        it('add groupDb', function () {
            var group = [];
            group.push({"provider":testProvider1, "blog":testBlog1});
            groupDb.groups.push({"group":group});
            assert.equal(groupDb.groups[0].group[0].provider.providerId,
                testProvider1.providerId, "Fail to add groupDb");
        });
        it('find group by blogInfo', function() {
            var groups;
            groups = groupDb.findGroupByBlogInfo(testProvider1.providerName,
                        testBlog1.blog_id);
            assert.equal(groups[0].group[0].provider.providerId,
                        testProvider1.providerId, "Fail to find groupByBlogInfo");
        });
    });
});



