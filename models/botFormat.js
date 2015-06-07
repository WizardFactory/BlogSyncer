/**
 *
 * Created by aleckim on 2015. 5. 11..
 * object need to be sealed.
 */
'use strict';

/**
 *
 * @param {string} providerName
 * @param {string} providerId
 * @param {string} displayName
 * @constructor
 */
function PureProvider(providerName, providerId, displayName) {
    this.providerName = providerName;
    this.providerId = providerId;
    this.displayName = displayName;
    this.signUpTime = undefined;
}

/**
 *
 * @param {string} type
 * @param {string} id
 * @param {Date} modified
 * @param {string} url
 * @param {Array} [categories]
 * @param {Array} [tags]
 * @param {Array} [replies]
 * @constructor
 */
function BotPost(type, id, modified, url, categories, tags, replies) {
    this.type = type;
    this.id = id;
    this.modified = modified;
    this.url = url;
    this.categories = categories;
    this.tags = tags;
    this.replies = replies;
}

var BotFormat = {
    /**
     *
     * @param {string} providerName
     * @param {string} providerId
     * @param {string} displayName
     * @param {string} token
     * @param {string} tokenSecret
     * @constructor
     */
    ProviderOauth1: function (providerName, providerId, displayName, token, tokenSecret) {
        if (!providerName || !providerId || !token || !tokenSecret || !displayName) {
            log.error('arguments are undefined');
        }
        PureProvider.apply(this, arguments);
        this.token = token;
        this.tokenSecret = tokenSecret;
    },
    /**
     *
     * @param {string} providerName
     * @param {string} providerId
     * @param {string} displayName
     * @param {string} accessToken
     * @param {string} refreshToken
     * @param {Date} [tokenExpireTime]
     * @constructor
     */
    ProviderOauth2: function (providerName, providerId, displayName, accessToken, refreshToken, tokenExpireTime) {
        if (!providerName || !providerId || !accessToken || !refreshToken || !displayName) {
            log.error('arguments are undefined');
        }
        PureProvider.apply(this, arguments);
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpireTime = tokenExpireTime;
    },
    /**
     *
     * @param {ProviderOauth1|ProviderOauth2} provider
     * @constructor
     */
    BotBlogList: function (provider) {
        if (!provider) {
            log.error('arguments are undefined');
        }
        this.provider = provider;
        this.blogs = [];
    },
    /**
     *
     * @param {string} blog_id
     * @param {string} blog_title
     * @param {string} blog_url
     * @param {Object[]} blog_url
     * @constructor
     */
    BotBlog:  function(blog_id, blog_title, blog_url, categories) {
        if (!blog_id || !blog_title || !blog_url) {
            log.error('arguments are undefined');
        }
        this.blog_id = blog_id;
        this.blog_title = blog_title;
        this.blog_url = blog_url;
        this.categories = categories;
    },
    /**
     *
     * @param {string} provider_name
     * @param {string} blog_id
     * @param {number} post_count
     * @constructor
     */
    BotPostCount: function (provider_name, blog_id, post_count) {
        if (!provider_name || !blog_id || !post_count) {
            log.error('arguments are undefined');
        }
        this.provider_name = provider_name;
        this.blog_id = blog_id;
        this.post_count = post_count;
    },
    /**
     *
     * @param {string} provider_name
     * @param {string} blog_id
     * @param {string} [nextPageToken]
     * @constructor
     */
    BotPostList: function (provider_name, blog_id, nextPageToken) {
        if (!provider_name || !blog_id) {
            log.error('arguments are undefined');
        }
        this.provider_name = provider_name;
        this.blog_id = blog_id;
        this.nextPageToken = nextPageToken;
        this.posts = [];
    },
    /**
     * todo: Object 복사를 할 수 있어야 한다. by dhkim2
     * @param {string} id
     * @param {string} content
     * @param {Date} modified
     * @param {string} postUrl
     * @param {string} [title]
     * @param {Array} [categories]
     * @param {Array} [tags]
     * @param {Array} [replies]
     * @constructor
     */
    BotTextPost: function (id, content, modified, postUrl, title, categories, tags, replies ) {
        if(!id || !content || !modified) {
            log.error('arguments are undefined');
        }
        BotPost.call(this, 'text', id, modified, postUrl, categories, tags, replies);
        this.content = content;
        this.title = title;
    },
    /**
     *
     * @param {string} id
     * @param {string} contentUrl
     * @param {Date} modified
     * @param {string} postUrl
     * @param {string} title
     * @param {string} description
     * @param {Array} categories
     * @param {Array} tags
     * @param {Array} replies
     * @constructor
     */
    BotLinkPost: function (id, contentUrl, modified, postUrl, title, description, categories, tags, replies ) {
        if (!id || !contentUrl || !modified || !postUrl) {
            log.error('arguments are undefined');
        }
        BotPost.call(this, 'link', id, modified, postUrl, categories, tags, replies);
        this.contentUrl = contentUrl;
        this.title = title;
        this.description = description;
    },
    /**
     *
     * @param id
     * @param mediaUrls
     * @param modified
     * @param postUrl
     * @param title
     * @param description
     * @param categories
     * @param tags
     * @param replies
     * @constructor
     */
    BotPhotoPost: function (id, mediaUrls, modified, postUrl, title, description, categories, tags, replies ) {
        if (!id || !mediaUrls || mediaUrls.length === 0 || !modified) {
            log.error('arguments are undefined');
        }
        BotPost.call(this, 'photo', id, modified, postUrl, categories, tags, replies);
        this.mediaUrls = mediaUrls;
        this.title = title;
        this.description = description;
    },

    /**
     *
     * @param id
     * @param audioUrl audio stream address
     * @param audioSourceUrl audio public address (can't play by audio tag)
     * @param embed
     * @param modified
     * @param postUrl
     * @param title
     * @param description
     * @param categories
     * @param tags
     * @param replies
     * @constructor
     */
    BotAudioPost: function (id, audioUrl, audioSourceUrl, embed, modified, postUrl, title, description, categories,
                                    tags, replies ) {
        if (!id || !modified || !postUrl) {
            log.error('arguments are undefined');
        }
        if (!audioUrl && !audioSourceUrl && !embed) {
            log.error('arguments are undefined');
        }
        BotPost.call(this, 'audio', id, modified, postUrl, categories, tags, replies);
        this.audioUrl = audioUrl;
        this.audioSourceUrl = audioSourceUrl;
        this.embed = embed;
        this.title = title;
        this.description = description;
    },
    /**
     *
     * @param id
     * @param videoUrl
     * @param embed
     * @param modified
     * @param postUrl
     * @param title
     * @param description
     * @param categories
     * @param tags
     * @param replies
     * @constructor
     */
    BotVideoPost: function (id, videoUrl, embed, modified, postUrl, title, description, categories, tags, replies ) {
        if (!id || !modified) {
            log.error('arguments are undefined');
        }
        if (!videoUrl && !embed) {
            log.error('arguments are undefined');
        }
        BotPost.call(this, 'video', id, modified, postUrl, categories, tags, replies);
        this.videoUrl = videoUrl;
        this.embed = embed;
        this.title = title;
        this.description = description;
    },
    /**
     *
     * @param content
     * @param URL
     * @param date
     * @constructor
     */
    BotComment: function (content, URL, date) {
        if (!content) {
            log.error('arguments are undefined');
        }
        this.content = content;
        this.URL = URL;
        this.date = date;
    },
    /**
     *
     * @param providerName
     * @param blogId
     * @param postId
     * @constructor
     */
    BotCommentList: function(providerName, blogId, postId) {
        if (!providerName || !blogId || !postId) {
            log.error('arguments are undefined');
        }
        this.providerName = providerName;
        this.blogID = blogId;
        this.postID = postId;
        this.comments = [];
    }
};

module.exports = BotFormat;

