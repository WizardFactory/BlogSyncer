/**
 * Created by aleckim on 2015. 5. 9..
 */

'use strict';

var assert  = require('assert');
var blogConvert = require('../controllers/blogConvert');
var botFormat = require('../models/botFormat');
var tD = require('./test_data');
if (!global.log) {
    global.log = require('winston');
}

var testTextPost1 = tD.testTextPost1;
var testTextPost2 = tD.testTextPost2;

var testLinkPost1 = tD.testLinkPost1;
var convertTextResultOfLink = tD.convertTextResultOfLink;

var testPhotoPost1 = tD.testPhotoPost1;
var convertTextResultOfPhoto = tD.convertTextResultOfPhoto;
var TEST_PHOTO_POST_TITLE_BY_DESC = tD.TEST_PHOTO_POST_TITLE_BY_DESC;
var TEST_PHOTO_POST_TITLE_BY_DATE = tD.TEST_PHOTO_POST_TITLE_BY_DATE;

var testAudioPost1 = tD.testAudioPost1;
var convertTextResultOfAudio = tD.convertTextResultOfAudio;

var testVideoPost1 = tD.testVideoPost1;
var convertTextResultOfVideo = tD.convertTextResultOfVideo;

function _testShortenFunc(longUrl, callback) {
      return callback(tD.testShortenUrl);
}

