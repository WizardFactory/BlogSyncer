/**
 *
 * Created by aleckim on 2014. 8. 13..
 */

var request = require('request');

var SiteDb = require('../models/blogdb');
var PostDb = require('../models/postdb');
var HistoryDb = require('../models/historydb');
var GroupDb = require('../models/groupdb');
var log = require('winston');

/**
 *
 * @constructor
 */
function BlogBot() {
}

/**
 *
 * @type {[{user: Object, blogDb:Object, groupDb:Object, postDb:Object, historyDb:Object}]}
 */
BlogBot.users = [];

/**
 *
 * @param {User} user
 * @param {string} dbName
 * @returns {*}
 */
BlogBot.findDbByUser = function (user, dbName) {
    "use strict";
    for (var i=0; i<this.users.length; i++) {
        if (this.users[i].user._id === user._id ||
            this.users[i].user._id.toString() === user._id) {
            switch(dbName) {
                case "blog":
                    return this.users[i].blogDb;
                case "group":
                    return this.users[i].groupDb;
                case "history":
                    return this.users[i].historyDb;
                case "post":
                    return this.users[i].postDb;
                default:
                    log.error("Unknown dbName:"+dbName);
                    return;
            }
        }
    }

    log.error("Fail to find user._id="+user._id + "typeof=" + typeof user._id);
    return undefined;
};

/**
 *
 * @param {User} user
 * @param {Object} recv_posts
 */
BlogBot.send_post_to_blogs = function (user, recv_posts) {
    "use strict";
    if (recv_posts === undefined)  {
        log.error("Fail to get recv_posts");
        return;
    }

    var groupDb = BlogBot.findDbByUser(user, "group");
    var blog_id = recv_posts.blog_id;
    var provider_name = recv_posts.provider_name;
    var post = recv_posts.posts[0];
    var groups = groupDb.findGroupByBlogInfo(provider_name, blog_id);

    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        for (var j = 0; j < group.length; j++) {
            var targetBlog = group[j].blog;
            var provider = group[j].provider;
            if (targetBlog.blog_id === blog_id && provider.providerName === provider_name) {
                log.debug('send_post_to_blogs: skip current blog id='+blog_id+' provider='+provider_name);
                //skip current blog
            }
            else {
                log.info('send_post_to_blogs: post id='+post.id+' to provider='+provider.providerName+
                                ' blog='+targetBlog.blog_id);
                BlogBot.request_post_content(user, post, provider.providerName, targetBlog.blog_id,
                        BlogBot.add_postinfo_to_db);
            }
        }
    }
};

/**
 *
 * @param {User} user
 * @param {Object} recv_posts
 */
BlogBot.push_posts_to_blogs = function(user, recv_posts) {
    "use strict";
    if (recv_posts === undefined)  {
        log.error("Fail to get recv_posts");
        return;
    }

    var postDb = BlogBot.findDbByUser(user, "post");

//TODO: if post count over max it need to extra update - aleckim
    for(var i=0; i<recv_posts.posts.length;i++) {
        var new_post = recv_posts.posts[i];
        if (postDb.find_post_by_post_id_of_blog(recv_posts.provider_name, recv_posts.blog_id, new_post.id)) {
            log.debug('this post was already saved - provider ' + recv_posts.provider_name + ' blog ' +
                            recv_posts.blog_id + ' post ' + new_post.id);
            continue;
        }

        BlogBot._makeTitle(new_post);
        postDb.add_post(recv_posts.provider_name, recv_posts.blog_id, new_post);
        BlogBot.request_get_posts(user, recv_posts.provider_name, recv_posts.blog_id, {"post_id":new_post.id},
            BlogBot.send_post_to_blogs);
        //push post to others blog and add_postinfo
    }
};

/**
 *
 * @param {User} user
 */
BlogBot.getAndPush = function(user) {
    "use strict";
    log.debug("start get blog of user" + user._id);
    var blogDb = BlogBot.findDbByUser(user, "blog");
    var postDb = BlogBot.findDbByUser(user, "post");
    var groupDb = BlogBot.findDbByUser(user, "group");
    var sites = blogDb.sites;
    var after = postDb.lastUpdateTime.toISOString();
    //log.debug(after);

    for (var i = 0; i < sites.length; i++) {
        for (var j = 0; j < sites[i].blogs.length; j++) {

            //if this blog was not grouped pass
            var groups = groupDb.findGroupByBlogInfo(sites[i].provider.providerName, sites[i].blogs[j].blog_id);
            if (groups.length === 0) {
               log.info("It has not group user="+user.id+" provider="+sites[i].provider.providerName +
                        " blog="+sites[i].blogs[j].blog_id);
               continue;
            }

            BlogBot.request_get_posts(user, sites[i].provider.providerName, sites[i].blogs[j].blog_id,
                    {"after": after}, BlogBot.push_posts_to_blogs);
        }
    }
    postDb.lastUpdateTime = new Date();
};

