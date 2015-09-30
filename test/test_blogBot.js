/**
 * Created by aleckim on 2015. 6. 4..
 */
'use strict';

var assert  = require('assert');
var bB = require('../controllers/blogBot');
var tD = require('./test_data');
if (!global.log) {
    global.log = require('winston');
}

var testUserId = 'xxxxx';

var user = {
    _id: testUserId,
    providers: [tD.testProvider1, tD.testProvider2]
};

bB.users = [{
    user: user,
    blogDb: {
        sites: [{
            provider: tD.testProvider1,
            blogs: [tD.testBlog1, tD.testBlog2]
        }]
    }
}];


describe('blogBot', function () {
    describe('botTeaser', function () {
        it('get botTeaser', function (done) {
            this.timeout(8000);

            bB.getTeaser(tD.testTeaserUrl, function (err, botTeaser) {
                assert.equal(botTeaser.description, tD.testTeaserDescription, "Mismatch description");
                done();
            });
        });
    });
    describe('botGetBlogInUser', function () {
        it('get blog in user', function() {
            var user = {
                _id: testUserId
            };
            var blog  = bB.getBlogInUser(user, tD.testProvider1, tD.testBlog2.blog_id);
            assert.equal(blog.accessToken, tD.testBlog2.accessToken, "Mismatch access token");
        });
    });
});

