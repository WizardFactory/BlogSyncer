/**
 * Created by aleckim on 2014. 8. 9..
 * posts db는 각 사용자별로 하나씩 가지게 된다.
 */

var log = require('winston');
var mongoose = require('mongoose');

var postinfoSechema = mongoose.Schema({
    title: String,
    type: String,
    categories: [],
    tags: [],
    infos: [
        {
            provider_name: String,
            blog_id: String,
            post_id: String,
            url: String,
            modified: Date
        }
    ]
});

/**
 * type : text, link, photo, video
 */
var postSchema = mongoose.Schema({
    userId: Object,
    lastUpdateTime: Date,
    posts : [postinfoSechema]
});

/**
 *
 * @param postId
 * @returns {*}
 */
postSchema.methods.findPostById = function(postId) {
    "use strict";
    var i;

    for (i=0; i<this.posts.length; i++) {
        if (this.posts[i]._id === postId) {
            log.debug('find post('+postId+')');
            return this.posts[i];
        }
    }

    log.debug('Fail to find post id=' + postId);
};

/**
 *
 * @param {Object} post
 * @param {string} providerName
 * @param {string} blogId
 * @param {Object} newPost
 * @returns {*}
 */
postSchema.methods.addPostInfo = function(post, providerName, blogId, newPost) {
    "use strict";
    var postInfo;
    var i;

    postInfo = {};
    postInfo.provider_name = providerName;
    postInfo.blog_id = blogId;
    postInfo.post_id = newPost.id;
    postInfo.url = newPost.url;
    postInfo.modified = newPost.modified;

    if (newPost.categories) {
        if (!post.categories) {
            post.categories = [];
        }
        for (i=0; i<newPost.categories.length; i++) {
            post.categories.push(newPost.categories[i]);
        }
    }
    if (newPost.tags) {
        if (!post.tags) {
            post.tags = [];
        }
        for (i=0; i<newPost.tags.length; i++) {
            post.tags.push(newPost.tags[i]);
        }
    }

    post.infos.push(postInfo);

    return post;
};

/**
 *
 * @param {string} title
 * @returns {*}
 */
postSchema.methods.findPostByTitle = function(title) {
    "use strict";
    var i;
    var post;

    for (i=0; i<this.posts.length; i++) {
        if (!this.posts[i].title) {
            continue;
        }

        if (this.posts[i].title === title) {
            post = this.posts[i];
            log.debug('find post('+post.id+') by title='+title);
            return this.posts[i];
        }
    }

    log.debug('Fail to find post title=' + title);
};

/**
 *
 * @param {string} providerName
 * @param {string} blogId
 * @param {string} postId
 * @returns {boolean}
 */
postSchema.methods.findPostByPostIdOfBlog = function(providerName, blogId, postId) {
    "use strict";
    var foundIt = false;
    var i;
    var infos;
    var j;

    for (i = 0; i<this.posts.length; i++) {
        infos = this.posts[i].infos;
        for (j = 0; j<infos.length; j++) {
           if (infos[j].provider_name === providerName &&
                    infos[j].blog_id === blogId &&
                    infos[j].post_id === postId) {
               log.debug('posts index=' + i + ' infos index='+j);
               foundIt = true;
               break;
           }
        }
    }
    return foundIt;
};

/**
 *
 * @param {string} providerName
 * @param {string} blogId
 * @param {Object} newPost
 * @returns {*}
 */
postSchema.methods.addPost = function(providerName, blogId, newPost) {
    "use strict";
    var totalCount;
    var post = {};
    var postInfo;

    log.debug('add_post');

    totalCount = this.posts.length;
    log.debug("total = " + totalCount);

    if (newPost.title) {
        post.title = newPost.title;
    }
    else {
        log.debug("title is undefined");
        post.title = 'title';
    }

    if (newPost.type) {
        post.type = newPost.type;
    }
    else {
        log.debug("type is undefined");
        post.type = 'text';
    }

    if (newPost.categories) {
        post.categories = newPost.categories;
    }
    else {
        log.debug("categories is undefined");
        post.categories = [];
    }

    if (newPost.tags) {
        post.tags = newPost.tags;
    }
    else {
        log.debug("tags is undefined");
        post.tags = [];
    }

    post.infos = [];
    postInfo = {};
    postInfo.provider_name = providerName;
    postInfo.blog_id = blogId;
    postInfo.post_id = newPost.id;
    postInfo.url = newPost.url;
    postInfo.modified = newPost.modified;

    post.infos.push(postInfo);
    this.posts.push(post);
    return this.posts[totalCount];
};

module.exports = mongoose.model('Post', postSchema);