/**
 *
 */
BlogBot.task = function() {
    "use strict";
    log.info('Run BlogBot Task users=' + this.users.length);
    for (var i=0; i<this.users.length; i++)  {
        var user = this.users[i].user;
        BlogBot.getAndPush(user);
    }
};

/**
 *
 * @param {User} user
 */
BlogBot.start = function (user) {
    "use strict";
    var userInfo = {};
    var posts = [];
    var histories = [];
    var groups = [];

    log.debug("start BlogBot of user._id="+user._id);
    userInfo.user = user;

    SiteDb.findOne({userId:user._id}, function (err, siteDb) {
        if (err) {
            log.error("Fail to findOne of user._id" + user._id);
        }
        if (siteDb) {
            userInfo.blogDb = siteDb;
        }
        else {
            var newSite = new SiteDb();
            newSite.userId = user._id;
            userInfo.blogDb = newSite;

            newSite.save(function (err) {
                if (err) {
                    log.error("Fail to save new site");
                }
            });
            log.info("make new sitedb for user._id="+user._id);
        }
        //log.debug(userInfo.blogDb);
    });

    userInfo.groupDb = new GroupDb(groups);
    userInfo.postDb = new PostDb(posts);
    userInfo.postDb.lastUpdateTime = new Date();
    userInfo.historyDb = new HistoryDb(histories);
    this.users.push(userInfo);
};

/**
 *
 * @param {User} user
 * @returns {boolean}
 */
BlogBot.isStarted = function (user) {
    "use strict";
    var i;

    for(i=0; i<this.users.length; i++) {
        if (this.users[i]._id === user._id) {
            return true;
        }
    }

    log.debug("Fail to find user in blogBot");
    return false;
};

/**
 *
 * @param {User} user
 */
BlogBot.stop = function (user) {
    "use strict";

    log.debug("stop get blog of user " + user._id);
};

/**
 *
 * @param {User} user
 * @param {{provider: object, blogs: [{blogId: string, blogTitle: string, blogUrl: string}]}} recv_blogs
 */
BlogBot.add_blogs_to_db = function (user, recv_blogs) {
    "use strict";

    if (recv_blogs === undefined) {
        log.debug("add_blogs_to_db Fail to get recv_blogs");
        return;
    }

    var provider = recv_blogs.provider;
    var blogs = recv_blogs.blogs;
    var blogDb = BlogBot.findDbByUser(user, "blog");

    if (blogDb === undefined) {
        log.debug('add_blogs_to_db : Fail to find blogDb of user='+user._id);
        return;
    }

    //log.debug(provider);
    SiteDb.findOne({'userId': user._id}, function (err, siteDb) {
        var i;
        var site;

        if (err) {
            log.error("Fail to find db of user._id=", user._id);
            return err;
        }

        site = siteDb.findSiteByProvider(provider.providerName, provider.providerId);
        if (site) {
            for (i=0; i<blogs.length; i++) {
                var blog = siteDb.findBlogFromSite(site, blogs[i].blog_id);
                if (!blog) {
                    site.blogs.push(blogs[i]);
                    BlogBot.request_get_post_count(user, site.provider.providerName, blogs[i].blog_id,
                        BlogBot.add_posts_from_new_blog);
                }
            }
        }
        else {
            siteDb.sites.push({provider: provider, blogs: blogs});
            for (i=0; i<blogs.length; i++) {
                BlogBot.request_get_post_count(user, provider.providerName, blogs[i].blog_id,
                    BlogBot.add_posts_from_new_blog);
            }
        }
        siteDb.save(function(err) {
            if (err) {
                log.error("Fail to save siteDb");
            }
        });
        log.debug("provider Name=" + provider.providerName + " Id=" + provider.providerId);
    });
};

/**
 *
 * @param {User} user
 */
BlogBot.findOrCreate = function (user) {
    "use strict";
    var i;

    log.debug("find or create blog db of user " + user._id);

    for (i = 0; i<user.providers.length; i++)
    {
        var p = user.providers[i];
        BlogBot.request_get_bloglist(user, p.providerName, p.providerId, BlogBot.add_blogs_to_db);
    }
};

