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
     */
    wrapMediaTag: function (type, url) {
        var str = "";
        if (type === 'photo') {
            str = '<img src=\"' + url + '\" style="max-width: 100%;">';
        }
        else if (type === 'audio') {
            str = '<audio controls style="max-width: 100%;"><source src=\"' + url + '\">Your browser does not support the audio element.</audio>';
        }
        else if (type === 'video') {
            str = '<video width="500" controls style="max-width: 100%;"><source src=\"';
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
        content += '<div><p>' + botLinkPost.description + '</p></div>';
        if (botLinkPost.teaser) {
            var botTeaser = botLinkPost.teaser;

            content += '<div>';

            if (botTeaser.image) {
                content += '<div><a target="_blank" href="';
                content += botTeaser.url;
                content += '"><img src="';
                content += botTeaser.image;
                content += '" controls style="max-width: 100%;"></img><span></span></a></div>';
            }
            content += '<div><a target="_blank" href="';
            content += botTeaser.url;
            content += '">';

            if (botTeaser.title)  {
                content += '<h2>';
                content += botTeaser.title;
                content += '</h2>';
            }
            if (botTeaser.description)  {
                content += '<span>';
                content += botTeaser.description;
                content += '</span>';
            }
            content += '</a>';
            if (botTeaser.host)  {
                content += '<h3><a target="_blank" href="http://';
                content += botTeaser.host;
                content += '">';
                content += botTeaser.host;
                content += '</a></h3>';
            }
            content += '</div>';
        }
        else {
            content += '<div><a href="' + botLinkPost.contentUrl + '">';
            content += botLinkPost.contentUrl;
            content += '</a></div>';
        }

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
     *
     * @param content
     * @returns {string|void|XML|*}
     */
    convertNewLineToBreakTag: function (content) {
        var result;
        result = content.replace(/\n/g ,'<br>');
        return result;
    },
    /**
     * @param {Object} botPost
     * @return {string}
     */
    makeTitle: function (botPost) {
        var title = "";
        if (botPost.type === 'text') {
            if (botPost.content) {
                title = botPost.content;
            }
        }
        else if (botPost.type === 'photo' || botPost.type === 'video' || botPost.type === 'audio' ||
                    botPost.type === 'link') {
            if (botPost.description) {
                title = botPost.description;
            }
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
    /**
     * @param {string} content
     * @return {string}
     */
    removeHtmlTags: function (content) {
        var plain = '';
        if (content) {
            plain = content;
        }
        else {
            log.error((new Error('content is invalid')).stack);
        }
        plain = plain.replace(/<\/?[^>]+(>|$)/g, ""); //remove html tag
        plain = plain.replace(/^\s*/, ""); //remove blank from start of string
        plain = plain.replace(/\s*$/, ""); //remove blank from end of string

        return plain;
    },
    /**
     *
     */
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
    convertPostToPlainContent: function (botPost, maxLen, shortenFunc, callBack) {
        var content = '';
        var urls = [];

        if(botPost.type === 'text') {
            content = blogConvert.removeHtmlTags(botPost.content);
            urls.push(botPost.url);
            if (content.length < maxLen) {
                return callBack(content);
            }
        }
        else {
            if (botPost.description) {
                content = botPost.description;
            }
            content = blogConvert.removeHtmlTags(content);
            if (botPost.type === 'link') {
                urls.push(botPost.contentUrl);
            }
            else if (botPost.type === 'photo') {
                urls = botPost.mediaUrls;
            }
            else if (botPost.type === 'audio') {
                urls.push(botPost.audioUrl);
            }
            else if (botPost.type === 'video') {
                if (botPost.videoUrl) {
                    urls.push(botPost.videoUrl);
                }
                else {
                    urls.push(botPost.url);
                }
            }
        }

        var hashTags = blogConvert.convertTagToHashtag(botPost.tags);

        if (!urls.length) {
            content = blogConvert.makeLimitString(maxLen, content, hashTags.toString());
            return callBack(content);
        }

        var async = require('async');
        var asyncTasks = [];

        urls.forEach(function (url) {
            asyncTasks.push(function (cB) {
                shortenFunc(url, function (shortenUrl) {
                    return cB(null, shortenUrl);
                });
            });
        });

        async.parallel(asyncTasks, function (err, shortenUrls) {
            if(err) {
                log.error('Fail to get shortenUrl');
                return callBack(err);
            }
            var hashTagString = '';
            if (!blogConvert.getHashTags(content)) {
                //have to add hashtags
                hashTagString = hashTags.toString();
            }

            content = blogConvert.makeLimitString(maxLen, content, hashTagString, shortenUrls);
            return callBack(content);
        });
    },
    /**
     *
     * @param {string[]} tags
     * @param {string[]} categories
     */
    addCategoriesToTags: function (tags, categories) {
        for (var i=0;i<categories.length; i+=1) {
            for (var j=0; j<tags.length; j+=1) {
                if (categories[i] === tags[j]) {

                    //already included categories
                    break;
                }
            }
            if (j === tags.length) {
                tags.push(categories[i]);
            }
        }
    },
    /**
     *
     * @param {String[]} dstCategories
     * @param {Object[]} blogCategories
     * @param {String[]} tags
     */
    addTagsToCategories: function (dstCategories, blogCategories, tags) {
        for (var i=0; i<tags.length; i+=1)    {
            for (var j=0; j<blogCategories.length; j+=1) {

                //it is candidate of category
                if (tags[i] === blogCategories[j].name) {
                    for (var k=0; k<dstCategories.length; k+=1) {

                        //already included tag
                       if (tags[i] === dstCategories[k])  {
                           break;
                       }
                    }
                    if (k === dstCategories.length) {
                       dstCategories.push(tags[i]);
                    }
                    break;
                }
            }
        }
    },
    /**
     *
     * @param {string[]} categories
     * @param {Object[]} blogCategories
     * @param {string[]} tags
     */
    mergeTagsCategories: function (categories, blogCategories, tags) {
        blogConvert.addTagsToCategories(categories, blogCategories, tags);
        blogConvert.addCategoriesToTags(tags, categories);
    },
    /**
     *
     * @param {string} content
     * @returns {boolean}
     */
    isHtml : function (content) {
        return /<[a-z][\s\S]*>/i.test(content);
    },
    /**
     *
     * @param maxLen
     * @param content
     * @param tagString
     * @param urls
     * @returns {*}
     */
    makeLimitString: function(maxLen, content, tagString, urls) {
        var cutLen = 0;
        if (content.length) {
            cutLen += content.length;
        }
        if (tagString && tagString.length) {
            cutLen += 1 + tagString.length;
        }
        if (urls && urls.length) {
            urls.forEach(function(url) {
                if (url && url.length) {
                    cutLen += 1 + url.length;
                }
            });
        }
        cutLen -= maxLen;

        if (cutLen <= 0) {
            return content + ' ' + tagString + ' ' + urls.toString();
        }
        else if (content.length+1 > cutLen) {
            content = content.slice(0, content.length-(cutLen+1));
            content += ' ';
        }
        else if (content.length + tagString.length+1 > cutLen) {
            cutLen -= content.length;
            content = '';
            //TODO: cut by word block
            tagString = tagString.slice(0, tagString.length-(cutLen+1));
        }
        else {
            log.error('maxLen('+maxLen+') is too short');
            return ' ';
        }

        tagString += ' ';

        return content + tagString + urls.toString();
    },
    convertTagToHashtag: function(tags) {
        var hashTags = [];
        tags.forEach(function (element) {
            hashTags.push('#'+element);

        });
        return hashTags;
    },
    convertHashtagToTag: function (hastags) {
        var tags = [];
        hastags.forEach(function (element) {
          tags.push(element.replace(/#/g, ''));
        });
        return tags;
    },
    getHashTags: function(content) {
        var hashTags = [];

        content.replace(/(#|＃)([a-z0-9_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u024f\u0253-\u0254\u0256-\u0257\u0300-\u036f\u1e00-\u1eff\u0400-\u04ff\u0500-\u0527\u2de0-\u2dff\ua640-\ua69f\u0591-\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05d0-\u05ea\u05f0-\u05f4\ufb12-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4f\u0610-\u061a\u0620-\u065f\u066e-\u06d3\u06d5-\u06dc\u06de-\u06e8\u06ea-\u06ef\u06fa-\u06fc\u0750-\u077f\u08a2-\u08ac\u08e4-\u08fe\ufb50-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\u200c-\u200c\u0e01-\u0e3a\u0e40-\u0e4e\u1100-\u11ff\u3130-\u3185\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uffa1-\uffdc\u30a1-\u30fa\u30fc-\u30fe\uff66-\uff9f\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\u3041-\u3096\u3099-\u309e\u3400-\u4dbf\u4e00-\u9fff\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2f800-\u2fa1f]*[a-z_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u024f\u0253-\u0254\u0256-\u0257\u0300-\u036f\u1e00-\u1eff\u0400-\u04ff\u0500-\u0527\u2de0-\u2dff\ua640-\ua69f\u0591-\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05d0-\u05ea\u05f0-\u05f4\ufb12-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4f\u0610-\u061a\u0620-\u065f\u066e-\u06d3\u06d5-\u06dc\u06de-\u06e8\u06ea-\u06ef\u06fa-\u06fc\u0750-\u077f\u08a2-\u08ac\u08e4-\u08fe\ufb50-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\u200c-\u200c\u0e01-\u0e3a\u0e40-\u0e4e\u1100-\u11ff\u3130-\u3185\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uffa1-\uffdc\u30a1-\u30fa\u30fc-\u30fe\uff66-\uff9f\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\u3041-\u3096\u3099-\u309e\u3400-\u4dbf\u4e00-\u9fff\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2f800-\u2fa1f][a-z0-9_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff\u0100-\u024f\u0253-\u0254\u0256-\u0257\u0300-\u036f\u1e00-\u1eff\u0400-\u04ff\u0500-\u0527\u2de0-\u2dff\ua640-\ua69f\u0591-\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05d0-\u05ea\u05f0-\u05f4\ufb12-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4f\u0610-\u061a\u0620-\u065f\u066e-\u06d3\u06d5-\u06dc\u06de-\u06e8\u06ea-\u06ef\u06fa-\u06fc\u0750-\u077f\u08a2-\u08ac\u08e4-\u08fe\ufb50-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\u200c-\u200c\u0e01-\u0e3a\u0e40-\u0e4e\u1100-\u11ff\u3130-\u3185\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uffa1-\uffdc\u30a1-\u30fa\u30fc-\u30fe\uff66-\uff9f\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\u3041-\u3096\u3099-\u309e\u3400-\u4dbf\u4e00-\u9fff\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2f800-\u2fa1f]*)/gi,
            function (m) {
                hashTags.push(m);
            });

        return hashTags;
    }
};

module.exports = blogConvert;

