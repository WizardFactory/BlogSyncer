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

function _testShortenFunc(longUrl, callback) {
    if (longUrl) {
        log.debug('It is not used');
    }
    return callback(tD.testShortenUrl);
}

describe('blogConvert', function () {
    describe('convert post type', function () {
        var botPhotoPost;
        var botAudioPost;
        var botVideoPost;
        var botLinkPost;

        it('photo to text', function () {
            botPhotoPost = new bF.BotPhotoPost(tD.testPhotoPost1.id, tD.testPhotoPost1.urls,
                tD.testPhotoPost1.modified, tD.testPhotoPost1.post_url, tD.testPhotoPost1.title,
                tD.testPhotoPost1.description, tD.testPhotoPost1.categories, tD.testPhotoPost1.tags, tD.testPhotoPost1.replies);
            var botTextPost = bC.convertPostMediaToText(botPhotoPost);
            assert.equal(botPhotoPost.id, botTextPost.id, "Mismatch post id of post");
            assert.equal(botPhotoPost.replies, botTextPost.replies, "Mismatch post replies of post");
            assert.equal(botTextPost.content, tD.convertTextResultOfPhoto, "Mismatch content of text post");
        });
        it('audio to text', function () {
            botAudioPost = new bF.BotAudioPost(tD.testAudioPost1.id, tD.testAudioPost1.audio_url,
                tD.testAudioPost1.audio_source_url, tD.testAudioPost1.embed, tD.testAudioPost1.modified, tD.testAudioPost1.post_url,
                tD.testAudioPost1.title, tD.testAudioPost1.description, tD.testAudioPost1.categories, tD.testAudioPost1.tags,
                tD.testAudioPost1.replies);
            var botTextPost = bC.convertPostMediaToText(botAudioPost);
            assert.equal(botAudioPost.id, botTextPost.id, "Mismatch post id of post");
            assert.equal(botTextPost.content, tD.convertTextResultOfAudio, "Mismatch content of text post");
        });
        it('video to text', function () {
            botVideoPost = new bF.BotVideoPost(tD.testVideoPost1.id, tD.testVideoPost1.video_url, tD.testVideoPost1.embed_code,
                tD.testVideoPost1.modified, tD.testVideoPost1.post_url, tD.testVideoPost1.title, tD.testVideoPost1.description,
                tD.testVideoPost1.categories, tD.testVideoPost1.tags, tD.testVideoPost1.replies);
            var botTextPost = bC.convertPostMediaToText(botVideoPost);
            assert.equal(botVideoPost.id, botTextPost.id, "Mismatch post id of post");
            assert.equal(botTextPost.content, tD.convertTextResultOfVideo, "Mismatch content of text post");
        });
        it('link to text', function () {
            botLinkPost = new bF.BotLinkPost(tD.testLinkPost1.id, tD.testLinkPost1.url, tD.testLinkPost1.modified,
                tD.testLinkPost1.post_url, tD.testLinkPost1.title, tD.testLinkPost1.description, tD.testLinkPost1.categories,
                tD.testLinkPost1.tags, tD.testLinkPost1.replies);
            var botTextPost = bC.convertPostLinkToText(botLinkPost);
            assert.equal(botLinkPost.id, botTextPost.id, "Mismatch post id of post");
            assert.equal(botTextPost.content, tD.convertTextResultOfLink, "Mismatch content of text post");
        });
        it('any to content of text', function () {
            var content;
            content = bC.convertBotPostToTextContent(botPhotoPost);
            assert.equal(content, tD.convertTextResultOfPhoto, "Mismatch content of text post");
            content = bC.convertBotPostToTextContent(botAudioPost);
            assert.equal(content, tD.convertTextResultOfAudio, "Mismatch content of text post");
            content = bC.convertBotPostToTextContent(botVideoPost);
            assert.equal(content, tD.convertTextResultOfVideo, "Mismatch content of text post");
            content = bC.convertBotPostToTextContent(botLinkPost);
            assert.equal(content, tD.convertTextResultOfLink, "Mismatch content of text post");
        });
        it('convert new line to break tag', function () {
            var brString = bC.convertNewLineToBreakTag(tD.testNewLineString);
            assert.equal(brString, tD.testBreakString, "Mismatch content of break string");
        });
        it('make title from description', function () {
            var title = bC.makeTitle(botPhotoPost);
            assert.equal(title, tD.TEST_PHOTO_POST_TITLE_BY_DESC, "mismatch title");
        });
        it('make title from date', function () {
            var tmpPost = botPhotoPost;
            var tmpDes = botPhotoPost.description;
            tmpPost.description = '';
            var title = bC.makeTitle(tmpPost);
            assert.equal(title, tD.TEST_PHOTO_POST_TITLE_BY_DATE, "Mismatch title");
            botPhotoPost.description = tmpDes;
        });
        it('remove html tag in content', function () {
            var content;
            content = bC.removeHtmlTags(bC.convertBotPostToTextContent(botLinkPost));
            assert.equal(content, tD.convertPlainTextOfLink, "Mismatch plain text of botPost");
        });
        it('convert long url to shorten url', function (done) {
            bC.convertShortenUrl(tD.testLinkPost1.url, function (shortenUrl) {
                assert.equal(shortenUrl.length < bC.maxShortenUrlLen && shortenUrl.length > 5,
                            true, "Fail to get shorten url");
                done();
            });
        });

        var MAX_PLAIN_TEXT_LENGTH = 140;

        it('convert short text post to plain content', function (done) {
            var botTextPost1 = new bF.BotTextPost(tD.testTextPost1.id, tD.testTextPost1.content, tD.testTextPost1.modified,
                        tD.testTextPost1.post_url, tD.testTextPost1.title, tD.testTextPost1.categories, tD.testTextPost1.tags,
                        tD.testTextPost1.replies);

            assert.equal(botTextPost1.replies[0].notes, tD.testTextPost1.replies[0].notes, "Mismatch reply of botPost");

            bC.convertPostToPlainContent(botTextPost1, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc, function (content) {
                assert.equal(content, tD.testConvertPlainTextPost1Result, true, "Mismatch content");
                done();
            });
        });
        it('convert long text post to plain content', function (done) {
            var botTextPost2 = new bF.BotTextPost(tD.testTextPost2.id, tD.testTextPost2.content, tD.testTextPost2.modified,
                tD.testTextPost2.post_url, tD.testTextPost2.title, tD.testTextPost2.categories, tD.testTextPost2.tags,
                tD.testTextPost2.replies);
            assert.equal(botTextPost2.replies[0].notes, tD.testTextPost2.replies[0].notes, "Mismatch reply of botPost");

            bC.convertPostToPlainContent(botTextPost2, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc, function (content) {
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert link post to plain content', function (done) {
            bC.convertPostToPlainContent(botLinkPost, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc, function (content) {
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert photo post to plain content', function (done) {
            bC.convertPostToPlainContent(botPhotoPost, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc, function (content) {
                assert.equal(content, tD.convertPlainTextResultOfPhoto, true, "Over max length");
                done();
            });
        });
        it('convert audio post to plain content', function (done) {
            bC.convertPostToPlainContent(botAudioPost, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc, function (content) {
                //console.log(content);
                assert.equal(content.length < MAX_PLAIN_TEXT_LENGTH, true, "Over max length");
                done();
            });
        });
        it('convert video post to plain content', function (done) {
            bC.convertPostToPlainContent(botVideoPost, MAX_PLAIN_TEXT_LENGTH, _testShortenFunc, function (content) {
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
        it('is html', function () {
            var result;
            result = bC.isHtml(tD.convertTextResultOfLink);
            assert.equal(result, true, true, 'It is HTML');
            result = bC.isHtml(tD.convertPlainTextOfLink);
            assert.equal(result, false, true, 'It is not HTML');
        });
    });
});