BlogBot.getSites = function (user) {
    "use strict";
    log.debug('BlogBot.getSites');
    return BlogBot.findDbByUser(user, "blog");
};

BlogBot.addGroup = function(user, group) {
    "use strict";
    var groupDb = BlogBot.findDbByUser(user, "group");
    groupDb.groups.push(group);
};

BlogBot.setGroups = function(user, groups) {
    "use strict";
    var groupDb = BlogBot.findDbByUser(user, "group");
    groupDb.groups = groups;
};

BlogBot.getGroups = function(user) {
    "use strict";
    var groupDb = BlogBot.findDbByUser(user, "group");
    return groupDb.groups;
};

/**
 *
 * @param user
 * @param recv_posts
 */
BlogBot.add_postinfo_to_db = function (user, recv_posts) {
    "use strict";
    if (recv_posts === undefined) {
        log.error("Fail to get recv_posts");
        return;
    }

    if (recv_posts.posts === undefined) {
        log.error("BlogBot.add_postinfo_to_db: Broken posts");
        return;
    }

    if (recv_posts.posts[0].title === undefined) {
        log.error("Fail to find title !!");
        //TODO content 및 다른 것으로 찾아서 넣는다.
        return;
    }

    var postDb = BlogBot.findDbByUser(user, "post");

    var post = postDb.find_post_by_title(recv_posts.posts[0].title);

    if (post === undefined) {
        log.error("Fail to found post by title"+recv_posts.posts[0].title);
        return;
    }

    postDb.add_postinfo(post, recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[0]);
    log.info("postDb.add_postinfo !!! ");
};

/**
 *
 * @param user
 * @param recv_posts
 */
BlogBot.add_posts_to_db = function(user, recv_posts) {
    "use strict";
    if (recv_posts === undefined) {
        log.error("Fail to get recv_posts");
        return;
    }

    log.debug('BlogBot.add_posts_to_db');

    var postDb = BlogBot.findDbByUser(user, "post");

    //TODO: change from title to id
    for(var i = 0; i<recv_posts.posts.length;i++) {

        BlogBot._makeTitle(recv_posts.posts[i]);

        //log.debug(recv_posts.posts[i]);
        if (recv_posts.posts[i].title !== undefined) {
            var post = postDb.find_post_by_title(recv_posts.posts[i].title);

            //log.debug(recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[i]);
            if (post) {
                postDb.add_postinfo(post, recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[i]);
                continue;
            }
        }

        postDb.add_post(recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[i]);
    }
};

/**
 *
 * @param user
 * @param provider_name
 * @param blog_id
 * @param options
 * @param {function} callback
 */
BlogBot.recursiveGetPosts = function(user, provider_name, blog_id, options, callback) {
    "use strict";

    BlogBot.request_get_posts(user, provider_name, blog_id, options, function (user, recv_posts) {

        log.debug("recursiveGetPosts: recv posts");

        callback(user, recv_posts);

        if (recv_posts === undefined) {
            log.error("Fail to get recv_posts");
            return;
        }
        if (recv_posts.posts === undefined) {
            log.error("Fail to get recv_posts.posts");
            return;
        }

        if (recv_posts.posts.length !== 0) {
            var index = recv_posts.posts.length-1;
            var new_opts = {};
            new_opts.offset = recv_posts.posts[index].id;
            log.debug("recursiveGetPosts: get posts");
            BlogBot.recursiveGetPosts(user, provider_name, blog_id, new_opts, callback);
        }
        else {
            log.info("Stop recursive call functions");
        }
    });
};

/**
 *
 * @param user
 * @param recv_post_count
 */
BlogBot.add_posts_from_new_blog = function(user, recv_post_count) {
    "use strict";
    log.debug('BlogBot.add_posts_from_new_blog');

    if (recv_post_count === undefined) {
        log.error("Fail to get recv_post_count");
        return;
    }

    var provider_name = recv_post_count.provider_name;
    var blog_id =  recv_post_count.blog_id;
    var post_count = recv_post_count.post_count;

    //how many posts get per 1 time.
    if (post_count > 0) {
        for (var i = 0; i < post_count; i += 20) {
            var offset = i + '-20';
            BlogBot.request_get_posts(user, provider_name, blog_id, {"offset": offset}, BlogBot.add_posts_to_db);
        }
    }
    else if (post_count < 0) {
        log.debug("post_count didn't supported");
        var options = {};
        BlogBot.recursiveGetPosts(user, provider_name, blog_id, options, BlogBot.add_posts_to_db);
    }
    //else for nothing

};

