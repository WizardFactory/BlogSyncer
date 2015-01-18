/**
 * Created by aleckim on 2014. 8. 9..
 * posts db는 각 사용자별로 하나씩 가지게 된다.
 */

var mongoose = require('mongoose');

/*
 * provider내에 사용자 상관없이 blogId는 유일하기 때문에 providerId는 필요없다.
 */
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
    var meta = {};

    meta.cName = "postSchema";
    meta.fName = "findPostById";
    meta.postId = postId;

    for (i=0; i<this.posts.length; i+=1) {
        if (this.posts[i]._id === postId) {
            log.debug("Find post", meta);
            return this.posts[i];
        }
    }

    log.debug("Fail to find post", meta);
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
    var meta = {};

    meta.cName = "postSchema";
    meta.fName = "addPostInfo";
    meta.postId = post._id;
    meta.providerName = providerName;
    meta.blogId = blogId;
    meta.newPostId = newPost.id;

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
        for (i=0; i<newPost.categories.length; i+=1) {
            post.categories.push(newPost.categories[i]);
        }
    }
    if (newPost.tags) {
        if (!post.tags) {
            post.tags = [];
        }
        for (i=0; i<newPost.tags.length; i+=1) {
            post.tags.push(newPost.tags[i]);
        }
    }

    log.debug(" ", meta);
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
    var meta = {};

    meta.cName = "postSchema";
    meta.fName = "findPostByTitle";
    meta.title = title;

    for (i=0; i<this.posts.length; i+=1) {
        if (!this.posts[i].title) {
            continue;
        }

        if (this.posts[i].title === title) {
            post = this.posts[i];
            log.debug("Find post id="+post._id, meta);
            return this.posts[i];
        }
    }

    log.debug("Fail to find post", meta);
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
    var meta = {};

    meta.cName = "postSchema";
    meta.fName = "findPostByPostIdOfBlog";
    meta.providerName = providerName;
    meta.blogId = blogId;
    meta.postId = postId;

    for (i = 0; i<this.posts.length; i+=1) {
        infos = this.posts[i].infos;
        for (j = 0; j<infos.length; j+=1) {
           if (infos[j].provider_name === providerName &&
                    infos[j].blog_id === blogId &&
                    infos[j].post_id === postId) {
               log.debug("posts index=" + i + " infos index="+j, meta);
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
    var meta = {};

    meta.cName = "postSchema";
    meta.fName = "addPost";
    meta.providerName = providerName;
    meta.blogId = blogId;
    meta.newPostId = newPost.id;

    log.debug(" ", meta);

    totalCount = this.posts.length;
    log.debug("Total=" + totalCount, meta);

    if (newPost.title) {
        post.title = newPost.title;
    }
    else {
        log.debug("Title is undefined", meta);
        post.title = 'title';
    }

    if (newPost.type) {
        post.type = newPost.type;
    }
    else {
        log.debug("Type is undefined", meta);
        post.type = 'text';
    }

    if (newPost.categories) {
        post.categories = newPost.categories;
    }
    else {
        log.debug("Categories is undefined", meta);
        post.categories = [];
    }

    if (newPost.tags) {
        post.tags = newPost.tags;
    }
    else {
        log.debug("Tags is undefined", meta);
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

