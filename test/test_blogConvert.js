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

describe('bC', function () {
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
            //console.log(botTextPost.content);
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
            var title = bC.makeTitle(botPhotoPost);
            assert.equal(title, TEST_PHOTO_POST_TITLE_BY_DATE, "Mismatch title");
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