/**
 *
 * @param err
 * @param response
 * @param body
 * @returns {*}
 * @private
 */
function _checkError(err, response, body) {
    "use strict";
    if (err) {
        log.error(err);
        return err;
    }
    if (response.statusCode >= 400) {
        var errCode = body.meta ? body.meta.msg : body.error;
        var errStr = 'blogbot API error: ' + response.statusCode + ' ' + errCode;
        log.error(errStr);
        return new Error(errStr);
    }
}

/**
 *
 * @param user
 * @param {string} providerName
 * @param {string} providerId
 * @param {function} callback
 */
BlogBot.request_get_bloglist = function(user, providerName, providerId, callback) {
    "use strict";
    var url = "http://www.justwapps.com/" + providerName + "/bot_bloglist";
    url += "?";
    url += "providerid=" + providerId;
    url += "&";

    url += "userid=" + user._id;

    log.debug("url=" + url);
    request.get(url, function (err, response, body) {
        var hasError = _checkError(err, response, body);

        if (hasError !== undefined) {
            callback(hasError);
            return;
        }

        //log.debug(body);

        var recvBlogs = JSON.parse(body);

        callback(user, recvBlogs);
    });
};

/**
 *
 * @param user
 * @param {string} provider_name
 * @param {string} blog_id
 * @param {function} callback
 */
BlogBot.request_get_post_count = function(user, provider_name, blog_id, callback) {
    "use strict";
    var url;

    url = "http://www.justwapps.com/"+provider_name + "/bot_post_count/";
    url += blog_id;
    url += "?";
    url += "userid=" + user._id;

    log.debug("url="+url);
    request.get(url, function (err, response, body) {
        var hasError = _checkError(err, response, body);
        if (hasError !== undefined) {
            callback(hasError);
            return;
        }

        //log.debug(body);

        var recv_post_count = JSON.parse(body);

        callback(user, recv_post_count);
    });
};

/**
 *
 * @param user
 * @param {string} provider_name
 * @param blog_id
 * @param options
 * @param {function} callback
 */
BlogBot.request_get_posts = function(user, provider_name, blog_id, options, callback) {
    "use strict";

    var url = "http://www.justwapps.com/"+provider_name + "/bot_posts/";
    url += blog_id;

    if (options.post_id) {
        url += "/" + options.post_id;
    }

    url += "?";

    if (options.after) {
        url += "after=" + options.after;
        url += "&";
    }

    if (options.offset) {
        url += "offset="+options.offset;
        url += "&";
    }

    url += "userid=" + user._id;

    log.debug(url);
    request.get(url, function (err, response, body) {
        var hasError = _checkError(err, response, body);
        if (hasError !== undefined) {
            callback(hasError);
            return;
        }

        //log.debug(body);
        var recv_posts = JSON.parse(body);
        callback(user, recv_posts);
    });
};

/**
 *
 * @param user
 * @returns {Array}
 */
BlogBot.getHistories = function (user) {
    "use strict";
    var historyDb = BlogBot.findDbByUser(user, "history");
    var histories = [];

    if (historyDb === undefined) {
        log.error('Fail to find historyDb of userId='+user._id);
        return histories;
    }

    log.info('histories length='+historyDb.histories.length);
    return historyDb.histories;
};

/**
 *
 * @param user
 * @param srcPost
 * @param postStatus
 * @param dstPost
 */
BlogBot.addHistory = function(user, srcPost, postStatus, dstPost) {
    "use strict";
    var historyDb = BlogBot.findDbByUser(user, "history");
    log.debug('BlogBot.addHistory : userId='+ user._id);
    historyDb.addHistory(srcPost, postStatus, dstPost);
};

/**
 *
 * @param post
 * @private
 */
BlogBot._makeTitle = function (post) {
    "use strict";

    if (post.title !== undefined) {
        if (post.title.length > 0) {
            return;
        }
    }

    if (post.content !== undefined && post.content.length > 0) {

        var indexNewLine;

        indexNewLine= post.content.indexOf("\n");
        if (indexNewLine > 0) {
            if (indexNewLine < 30) {
                post.title = post.content.substr(0, indexNewLine);
            }
            else {
                post.title = post.content.substr(0, 27);
            }
        }
        else if (post.content.length < 30) {
           post.title = post.content;
        }
        else {
            post.title = post.content.substr(0,27);
        }

        return;
    }

    if (post.url !== undefined) {
        post.title = post.url;
        return;
    }

    if (post.id) {
        post.title = post.id;
    }

    log.error("Fail to make title!!!");
};