describe('blogConvert', function () {
    describe('convert post type', function () {
        var botPhotoPost;
        var botAudioPost;
        var botVideoPost;
        var botLinkPost;

        it('photo to text', function () {
            botPhotoPost = new botFormat.BotPhotoPost(testPhotoPost1.id, testPhotoPost1.urls,
                testPhotoPost1.modified, testPhotoPost1.post_url, testPhotoPost1.title,
                testPhotoPost1.description, testPhotoPost1.categories, testPhotoPost1.tags, testPhotoPost1.replies);
            var botTextPost = blogConvert.convertPostMediaToText(botPhotoPost);
            assert.equal(botPhotoPost.id, botTextPost.id, "Mismatch post id of post");
            assert.equal(botPhotoPost.replies, botTextPost.replies, "Mismatch post replies of post");
            assert.equal(botTextPost.content, convertTextResultOfPhoto, "Mismatch content of text post");
        });
        it('audio to text', function () {
            botAudioPost = new botFormat.BotAudioPost(testAudioPost1.id, testAudioPost1.audio_url,
                testAudioPost1.audio_source_url, testAudioPost1.embed, testAudioPost1.modified, testAudioPost1.post_url,
                testAudioPost1.title, testAudioPost1.description, testAudioPost1.categories, testAudioPost1.tags,
                testAudioPost1.replies);
            var botTextPost = blogConvert.convertPostMediaToText(botAudioPost);
            assert.equal(botAudioPost.id, botTextPost.id, "Mismatch post id of post");
            assert.equal(botTextPost.content, convertTextResultOfAudio, "Mismatch content of text post");
        });
        it('video to text', function () {
            botVideoPost = new botFormat.BotVideoPost(testVideoPost1.id, testVideoPost1.video_url, testVideoPost1.embed_code,
                testVideoPost1.modified, testVideoPost1.post_url, testVideoPost1.title, testVideoPost1.description,
                testVideoPost1.categories, testVideoPost1.tags, testVideoPost1.replies);
            var botTextPost = blogConvert.convertPostMediaToText(botVideoPost);
            assert.equal(botVideoPost.id, botTextPost.id, "Mismatch post id of post");
            assert.equal(botTextPost.content, convertTextResultOfVideo, "Mismatch content of text post");
        });
        it('link to text', function () {
            botLinkPost = new botFormat.BotLinkPost(testLinkPost1.id, testLinkPost1.url, testLinkPost1.modified,
                testLinkPost1.post_url, testLinkPost1.title, testLinkPost1.description, testLinkPost1.categories,
                testLinkPost1.tags, testLinkPost1.replies);
            var botTextPost = blogConvert.convertPostLinkToText(botLinkPost);
            assert.equal(botLinkPost.id, botTextPost.id, "Mismatch post id of post");
            assert.equal(botTextPost.content, convertTextResultOfLink, "Mismatch content of text post");
        });
        it('any to content of text', function () {
            var content;
            content = blogConvert.convertBotPostToTextContent(botPhotoPost);
            assert.equal(content, convertTextResultOfPhoto, "Mismatch content of text post");
            content = blogConvert.convertBotPostToTextContent(botAudioPost);
            assert.equal(content, convertTextResultOfAudio, "Mismatch content of text post");
            content = blogConvert.convertBotPostToTextContent(botVideoPost);
            assert.equal(content, convertTextResultOfVideo, "Mismatch content of text post");
            content = blogConvert.convertBotPostToTextContent(botLinkPost);
            assert.equal(content, convertTextResultOfLink, "Mismatch content of text post");
        });
        it('convert new line to break tag', function () {
            var brString = blogConvert.convertNewLineToBreakTag(tD.testNewLineString);
            assert.equal(brString, tD.testBreakString, "Mismatch content of break string");
        });
        it('make title from description', function () {
            var title = blogConvert.makeTitle(botPhotoPost);
            assert.equal(title, TEST_PHOTO_POST_TITLE_BY_DESC, "mismatch title");
        });
        it('make title from date', function () {
            var tmpPost = botPhotoPost;
            tmpPost.description = '';
            var title = blogConvert.makeTitle(tmpPost);
            assert.equal(title, TEST_PHOTO_POST_TITLE_BY_DATE, "Mismatch title");
        });
        it('remove html tag in content', function () {
            var content;
            content = blogConvert.removeHtmlTags(blogConvert.convertBotPostToTextContent(botLinkPost));
            assert.equal(content, tD.convertPlainTextOfLink, "Mismatch plain text of botPost");
        });
        it('convert long url to shorten url', function (done) {
            blogConvert.convertShortenUrl(testLinkPost1.url, function (shortenUrl) {
                assert.equal(shortenUrl.length < blogConvert.maxShortenUrlLen && shortenUrl.length > 5,
                            true, "Fail to get shorten url");
                done();
            });
        });

        var MAX_PLAIN_TEXT_LENGTH = 140;

        it('convert short text post to plain content', function (done) {
            var botTextPost1 = new botFormat.BotTextPost(testTextPost1.id, testTextPost1.content, testTextPost1.modified,
                        testTextPost1.post_url, testTextPost1.title, testTextPost1.categories, testTextPost1.tags,
                        testTextPost1.replies);

            assert.equal(botTextPost1.replies[0].notes, testTextPost1.replies[0].notes, "Mismatch reply of botPost");

            blogConvert.convertPostToPlainContentWithTitle(botTextPost1, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc, function (content) {
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert long text post to plain content', function (done) {
            var botTextPost2 = new botFormat.BotTextPost(testTextPost2.id, testTextPost2.content, testTextPost2.modified,
                testTextPost2.post_url, testTextPost2.title, testTextPost2.categories, testTextPost2.tags,
                testTextPost2.replies);
            assert.equal(botTextPost2.replies[0].notes, testTextPost2.replies[0].notes, "Mismatch reply of botPost");

            blogConvert.convertPostToPlainContentWithTitle(botTextPost2, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc,
                        function (content) {
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert link post to plain content', function (done) {
            blogConvert.convertPostToPlainContentWithTitle(botLinkPost, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc,
                        function (content) {
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert photo post to plain content', function (done) {
            blogConvert.convertPostToPlainContentWithTitle(botPhotoPost, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc,
                        function (content) {
                            console.log(content);
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert audio post to plain content', function (done) {
            blogConvert.convertPostToPlainContentWithTitle(botAudioPost, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc,
                        function (content) {
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert video post to plain content', function (done) {
            blogConvert.convertPostToPlainContentWithTitle(botVideoPost, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc,
                        function (content) {
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
    });
});

