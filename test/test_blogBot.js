/**
 * Created by aleckim on 2015. 6. 4..
 */
'use strict';

var assert  = require('assert');
var bB = require('../controllers/blogBot');
var tD = require('./test_data');
var botFormat = require('../models/botFormat');
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
    describe('retry posting', function () {
        var botRetry;

        it('add retry queue', function () {
            var userInfo = bB.users[0];

            userInfo.retryDb = {};
            userInfo.retryDb.queue = [];

            var botPostList = new botFormat.BotPostList(tD.testProvider1.providerName, tD.testBlog1.blog_id);
            var botTextPost = new botFormat.BotTextPost(tD.testTextPost1.id, tD.testTextPost1.content,
                        tD.testTextPost1.modified, tD.testTextPost1.post_url, tD.testTextPost1.title,
                        tD.testTextPost1.categories, tD.testTextPost1.tags, tD.testTextPost1.replies);
            botPostList.posts.push(botTextPost);

            var botPostList2 = new botFormat.BotPostList(tD.testProvider2.providerName, tD.testBlog2.blog_id);

            botRetry = {srcBotPosts:botPostList, dstBotPosts:botPostList2};
            bB._addRetryPosting(user, botRetry);

            var retryDb = bB._findDbByUser(user, "retry");

            assert.equal(retryDb.queue[0].srcBotPosts.posts[0].id, tD.testTextPost1.id, "Mismatch post id");
        });
        it('retry posting', function () {
            var tmpBotRetry;
            bB._retryPost = function (user, botRetry) {
                tmpBotRetry = botRetry;
            };
            bB._retryPostings(user);

            assert.equal(botRetry.srcBotPosts.posts[0].id, tmpBotRetry.srcBotPosts.posts[0].id, "Mismatch post id");
        });
    });
    describe('botTeaser', function () {
        it('get botTeaser', function (done) {
            this.timeout(4000);

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