/**
 *
 * @param user
 * @param post
 * @param provider_name
 * @param blog_id
 * @param callback
 */
BlogBot.request_post_content = function (user, post, provider_name, blog_id, callback) {
    "use strict";
    var url;
    var opt;

    url = "http://www.justwapps.com/"+provider_name + "/bot_posts";
    url += "/new";
    url += "/"+encodeURIComponent(blog_id);
    url += "?";
    url += "userid=" + user._id;

    //send_data title, content, tags, categories
//    if (post.title == undefined) {
//        BlogBot._makeTitle(post);
//    }

    opt = { form: post };

    log.debug('post='+url);
    request.post(url, opt, function (err, response, body) {
        var hasError = _checkError(err, response, body);
        if (hasError !== undefined) {
            callback(hasError);
            return;
        }

        //add post info
        //log.debug(body);
        var recv_posts = JSON.parse(body);
        callback(user, recv_posts);

        if (recv_posts.posts === undefined) {
            BlogBot.addHistory(user, post, response.statusCode);
        }
        else {
            BlogBot.addHistory(user, post, response.statusCode, recv_posts.posts[0]);
        }
        //add success to history
    });
};

/**
 *
 * @param user
 * @returns {*}
 */
BlogBot.getPosts = function (user) {
    "use strict";
    var postDb;
    var posts = [];

    postDb = BlogBot.findDbByUser(user, "post");
    log.debug('BlogBot.getPosts : userid='+ user._id);
    if (postDb === undefined) {
        log.debug('Fail to find PostDb of user='+user._id);
        return posts;
    }
    log.debug('posts length='+postDb.posts.length);
    return postDb.posts;
};

//unused this functions
//BlogBot.getComments = function (socket, user, postID) {
//    log.debug('BlogBot.getComments : '+ user._id);
//    var userID = user._id;
//    //log.debug(user);
//    var p = user.providers[0];
//
////    var url = "http://www.justwapps.com/blog/blogCollectFeedback/posts/"+postID+"/comments";
////    url = url + "?userid=" + userId;
////    url = url + "&providerid=" + p.providerId;
////    log.debug("url="+url);
////    request.get(url, function (err, response, data) {
////        if(err) {
////            log.debug("Cannot get getComments : " + err);
////        }
////        log.debug("[BlogBot.getComments]" + data);
////        var jsonData = JSON.parse(data);
////        log.debug(jsonData);
////        socket.emit('comments', jsonData);
////    });
//};

/**
 *
 * @param user
 * @param postID
 * @param {functions} callback
 */
BlogBot.getReplies = function (user, postID, callback) {
    "use strict";
    var postDb;
    var post;

    postDb = BlogBot.findDbByUser(user, "post");
    post = postDb.find_post_by_id(postID);

    for (var i=0; i<post.infos.length; i++) {

        BlogBot.request_get_posts(user, post.infos[i].provider_name, post.infos[i].blog_id,
                        {"post_id":post.infos[i].post_id},
                        function (user, recv_posts) {

            if (recv_posts === undefined)  {
                log.error("Fail to get recv_posts");
                return;
            }

            if (recv_posts.posts === undefined)  {
                log.error("Fail to get recv_posts.posts");
                return;
            }

            var recv_post = recv_posts.posts[0];
            var send_data = {};
            send_data.providerName = recv_posts.provider_name;
            send_data.blogID = recv_posts.blog_id;
            send_data.postID = recv_post.id;
            send_data.replies = recv_post.replies;
            //log.debug(send_data);
            callback(send_data);
        });
    }
};

/**
 *
 * @param user
 * @param providerName
 * @param blogID
 * @param postID
 * @param {function} callback
 */
BlogBot.getRepliesByInfo = function (user, providerName, blogID, postID, callback) {
    "use strict";

    BlogBot.request_get_posts(user, providerName, blogID,
        {"post_id":postID},
        function (user, recv_posts) {

            if (recv_posts === undefined)  {
                log.error("Fail to get recv_posts");
                return;
            }

            if (recv_posts.posts === undefined)  {
                log.error("Fail to get recv_posts.posts");
                return;
            }

            var recv_post = recv_posts.posts[0];
            var send_data = {};
            send_data.providerName = recv_posts.provider_name;
            send_data.blogID = recv_posts.blog_id;
            send_data.postID = recv_post.id;
            send_data.replies = recv_post.replies;
            //log.debug(send_data);
            callback(send_data);
        });
};

module.exports = BlogBot;

