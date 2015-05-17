/**
 * Created by aleckim on 2015. 5. 11..
 */

'use strict';

var assert  = require('assert');
var botFormat = require('../models/botFormat');
var tD = require('./test_data');
if (!global.log) {
    global.log = require('winston');
}

var testProvider1 = tD.testProvider1;
var testProvider2 = tD.testProvider2;
var testBlog1 = tD.testBlog1;
var testTextPost1 = tD.testTextPost1;
var testLinkPost1 = tD.testLinkPost1;
var testPhotoPost1 = tD.testPhotoPost1;
var testAudioPost1 = tD.testAudioPost1;
var testVideoPost1 = tD.testVideoPost1;

describe('blogFormat', function () {
    describe('make bot', function () {
        it('make provider', function () {
            var provider1 = new botFormat.ProviderOauth1(testProvider1.providerName, testProvider1.providerId,
                        testProvider1.displayName, testProvider1.token, testProvider1.tokenSecret);
            var provider2 = new botFormat.ProviderOauth2(testProvider2.providerName, testProvider2.providerId,
                testProvider2.displayName, testProvider2.accessToken, testProvider2.refreshToken);
            assert.equal(provider1.providerId, testProvider1.providerId, "Mismatch blog_id of botBlog");
            assert.equal(provider2.providerId, testProvider2.providerId, "Mismatch blog_id of botBlog");
        });
        it('make botBlogList', function () {
            var botBlogList = new botFormat.BotBlogList(testProvider1);
            assert.notEqual(typeof botBlogList.provider, "undefined", "Fail to make provider of botBlogList");
            assert.equal(Array.isArray(botBlogList.blogs), true, "Fail to make blogs Array of botBlogList");
        });
        it('make botBlog', function () {
            var botBlog = new botFormat.BotBlog(testBlog1.blog_id, testBlog1.blog_title, testBlog1.blog_url);
            assert.equal(botBlog.blog_id, testBlog1.blog_id, "Mismatch blog_id of botBlog");
        });
        it('make botPostCount', function () {
            var botPostCount = new botFormat.BotPostCount(testProvider1.providerName, testBlog1.blog_id, testBlog1.postCount);
            assert.equal(botPostCount.post_count, testBlog1.postCount, "Mismatch post count of botPostCount");
        });
        it('make botPosts(List)', function () {
            var botPostList = new botFormat.BotPostList(testProvider1.providerName, testBlog1.blog_id);
            assert.equal(botPostList.blog_id, testBlog1.blog_id, "Mismatch blog id of botPosts");
            assert.equal(Array.isArray(botPostList.posts), true, "Fail to make Array of botPosts");
        });
        it('make botTextPost', function () {
            var botTextPost = new botFormat.BotTextPost(testTextPost1.id, testTextPost1.content, testTextPost1.modified,
                        testTextPost1.post_url, testTextPost1.title, testTextPost1.categories, testTextPost1.tags,
                        testTextPost1.replies);

            assert.equal(botTextPost.id, testTextPost1.id, "Mismatch post id of botPost");
            assert.equal(botTextPost.categories[0], testTextPost1.categories[0], "Mismatch category of botPost");
            assert.equal(botTextPost.replies[0].notes, testTextPost1.replies[0].notes, "Mismatch reply of botPost");
        });
        it('make botLinkPost', function () {
            var botLinkPost = new botFormat.BotLinkPost(testLinkPost1.id, testLinkPost1.url, testLinkPost1.modified,
                        testLinkPost1.post_url, testLinkPost1.title, testLinkPost1.description,
                        testTextPost1.categories, testLinkPost1.tags, testLinkPost1.replies);

            assert.equal(botLinkPost.id, testLinkPost1.id, "Mismatch post id of botPost");
            assert.equal(botLinkPost.replies, testLinkPost1.replies, "Mismatch reply of botPost");
        });
        it('make botPhotoPost', function () {
            var botPhotoPost = new botFormat.BotPhotoPost(testPhotoPost1.id, testPhotoPost1.urls,
                        testPhotoPost1.modified, testPhotoPost1.post_url, testPhotoPost1.title,
                        testPhotoPost1.description, testPhotoPost1.categories, testPhotoPost1.tags,
                        testPhotoPost1.replies);

            assert.equal(botPhotoPost.id, testPhotoPost1.id, "Mismatch post id of botPhotoPost");
            assert.equal(botPhotoPost.mediaUrls[0], testPhotoPost1.urls[0], "Mismatch photo url of botPhotoPost");
            assert.equal(botPhotoPost.replies, testPhotoPost1.replies, "Mismatch reply of botPost");
        });
        it('make botAudioPost', function () {
            var botAudioPost = new botFormat.BotAudioPost(testAudioPost1.id, testAudioPost1.audio_url,
                        testAudioPost1.audio_source_url, testAudioPost1.embed, testAudioPost1.modified,
                        testPhotoPost1.post_url, testAudioPost1.title, testAudioPost1.description,
                        testAudioPost1.categories, testAudioPost1.tags, testAudioPost1.replies);
            assert.equal(botAudioPost.id, testAudioPost1.id, "Mismatch post id of botAudioPost");
            assert.equal(botAudioPost.audioSourceUrl, testAudioPost1.audio_source_url, "Mismatch audio url of botAudioPost");
            assert.equal(botAudioPost.replies, testAudioPost1.replies, "Mismatch reply of botPost");
        });
        it('make botVideoPost', function () {
            var botVideoPost = new botFormat.BotVideoPost(testVideoPost1.id, testVideoPost1.video_url,
                        testVideoPost1.embed_code, testVideoPost1.modified, testVideoPost1.post_url, testVideoPost1.title,
                        testVideoPost1.description, testVideoPost1.categories, testVideoPost1.tags,
                        testVideoPost1.replies);

            assert.equal(botVideoPost.id, testVideoPost1.id, "Mismatch post id of botVideoPost");
            assert.equal(botVideoPost.embed, testVideoPost1.embed_code, "Mismatch video url of botVideoPost");
            assert.equal(botVideoPost.replies, testVideoPost1.replies, "Mismatch reply of botPost");
        });
        it('make comment list', function () {
            var tCList = tD.testCommentList;
            var tComment = tD.testComment;
            var botCommentList = new botFormat.BotCommentList(tCList.providerName, tCList.blogID, tCList.postID);
            var botComment = new botFormat.BotComment(tComment.content, tComment.URL, tComment.date);
            botCommentList.comments.push(botComment);
            assert.equal(tCList.postID, botCommentList.postID, "Mismatch postId of botCommentList");
            assert.equal(tComment.content, botComment.content, "Mismatch content of botComment");
            assert.equal(tComment.content, botCommentList.comments[0].content, "Mismatch content of botComment");
        });
    });
});

