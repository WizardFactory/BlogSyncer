/**
 *
 * Created by aleckim on 2014. 8. 13..
 */

var request = require('request');
var log = require('winston');

var UserDb = require('../models/userdb');
var SiteDb = require('../models/blogdb');
var GroupDb = require('../models/groupdb');
var HistoryDb = require('../models/historydb');
var PostDb = require('../models/postdb');

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
 * @param user
 * @param dbName
 * @returns {Object|*}
 * @private
 */
BlogBot._findDbByUser = function (user, dbName) {
    "use strict";
    for (var i=0; i<this.users.length; i+=1) {
        if (this.users[i].user._id === user._id ||
            this.users[i].user._id.toString() === user._id.toString()) {
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

    log.error("Fail to find user._id="+user._id + " typeof=" + typeof user._id);
};

/**
 *
 * @param user
 * @param recvPosts
 * @private
 */
BlogBot._sendPostToBlogs = function (user, recvPosts) {
    "use strict";
    var groupDb;
    var blogId;
    var providerName;
    var post;
    var groups;
    var i;
    var group;
    var j;
    var targetBlog;
    var provider;
    var logStr;

    logStr = "[BlogBot] _sendPostToBlogs user=" + user._id + " =>";

    if (!recvPosts)  {
        log.error("Fail to get recvposts");
        return;
    }

    groupDb = BlogBot._findDbByUser(user, "group");
    blogId = recvPosts.blog_id;
    providerName = recvPosts.provider_name;
    post = recvPosts.posts[0];
    groups = groupDb.findGroupByBlogInfo(providerName, blogId);

    log.debug(logStr + providerName);

    for (i = 0; i<groups.length; i+=1) {
        group = groups[i].group;
        for (j=0; j<group.length; j+=1) {
            targetBlog = group[j].blog;
            provider = group[j].provider;
            if (targetBlog.blog_id === blogId && provider.providerName === providerName) {
                log.debug('sendposttoblogs: skip current blog id='+blogId+' provider='+providerName);
                //skip current blog
            }
            else {
                log.info('sendposttoblogs: post id='+post.id+' to provider='+provider.providerName+
                                ' blog='+targetBlog.blog_id);
                BlogBot._requestPostContent(user, post, provider.providerName, targetBlog.blog_id,
                        BlogBot._addPostInfoToDb);
            }
        }
    }
};

/**
 *
 * @param user
 * @param recvPosts
 * @private
 */
BlogBot._pushPostsToBlogs = function(user, recvPosts) {
    "use strict";
    var postDb;
    var i;
    var newPost;
    var postDbIsUpdated = false;
    var logStr;

    logStr = "[BlogBot] _pushPostsToBlogs user=" + user._id + " =>";

    if (!recvPosts)  {
        log.error("Fail to get recvposts");
        return;
    }

    postDb = BlogBot._findDbByUser(user, "post");

    log.debug(logStr + recvPosts.posts);

    if(!recvPosts.posts) {
        log.error("length is undefined !!!");
        return;
    }

//TODO: if post count over max it need to extra update - aleckim
    for(i=0; i<recvPosts.posts.length;i+=1) {
        newPost = recvPosts.posts[i];
        if (postDb.findPostByPostIdOfBlog(recvPosts.provider_name, recvPosts.blog_id, newPost.id)) {
            log.debug('this post was already saved - provider ' + recvPosts.provider_name + ' blog ' +
                            recvPosts.blog_id + ' post ' + newPost.id);
            continue;
        }

        BlogBot._makeTitle(newPost);
        postDb.addPost(recvPosts.provider_name, recvPosts.blog_id, newPost);
        postDbIsUpdated = true;
        BlogBot._requestGetPosts(user, recvPosts.provider_name, recvPosts.blog_id, {"post_id":newPost.id},
                    BlogBot._sendPostToBlogs);

        //push post to others blog and addPostInfo
    }

    //log.info(postDb.posts);
    if (postDbIsUpdated) {
        postDb.save(function (err) {
            if (err) {
                log.error("Fail to save postdb");
            }
            else {
                log.info("save is success");
            }
        });
    }
};

/**
 *
 * @param user
 * @private
 */
BlogBot._getAndPush = function(user) {
    "use strict";
    var blogDb;
    var postDb;
    var groupDb;
    var sites;
    var after;
    var i;
    var j;
    var groups;
    var options;

    log.debug("start get blog of user" + user._id);
    blogDb = BlogBot._findDbByUser(user, "blog");
    postDb = BlogBot._findDbByUser(user, "post");
    groupDb = BlogBot._findDbByUser(user, "group");

    if (!blogDb || !postDb || !groupDb) {
        log.error("blogbot _getandpush userId="+user._id+" Fail to find blogDb or postDb or groupDb");
        return;
    }

    sites = blogDb.sites;
    after = postDb.lastUpdateTime.toISOString();
    //log.debug(after);

    for (i=0; i<sites.length; i+=1) {
        for (j=0; j<sites[i].blogs.length; j+=1) {

            //if this blog was not grouped pass
            groups = groupDb.findGroupByBlogInfo(sites[i].provider.providerName, sites[i].blogs[j].blog_id);
            if (groups.length === 0) {
               log.info("It has not group user="+user._id+" provider="+sites[i].provider.providerName +
                        " blog="+sites[i].blogs[j].blog_id);
               continue;
            }

            BlogBot._requestGetPosts(user, sites[i].provider.providerName, sites[i].blogs[j].blog_id,
                {"after": after}, BlogBot._pushPostsToBlogs);
        }
    }
    postDb.lastUpdateTime = new Date();
};

/**
 *
 */
BlogBot.task = function() {
    "use strict";
    var i;
    var user;

    log.info('Run BlogBot Task users=' + this.users.length);
    for (i=0; i<this.users.length; i+=1)  {
        user = this.users[i].user;
        BlogBot._getAndPush(user);
    }
};

/**
 *
 */
BlogBot.load = function () {
    "use strict";

    UserDb.find({}, function(err, users) {
        var i;

        if (err) {
            log.error("Fail to find of users");
            return;
        }

        for (i=0; i<users.length; i+=1) {
            BlogBot.start(users[i]);
        }
    });
};

/**
 *
 * @param {User} user
 */
BlogBot.start = function (user) {
    "use strict";
    var userInfo;
    var newSiteDb;
    var newGroupDb;
    var newHistoryDb;
    var newPostDb;

    log.debug("start BlogBot of user._id="+user._id);
    userInfo = {};
    userInfo.user = user;

    SiteDb.findOne({userId:user._id}, function (err, siteDb) {
        if (err) {
            log.error("Fail to findOne of user._id=" + user._id);
            return;
        }
        if (siteDb) {
            userInfo.blogDb = siteDb;
        }
        else {
            newSiteDb = new SiteDb();
            newSiteDb.userId = user._id;
            userInfo.blogDb = newSiteDb;

            newSiteDb.save(function (err) {
                if (err) {
                    log.error("Fail to save new site");
                }
            });
            log.info("make new siteDb for user._id="+user._id);
            BlogBot.findOrCreate(user);
        }
    });

    GroupDb.findOne({userId:user._id}, function (err, groupDb) {
        if (err) {
            log.error("Fail to findOne of user._id="+user._id);
            return;
        }
        if (groupDb) {
            userInfo.groupDb = groupDb;
        }
        else {
            newGroupDb = new GroupDb();
            newGroupDb.userId = user._id;
            userInfo.groupDb = newGroupDb;
            newGroupDb.save(function (err) {
                if (err) {
                    log.error("Fail to save new group");
                }
            });
            log.info("make new groupDb for user._id="+user._id);
        }
    });

    HistoryDb.findOne({userId:user._id}, function (err, historyDb) {
        if (err) {
            log.error("Fail to findOne of user._id="+user._id);
            return;
        }
        if (historyDb) {
            userInfo.historyDb = historyDb;
        }
        else {
            newHistoryDb = new HistoryDb();
            newHistoryDb.userId = user._id;
            userInfo.historyDb = newHistoryDb;
            newHistoryDb.save(function (err) {
                if (err) {
                    log.error("Fail to save new group");
                }
            });
            log.info("make new historyDb for user._id="+user._id);
        }
    });

    PostDb.findOne({userId:user._id}, function (err, postDb) {
        if (err) {
            log.error("Fail to findOne of user._id="+user._id);
            return;
        }
        if (postDb) {
            userInfo.postDb = postDb;
        }
        else {
            newPostDb = new PostDb();
            newPostDb.userId = user._id;
            newPostDb.lastUpdateTime = new Date();
            newPostDb.posts = [];
            userInfo.postDb = newPostDb;
            newPostDb.save(function (err) {
                if (err) {
                    log.error("Fail to save new group");
                }
            });
            log.info("make new postdb for user._id="+user._id);
        }
    });

    this.users.push(userInfo);
};

/**
 *
 * @todo _id 비교문을 하나로 합치자.
 * @param {User} user
 * @returns {boolean}
 */
BlogBot.isStarted = function (user) {
    "use strict";
    var i;

    for(i=0; i<this.users.length; i+=1) {
        if (this.users[i].user._id === user._id ||
            this.users[i].user._id.toString() === user._id.toString()) {
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
 * @param {{provider: object, blogs: [{blogId: string, blogTitle: string, blogUrl: string}]}} recvBlogs
 * @private
 */
BlogBot._addBlogsToDb = function (user, recvBlogs) {
    "use strict";
    var provider;
    var blogs;
    var blogDb;
    var i;
    var site;
    var blog;
    var logStr;

    logStr = "[BlogBot] _addBlogsToDb user=" + user._id + " =>";

    if (!recvBlogs) {
        log.error("add blogs to db Fail to get recv_blogs");
        return;
    }

    provider = recvBlogs.provider;
    if (!provider) {
        log.error('add blogs to db : provider is undefined of user='+user._id);
        return;
    }
    blogs = recvBlogs.blogs;

    log.info(provider);
    log.info(blogs);

    blogDb = BlogBot._findDbByUser(user, "blog");
    if (!blogDb) {
        log.error('add blogs to db : Fail to find blogDb of user='+user._id);
        return;
    }

    site = blogDb.findSiteByProvider(provider.providerName, provider.providerId);
    if (site) {
        for (i=0; i<blogs.length; i+=1) {
            blog = blogDb.findBlogFromSite(site, blogs[i].blog_id);
            if (!blog) {
                site.blogs.push(blogs[i]);
                BlogBot._requestGetPostCount(user, site.provider.providerName, blogs[i].blog_id,
                    BlogBot._addPostsFromNewBlog);
            }
        }
    }
    else {
        blogDb.sites.push({"provider": provider, "blogs": blogs});
        for (i=0; i<blogs.length; i+=1) {
            BlogBot._requestGetPostCount(user, provider.providerName, blogs[i].blog_id,
                BlogBot._addPostsFromNewBlog);
        }
    }
    blogDb.save(function(err) {
        if (err) {
            log.error("Fail to save siteDb");
        }
    });
    log.debug("provider Name=" + provider.providerName + " Id=" + provider.providerId);
};

/**
 *
 * @param {User} user
 */
BlogBot.findOrCreate = function (user) {
    "use strict";
    var i;
    var p;

    log.debug("find or create blog db of user " + user._id);

    for (i=0; i<user.providers.length; i+=1)
    {
        p = user.providers[i];
        BlogBot._requestGetBloglist(user, p.providerName, p.providerId, BlogBot._addBlogsToDb);
    }
};

/**
 *
 * @param user
 * @returns {Object|*}
 */
BlogBot.getSites = function (user) {
    "use strict";
    log.debug('BlogBot.getSites');
    return BlogBot._findDbByUser(user, "blog");
};

/**
 *
 * @param user
 * @param group
 */
BlogBot.addGroup = function(user, group) {
    "use strict";
    var groupDb;

    if (!group) {
        log.error("group is undefined of user._id=", user._uid);
    }

    log.info("group len="+group.length);
    groupDb = BlogBot._findDbByUser(user, "group");
    groupDb.groups.push({"group":group});
    groupDb.save(function (err) {
       if (err)  {
           log.error("Fail to save group in addGroup");
           log.error(err);
       }
    });
};

/**
 *
 * @param user
 * @param groups
 */
BlogBot.setGroups = function(user, groups) {
    "use strict";
    var groupDb = BlogBot._findDbByUser(user, "group");
    groupDb.groups = groups;
    groupDb.save(function (err) {
        if (err)  {
            log.error("Fail to save group in addGroup");
        }
    });
};

/**
 *
 * @param user
 * @returns {groupSchema.groups|*|groups|Array}
 */
BlogBot.getGroups = function(user) {
    "use strict";
    var groupDb = BlogBot._findDbByUser(user, "group");
    return groupDb.groups;
};

/**
 *
 * @param user
 * @param recvPosts
 * @private
 */
BlogBot._addPostInfoToDb = function (user, recvPosts) {
    "use strict";
    var postDb;
    var post;

    if (!recvPosts) {
        log.error("Fail to get recv_posts");
        return;
    }

    if (!recvPosts.posts) {
        log.error("blogbot addpostinfotodb: Broken posts");
        return;
    }

    if (!recvPosts.posts[0].title) {
        log.error("Fail to find title !!");
        //TODO content 및 다른 것으로 찾아서 넣는다.
        return;
    }

    postDb = BlogBot._findDbByUser(user, "post");

    post = postDb.findPostByTitle(recvPosts.posts[0].title);
    if (!post) {
        log.error("Fail to found post by title"+recvPosts.posts[0].title);
        return;
    }

    postDb.addPostInfo(post, recvPosts.provider_name, recvPosts.blog_id, recvPosts.posts[0]);
    postDb.save(function (err) {
        if (err) {
            log.error("Fail to save postDb");
        }
    });

    log.info("postdb.addpostinfo !!! ");
};

/**
 *
 * @param user
 * @param recvPosts
 * @private
 */
BlogBot._addPostsToDb = function(user, recvPosts) {
    "use strict";
    var postDb;
    var i;
    var post;

    if (!recvPosts || !recvPosts.posts) {
        log.error("Fail to get recv posts");
        return;
    }

    log.debug('blogbot add posts to db');

    postDb = BlogBot._findDbByUser(user, "post");

    //TODO: change from title to id
    for (i=0; i<recvPosts.posts.length; i+=1) {

        BlogBot._makeTitle(recvPosts.posts[i]);

        //log.debug(recv posts.posts[i]);
        if (recvPosts.posts[i].title) {
            post = postDb.findPostByTitle(recvPosts.posts[i].title);

            //log.debug(recv posts.provider_name, recv posts.blog_id, recv posts.posts[i]);
            if (post) {
                postDb.addPostInfo(post, recvPosts.provider_name, recvPosts.blog_id, recvPosts.posts[i]);
                continue;
            }
        }

        postDb.addPost(recvPosts.provider_name, recvPosts.blog_id, recvPosts.posts[i]);
    }

    postDb.save(function (err) {
        if (err) {
            log.error("Fail to save postDb");
        }
    });
};

/**
 *
 * @param user
 * @param providerName
 * @param blogId
 * @param options
 * @param {function} callback - _addPostsToDb
 * @private
 */
BlogBot._recursiveGetPosts = function(user, providerName, blogId, options, callback) {
    "use strict";
    var index;
    var newOpts;

    BlogBot._requestGetPosts(user, providerName, blogId, options, function (user, recvPosts) {

        log.debug("recursive get posts: recv posts");

        if (!recvPosts) {
            log.error("Fail to get recv_posts");
            return;
        }
        if (!recvPosts.posts) {
            log.error("Fail to get recv_posts.posts");
            return;
        }

        callback(user, recvPosts);

        index = recvPosts.posts.length-1;
        newOpts = {};

        if(providerName === "twitter") {
            if (recvPosts.stopReculsive === false) {
                newOpts.offset = recvPosts.posts[index].id;
                log.debug("[Twitter] _recursiveGetPosts: get posts");
                BlogBot._recursiveGetPosts(user, providerName, blogId, newOpts, callback);
            }
            else {
                log.info("[Twitter] Stop recursive call functions");
            }
        }
        else {
            if (recvPosts.posts.length) {
                if (options.offset) {
                    newOpts.offset = options.offset;
                }
                else {
                    //for kakao
                    newOpts.offset = recvPosts.posts[index].id;
                }
                //for google
                if (recvPosts.nextPageToken) {
                    newOpts.nextPageToken = recvPosts.nextPageToken;
                }
                if (options.nextPageToken) {
                    if (!recvPosts.nextPageToken) {
                        //it's last page.
                        return;
                    }
                }

                log.debug("_recursiveGetPosts: get posts");
                BlogBot._recursiveGetPosts(user, providerName, blogId, newOpts, callback);
            }
            else {
                if (recvPosts.posts.length !== 0) {
                    newOpts.offset = recvPosts.posts[index].id;
                    log.debug("_recursiveGetPosts: get posts");
                    BlogBot._recursiveGetPosts(user, providerName, blogId, newOpts, callback);
                }
                else {
                    log.info("Stop recursive call functions");
                }
            }
        }
    });
};

/**
 *
 * @param user
 * @param recvPostCount
 * @private
 */
BlogBot._addPostsFromNewBlog = function(user, recvPostCount) {
    "use strict";
    var providerName;
    var blogId;
    var postCount;
    var i;
    var offset;
    var options;

    log.debug('blogbot add posts from new blog');

    if (!recvPostCount) {
        log.error("Fail to get recv post count");
        return;
    }

    providerName = recvPostCount.provider_name;
    blogId =  recvPostCount.blog_id;
    postCount = recvPostCount.post_count;

    //how many posts get per 1 time.
    /* Todo : 모두 하나로 통일 필요. */
    if (providerName === 'google') {
        options = {};
        options.offset = '0-20'; //page count isn't used
        BlogBot._recursiveGetPosts(user, providerName, blogId, options, BlogBot._addPostsToDb);
    }
    else if(providerName === "twitter") {
        // twitter use max_id, so recursiveGetPosts must be called.
        options = {};
        BlogBot._recursiveGetPosts(user, providerName, blogId, options, BlogBot._addPostsToDb);
    }
    else if (postCount < 0) {
        log.debug("post_count didn't supported");
        options = {};
        BlogBot._recursiveGetPosts(user, providerName, blogId, options, BlogBot._addPostsToDb);
    }
    else if (postCount > 0) {
        for (i=0; i<postCount; i+=20) {
            offset = i + '-20';
            BlogBot._requestGetPosts(user, providerName, blogId, {"offset": offset}, BlogBot._addPostsToDb);
        }
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
    var errCode;
    var errStr;

    if (err) {
        log.error(err);
        return err;
    }
    if (response.statusCode >= 400) {
        errCode = body.meta ? body.meta.msg : body.error;
        errStr = 'blogbot API error: ' + response.statusCode + ' ' + errCode;
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
 * @private
 */
BlogBot._requestGetBloglist = function(user, providerName, providerId, callback) {
    "use strict";
    var url;

    url = "http://www.justwapps.com/" + providerName + "/bot_bloglist";
    url += "?";
    url += "providerid=" + providerId;
    url += "&";

    url += "userid=" + user._id;

    log.debug("url=" + url);
    request.get(url, function (err, response, body) {
        var hasError;
        var recvBlogs;

        hasError = _checkError(err, response, body);
        if (hasError) {
            callback(hasError);
            return;
        }

        //log.debug(body);

        recvBlogs = JSON.parse(body);

        callback(user, recvBlogs);
    });
};

/**
 *
 * @param user
 * @param {string} providerName
 * @param {string} blogId
 * @param {function} callback
 * @private
 */
BlogBot._requestGetPostCount = function(user, providerName, blogId, callback) {
    "use strict";
    var url;

    url = "http://www.justwapps.com/"+providerName + "/bot_post_count/";
    url += blogId;
    url += "?";
    url += "userid=" + user._id;

    log.debug("url="+url);

    request.get(url, function (err, response, body) {
        var hasError;
        var recvPostCount;

        hasError= _checkError(err, response, body);
        if (hasError) {
            callback(hasError);
            return;
        }

        //log.debug(body);

        recvPostCount = JSON.parse(body);

        callback(user, recvPostCount);
    });
};

/**
 *
 * @param user
 * @param {string} providerName
 * @param {string} blogId
 * @param {Object} options
 * @param {function} callback
 * @private
 */
BlogBot._requestGetPosts = function(user, providerName, blogId, options, callback) {
    "use strict";

    var url = "http://www.justwapps.com/"+providerName + "/bot_posts/";
    url += blogId;

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
    if (options.nextPageToken) {
        url += "nextPageToken="+options.nextPageToken;
        url += "&";
    }

    url += "userid=" + user._id;

    log.debug(url);
    request.get(url, function (err, response, body) {
        var hasError;
        var recvPosts;

        hasError= _checkError(err, response, body);
        if (hasError) {
            callback(hasError);
            return;
        }

        //log.debug(body);
        recvPosts = JSON.parse(body);
        callback(user, recvPosts);
    });
};

/**
 *
 * @param user
 * @returns {Array}
 */
BlogBot.getHistories = function (user) {
    "use strict";
    var historyDb;

    historyDb = BlogBot._findDbByUser(user, "history");
    if (historyDb) {
        log.info('histories length='+historyDb.histories.length);
        return historyDb.histories;
    }
    else {
        log.error('Fail to find historyDb of user='+user._id);
    }
};

/**
 *
 * @param user
 * @param srcPost
 * @param postStatus
 * @param dstPost
 * @private
 */
BlogBot._addHistory = function(user, srcPost, postStatus, dstPost) {
    "use strict";
    var history;
    var historyDb;
    var src;
    var dst;

    log.debug('blogbot add history : userId='+ user._id);
    historyDb = BlogBot._findDbByUser(user, "history");

    if (srcPost) {
        src = {};
        src.title = srcPost.title;
        src.id = srcPost.id;
        src.url = srcPost.url;
    }
    if (dstPost) {
        dst = {};
        dst.id = dstPost.id;
        dst.url = dstPost.url;
    }

    history = {};
    history.tryTime = new Date();
    history.status = postStatus;
    history.src = src;
    history.dst = dst;

    historyDb.histories.push(history);
    historyDb.save(function (err) {
       if (err)  {
           log.error("Fail to save history in add history");
           log.error(err);
       }
    });
};

/**
 *
 * @param post
 * @private
 */
BlogBot._makeTitle = function (post) {
    "use strict";
    var indexNewLine;

    if (post.title) {
        if (post.title.length > 0) {
            return;
        }
    }

    if (post.content && post.content.length > 0) {

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

    if (post.url) {
        post.title = post.url;
        log.debug("The name was copied from url");
        return;
    }

    if (post.id) {
        post.title = post.id;
        log.debug("The name was copied from id");
        return;
    }

    log.error("Fail to make title!!!");
};

/**
 *
 * @param user
 * @param post
 * @param providerName
 * @param blogId
 * @param callback
 * @private
 */
BlogBot._requestPostContent = function (user, post, providerName, blogId, callback) {
    "use strict";
    var url;
    var opt;

    url = "http://www.justwapps.com/"+providerName + "/bot_posts";
    url += "/new";
    url += "/"+encodeURIComponent(blogId);
    url += "?";
    url += "userid=" + user._id;

    //send_data title, content, tags, categories
//    if (!post.title) {
//        BlogBot._makeTitle(post);
//    }

    opt = { form: post };

    log.debug('post='+url);
    request.post(url, opt, function (err, response, body) {
        var hasError;
        var recvPosts;

        hasError = _checkError(err, response, body);
        if (hasError) {
            callback(hasError);
            return;
        }

        //add post info
        //log.debug(body);
        recvPosts = JSON.parse(body);
        callback(user, recvPosts);

        if (recvPosts.posts) {
            BlogBot._addHistory(user, post, response.statusCode, recvPosts.posts[0]);
        }
        else {
            BlogBot._addHistory(user, post, response.statusCode);
        }
    });
};

/**
 *
 * @param {object} postDb
 * @param {number} reqStartNum
 * @param {number} reqTotalCnt
 * @returns {{}}
 * @private
 */
BlogBot._getParsedPostDb = function (postDb, reqStartNum, reqTotalCnt) {
    "use strict";

    var parsePostDb;
    var rangeStartNum = reqStartNum;
    var rangeTotalNum = reqTotalCnt;
    var rangeLastNum;
    var j;

    parsePostDb = {};
    parsePostDb.posts = [];
    rangeLastNum = rangeStartNum + rangeTotalNum;

    for (j=reqStartNum; j<rangeLastNum; j+=1 ) {
        if(!postDb.posts[j]) {
            break;
        }

        parsePostDb.posts.push(postDb.posts[j]);
    }

    return parsePostDb;
};

/**
 *
 * @param user
 * @param startNum
 * @param totalNum
 * @returns {*|Array}
 */
BlogBot.getPosts = function (user, startNum, totalNum) {
    "use strict";
    var postDb;
    var parsedPostDb;

    postDb = BlogBot._findDbByUser(user, "post");
    log.debug("total posts.length="+postDb.posts.length);
    parsedPostDb = BlogBot._getParsedPostDb(postDb, Number(startNum), Number(totalNum));

    log.debug('blogbot get posts : userid='+ user._id + ', startNum=' + startNum + ', totalNum=' + totalNum);

    if (parsedPostDb) {
        log.debug('posts length='+parsedPostDb.posts.length);
        return parsedPostDb.posts;
    }

    log.error('Fail to find PostDb of user='+user._id);
};

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
    var i;

    postDb = BlogBot._findDbByUser(user, "post");
    post = postDb.findPostById(postID);

    for (i=0; i<post.infos.length; i+=1) {
        BlogBot._requestGetPosts(user, post.infos[i].provider_name, post.infos[i].blog_id,
            {"post_id":post.infos[i].post_id},
            function (user, recvPosts) {
                var recvPost;
                var sendData;
                var errMsg;

                if (!recvPosts)  {
                    errMsg = "Fail to get recv_posts";
                    log.error(errMsg);

                    //user is hasError
                    callback(user);
                    return;
                }

                if (!recvPosts.posts)  {
                    errMsg = "Fail to get posts of recv_posts";
                    log.error(errMsg);
                    callback(errMsg);
                    return;
                }

                recvPost = recvPosts.posts[0];
                sendData = {};
                sendData.providerName = recvPosts.provider_name;
                sendData.blogID = recvPosts.blog_id;
                sendData.postID = recvPost.id;
                sendData.replies = recvPost.replies;

                //log.debug(send_data);
                callback(sendData);
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

    BlogBot._requestGetPosts(user, providerName, blogID, {"post_id":postID},
        function (userOrError, recvPosts) {
            var recvPost;
            var sendData;
            var errMsg;

            errMsg = "blogbot get_replies_by_info user=" + user._id + " ";
            if (!recvPosts)  {
                errMsg += "Fail to get recv posts";
                log.error(errMsg);
                callback();
                return;
            }

            if (!recvPosts.posts)  {
                errMsg += "Fail to get posts of recvposts";
                log.error(errMsg);
                callback();
                return;
            }

            recvPost = recvPosts.posts[0];
            sendData = {};
            sendData.providerName = recvPosts.provider_name;
            sendData.blogID = recvPosts.blog_id;
            sendData.postID = recvPost.id;
            sendData.replies = recvPost.replies;

            //log.debug(sendData);
            callback(sendData);
        });
};

module.exports = BlogBot;

