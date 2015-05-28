/**
 * Created by aleckim on 2015. 5. 9..
 */

'use strict';

var assert  = require('assert');
var bC = require('../controllers/blogConvert');
var bF = require('../models/botFormat');
var tD = require('./test_data');
if (!global.log) {
    global.log = require('winston');
}

var testTextPost1 = tD.testTextPost1;
var testTextPost2 = tD.testTextPost2;

var testLinkPost1 = tD.testLinkPost1;
var tLinkPost1 = tD.testLinkPost1;
var convertTextResultOfLink = tD.convertTextResultOfLink;

var tPhotoPost1 = tD.testPhotoPost1;
var convertTextResultOfPhoto = tD.convertTextResultOfPhoto;
var TEST_PHOTO_POST_TITLE_BY_DESC = tD.TEST_PHOTO_POST_TITLE_BY_DESC;
var TEST_PHOTO_POST_TITLE_BY_DATE = tD.TEST_PHOTO_POST_TITLE_BY_DATE;

var tAudioPost1 = tD.testAudioPost1;
var convertTextResultOfAudio = tD.convertTextResultOfAudio;

var tVideoPost1 = tD.testVideoPost1;
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
            botPhotoPost = new bF.BotPhotoPost(tPhotoPost1.id, tPhotoPost1.urls,
                tPhotoPost1.modified, tPhotoPost1.post_url, tPhotoPost1.title,
                tPhotoPost1.description, tPhotoPost1.categories, tPhotoPost1.tags, tPhotoPost1.replies);
            var botTextPost = bC.convertPostMediaToText(botPhotoPost);
            assert.equal(botPhotoPost.id, botTextPost.id, "Mismatch post id of post");
            assert.equal(botPhotoPost.replies, botTextPost.replies, "Mismatch post replies of post");
            assert.equal(botTextPost.content, convertTextResultOfPhoto, "Mismatch content of text post");
        });
        it('audio to text', function () {
            botAudioPost = new bF.BotAudioPost(tAudioPost1.id, tAudioPost1.audio_url,
                tAudioPost1.audio_source_url, tAudioPost1.embed, tAudioPost1.modified, tAudioPost1.post_url,
                tAudioPost1.title, tAudioPost1.description, tAudioPost1.categories, tAudioPost1.tags,
                tAudioPost1.replies);
            var botTextPost = bC.convertPostMediaToText(botAudioPost);
            assert.equal(botAudioPost.id, botTextPost.id, "Mismatch post id of post");
            assert.equal(botTextPost.content, convertTextResultOfAudio, "Mismatch content of text post");
        });
        it('video to text', function () {
            botVideoPost = new bF.BotVideoPost(tVideoPost1.id, tVideoPost1.video_url, tVideoPost1.embed_code,
                tVideoPost1.modified, tVideoPost1.post_url, tVideoPost1.title, tVideoPost1.description,
                tVideoPost1.categories, tVideoPost1.tags, tVideoPost1.replies);
            var botTextPost = bC.convertPostMediaToText(botVideoPost);
            assert.equal(botVideoPost.id, botTextPost.id, "Mismatch post id of post");
            assert.equal(botTextPost.content, convertTextResultOfVideo, "Mismatch content of text post");
        });
        it('link to text', function () {
            botLinkPost = new bF.BotLinkPost(tLinkPost1.id, tLinkPost1.url, tLinkPost1.modified,
                tLinkPost1.post_url, tLinkPost1.title, tLinkPost1.description, tLinkPost1.categories,
                tLinkPost1.tags, tLinkPost1.replies);
            var botTextPost = bC.convertPostLinkToText(botLinkPost);
            assert.equal(botLinkPost.id, botTextPost.id, "Mismatch post id of post");
            assert.equal(botTextPost.content, convertTextResultOfLink, "Mismatch content of text post");
        });
        it('any to content of text', function () {
            var content;
            content = bC.convertBotPostToTextContent(botPhotoPost);
            assert.equal(content, convertTextResultOfPhoto, "Mismatch content of text post");
            content = bC.convertBotPostToTextContent(botAudioPost);
            assert.equal(content, convertTextResultOfAudio, "Mismatch content of text post");
            content = bC.convertBotPostToTextContent(botVideoPost);
            assert.equal(content, convertTextResultOfVideo, "Mismatch content of text post");
            content = bC.convertBotPostToTextContent(botLinkPost);
            assert.equal(content, convertTextResultOfLink, "Mismatch content of text post");
        });
        it('make title from description', function () {
            var title = bC.makeTitle(botPhotoPost);
            assert.equal(title, TEST_PHOTO_POST_TITLE_BY_DESC, "mismatch title");
        });
        it('make title from date', function () {
            var tmpPost = botPhotoPost;
            tmpPost.description = '';
            var title = bC.makeTitle(tmpPost);
            assert.equal(title, TEST_PHOTO_POST_TITLE_BY_DATE, "Mismatch title");
        });
        it('remove html tag in content', function () {
            var content;
            content = bC.removeHtmlTags(bC.convertBotPostToTextContent(botLinkPost));
            assert.equal(content, tD.convertPlainTextOfLink, "Mismatch plain text of botPost");
        });
        it('convert long url to shorten url', function (done) {
            bC.convertShortenUrl(testLinkPost1.url, function (shortenUrl) {
                assert.equal(shortenUrl.length < bC.maxShortenUrlLen && shortenUrl.length > 5,
                            true, "Fail to get shorten url");
                done();
            });
        });

        var MAX_PLAIN_TEXT_LENGTH = 140;

        it('convert short text post to plain content', function (done) {
            var botTextPost1 = new bF.BotTextPost(testTextPost1.id, testTextPost1.content, testTextPost1.modified,
                        testTextPost1.post_url, testTextPost1.title, testTextPost1.categories, testTextPost1.tags,
                        testTextPost1.replies);

            assert.equal(botTextPost1.replies[0].notes, testTextPost1.replies[0].notes, "Mismatch reply of botPost");

            bC.convertPostToPlainContentWithTitle(botTextPost1, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc, function (content) {
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert long text post to plain content', function (done) {
            var botTextPost2 = new bF.BotTextPost(testTextPost2.id, testTextPost2.content, testTextPost2.modified,
                testTextPost2.post_url, testTextPost2.title, testTextPost2.categories, testTextPost2.tags,
                testTextPost2.replies);
            assert.equal(botTextPost2.replies[0].notes, testTextPost2.replies[0].notes, "Mismatch reply of botPost");

            bC.convertPostToPlainContentWithTitle(botTextPost2, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc,
                        function (content) {
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert link post to plain content', function (done) {
            bC.convertPostToPlainContentWithTitle(botLinkPost, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc,
                        function (content) {
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert photo post to plain content', function (done) {
            bC.convertPostToPlainContentWithTitle(botPhotoPost, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc,
                        function (content) {
                            console.log(content);
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert audio post to plain content', function (done) {
            bC.convertPostToPlainContentWithTitle(botAudioPost, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc,
                        function (content) {
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert video post to plain content', function (done) {
            bC.convertPostToPlainContentWithTitle(botVideoPost, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc,
                        function (content) {
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('add tag to categories', function () {
            var testTags = ['adc', 'ac', 'dd'];
            var testCategories1 = ['ww'];
            bC.addCategoriesToTags(testTags, testCategories1);
            assert.equal(testTags.toString(), ['adc', 'ac', 'dd', 'ww'].toString(), true, "Mismatch array");
            var testCategories2 = ['ac'];
            bC.addCategoriesToTags(testTags, testCategories2);
            assert.equal(testTags.toString(), ['adc', 'ac', 'dd', 'ww'].toString(), true, "Mismatch array");
        });
        it('add categories to tag', function () {
            var testTags1 = ['adc', 'ac', 'dd'];
            var testCategories1 = ['ww'];
            bC.addTagsToCategories(testCategories1, tD.testBlog1.categories, testTags1);
            assert.equal(testCategories1.toString(), testCategories1.toString(), true, "Mismatch array");
            var testTags2 = ['adc', 'ac', 'dd', 'company'];
            bC.addTagsToCategories(testCategories1, tD.testBlog1.categories, testTags2);
            assert.equal(testCategories1.toString(), ['ww', 'company'].toString(), true, "Mismatch array");
        });
        it('merge categories to tag', function () {
            var testCategories1 = ['development'];
            var testTags2 = ['adc', 'ac', 'dd', 'company'];
            bC.mergeTagsCategories(testCategories1, tD.testBlog1.categories, testTags2);
            assert.equal(testCategories1.toString(), ['development', 'company'].toString(), true, "Mismatch array");
            assert.equal(testTags2.toString(), ['adc', 'ac', 'dd', 'company', 'development'].toString(), true, "Mismatch array");
        });
    });
});

