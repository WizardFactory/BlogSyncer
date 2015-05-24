/**
 *
 * Created by aleckim on 2015. 5. 8..
 * @description convert format between blogSync and providers
 */
"use strict";

var botFormat = require('../models/botFormat');

/**
 *
 * @type {{wrapMediaTag: Function, convertPostLinkToText: Function, convertPostMediaToText: Function, makeTitle: Function}}
 */
var blogConvert = {
    /**
     *
     * @param {string} type
     * @param {string} url
     * @returns {string}
     * @private
     */
    wrapMediaTag: function (type, url) {
        var str = "";
        if (type === 'photo') {
            str = '<img src=\"' + url + '\">';
        }
        else if (type === 'audio') {
            str = '<audio controls><source src=\"' + url + '\">Your browser does not support the audio element.</audio>';
        }
        else if (type === 'video') {
            str = '<video width="500" controls><source src=\"';
            str += url + '\">Your browser does not support the video element.</video>';
        }
        return str;
    },

    /**
     *
     * @param {Object} botLinkPost
     * @returns {*}
     */
    convertPostLinkToText: function (botLinkPost) {
        if(!botLinkPost || botLinkPost.type !== 'link') {
            log.error("Fail to convert link post to text  botPost is undefined or type isn't link");
            return;
        }
        var content = '';
        content += '<a href="' + botLinkPost.contentUrl + '">';
        content += botLinkPost.contentUrl;
        content += '</a>';
        content += '<p>' + botLinkPost.description + '</p>';

        return new botFormat.BotTextPost(botLinkPost.id, content, botLinkPost.modified, botLinkPost.url,
                    botLinkPost.title, botLinkPost.categories, botLinkPost.tags, botLinkPost.replies);
    },

    /**
     *
     * @param {Object} botMediaPost
     * @returns {*}
     */
    convertPostMediaToText: function (botMediaPost) {
        if(!botMediaPost)  {
            log.error("Fail to convert photo post to text  botPost is undefined");
            return;
        }
        if (!(botMediaPost.type === 'photo' || botMediaPost.type === 'audio' || botMediaPost.type === 'video')) {
            log.error("make BotPost only photo, audio, video type");
            return;
        }

        var content = '<figure>';
        if (botMediaPost.type === 'photo') {
            for(var i=0; i<botMediaPost.mediaUrls.length; i+=1) {
                var url = botMediaPost.mediaUrls[i];
                content += this.wrapMediaTag(botMediaPost.type, url);
                content += "<br>";
            }
        }
        else if (botMediaPost.type === 'audio') {
            if (botMediaPost.embed) {
                content += botMediaPost.embed;
            }
            else {
                content += this.wrapMediaTag(botMediaPost.type, botMediaPost.audioUrl);
            }
        }
        else if (botMediaPost.type === 'video') {
            if (botMediaPost.videoUrl) {
                content += this.wrapMediaTag(botMediaPost.type, botMediaPost.videoUrl);
            }
            else {
                content += botMediaPost.embed;
            }
        }
        content += '<figcaption>';
        content += botMediaPost.description;
        content += '</figcaption>';
        content += '</figure>';

        return new botFormat.BotTextPost(botMediaPost.id, content, botMediaPost.modified, botMediaPost.url,
                    botMediaPost.title, botMediaPost.categories, botMediaPost.tags, botMediaPost.replies);
    },

    /**
     * make content of text from any botPost.
     * @param {Object} botPost
     * @returns {*}
     */
    convertBotPostToTextContent: function (botPost) {
        var postType = botPost.type;
        var botTextPost; //for convert text post
        var content;

        if (postType === 'text') {
            content = botPost.content;
        }
        else if(postType === 'photo' || postType === 'video' || postType === 'audio') {
            botTextPost = this.convertPostMediaToText(botPost);
            content = botTextPost.content;
        }
        else if(postType === 'link') {
            botTextPost = this.convertPostLinkToText(botPost);
            content = botTextPost.content;
        }
        else {
            var error = new Error("It can't convert to BotTextPost postType="+postType);
            log.error(error);
            return;
        }

        return content;
    },
    /**
     * @param {Object} botPost
     * @return {string}
     */
    makeTitle: function (botPost) {
        var title = "";
        if (botPost.type === 'text') {
            title = botPost.content;
        }
        else if (botPost.type === 'photo' || botPost.type === 'video' || botPost.type === 'audio' ||
                    botPost.type === 'link') {
            title = botPost.description;
        }

        title = title.replace(/<\/?[^>]+(>|$)/g, ""); //remove html tag
        title = title.replace(/^\s*/, ""); //remove blank from start of string
        title = title.replace(/\s*$/, ""); //remove blank from end of string
        //if (botPost.type === 'link')  {
        //    //get information from link
        //}
        if (title.length > 33) {
            title = title.substr(0,30);
            title += '...';
        }
        if (!title.length) {
            title += botPost.type + ' at ' + botPost.modified;
        }

        return title;
    },
    removeHtmlTags: function (content) {
        var plain = content;
        plain = plain.replace(/<\/?[^>]+(>|$)/g, ""); //remove html tag
        plain = plain.replace(/^\s*/, ""); //remove blank from start of string
        plain = plain.replace(/\s*$/, ""); //remove blank from end of string

        return plain;
    },
    maxShortenUrlLen : 24,
    /**
     *
     * @param longUrl
     * @param callback
     */
    convertShortenUrl: function (longUrl, callback) {
        var shortUrl = require('shorturl');
        shortUrl(longUrl, function (result) {
            return callback(result);
        });
    },

    /**
     *
     * @param botPost
     * @param maxLen
     * @param {function} shortenFunc
     * @param callBack
     */
    convertPostToPlainContentWithTitle: function (botPost, maxLen, shortenFunc, callBack) {
        var content;
        var url;

        if (botPost.title) {
            content = botPost.title;
        }

        if(botPost.type === 'text') {
            content += ' ' + botPost.content;
            content = blogConvert.removeHtmlTags(content);
            url = botPost.url;
            if (content.length < maxLen) {
                return callBack(content);
            }
        }
        else {
            if (botPost.description) {
                content += ' ' + botPost.description;
            }
            content = blogConvert.removeHtmlTags(content);
            if (botPost.type === 'link') {
                url = botPost.contentUrl;
            }
            else if (botPost.type === 'photo') {
                //content =  add photos shortenurl
                //Todo: support multi url
                url = botPost.mediaUrls[0];
            }
            else if (botPost.type === 'audio') {
                url = botPost.audioUrl;
            }
            else if (botPost.type === 'video') {
                if (botPost.videoUrl) {
                   url = botPost.videoUrl;
                }
                else {
                   url = botPost.url;
                }
            }
        }
        var cutLen = maxLen-blogConvert.maxShortenUrlLen;
        if (content.length >= cutLen) {
            content = content.slice(0, cutLen);
        }

        shortenFunc(url, function (shortenUrl) {
           return callBack(shortenUrl + ' ' + content);
        });
    }
};

module.exports = blogConvert;

