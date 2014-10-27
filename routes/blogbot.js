/**
 *
 * Created by aleckim on 2014. 8. 13..
 */

var request = require('request');
var blogdb = require('../models/blogdb');
var postdb = require('../models/postdb');
var historydb = require('../models/historydb');
var groupdb = require('../models/groupdb');

var log = require('winston');

function BlogBot() {
}

BlogBot.users = [];
/*
    [
        { "user":object, "blogdb":blogdb, "postdb":postdb, "historydb":historydb },
        { "user":object, "blogdb":blogdb, "postdb":postdb, "historydb":historydb },
    ]
 */

BlogBot.findBlogDbByUser = function(user) {
    for (var i=0; i<this.users.length; i++) {
        if (this.users[i].user._id == user._id) {
            return this.users[i].blogDb;
        }
    }
    log.debug('users='+this.users.length);
    log.debug('Fail to find user '+user._id);
};

BlogBot.findPostDbByUser = function(user) {
    for (var i=0; i<this.users.length; i++) {

        //left is object, right is string from frontend
        if (this.users[i].user._id == user._id) {
            return this.users[i].postDb;
        }
    }

    log.error("Fail to find post db by user");
};

BlogBot.findHistoryDbByUser = function(user) {
    for (var i=0; i<this.users.length; i++) {

        //left is object, right is string from frontend
        if (this.users[i].user._id == user._id) {
            return this.users[i].historyDb;
        }
    }

    log.error("Fail to find history db by user");
};

BlogBot.findGroupDbByUser = function(user) {
    for (var i=0; i<this.users.length; i++) {

        //left is object, right is string from frontend
        if (this.users[i].user._id == user._id) {
            return this.users[i].groupDb;
        }
    }

    log.error("Fail to find group db by user");
};

BlogBot.send_post_to_blogs = function (user, recv_posts) {

    if (recv_posts === undefined)  {
        log.error("Fail to get recv_posts");
        return;
    }

    var groupDb = BlogBot.findGroupDbByUser(user);
    var blog_id = recv_posts.blog_id;
    var provider_name = recv_posts.provider_name;
    var post = recv_posts.posts[0];
    var groups = groupDb.findGroupByBlogInfo(provider_name, blog_id);

    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        for (var j = 0; j < group.length; j++) {
            var targetBlog = group[j].blog;
            var provider = group[j].provider;
            if (targetBlog.blog_id == blog_id && provider.providerName == provider_name) {
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

BlogBot.push_posts_to_blogs = function(user, recv_posts) {

    if (recv_posts === undefined)  {
        log.error("Fail to get recv_posts");
        return;
    }

    var postDb = BlogBot.findPostDbByUser(user);

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

BlogBot.getAndPush = function(user) {
    log.debug("start get blog of user" + user.id);
    var blogDb = BlogBot.findBlogDbByUser(user);
    var postDb = BlogBot.findPostDbByUser(user);
    var groupDb = BlogBot.findGroupDbByUser(user);
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

BlogBot.task = function() {
    log.info('Run BlogBot Task users=' + this.users.length);
    for (var i=0; i<this.users.length; i++)  {
        var user = this.users[i].user;
        BlogBot.getAndPush(user);
    }
//    var post = {};
//    post.title = "justwapps test";
//    post.content = "it is for test of justwapps";
//    post.tags = "justwapps, api";
//    post.categories ="development";
//    BlogBot.request_post_content(this.users[0].user, post, "tistory", "aleckim", BlogBot.add_postinfo_to_db);
};

BlogBot.start = function (user) {
    log.debug("start BlogBot");
    var userInfo = {};
    userInfo.user = user;
    var sites = [];
    userInfo.blogDb = new blogdb(sites);
    log.debug(userInfo.blogDb);
    var posts = [];
    userInfo.postDb = new postdb(posts);
    userInfo.postDb.lastUpdateTime = new Date();
    var histories = [];
    userInfo.historyDb = new historydb(histories);
    var groups = [];
    userInfo.groupDb = new groupdb(groups);
    this.users.push(userInfo);
};

BlogBot.isStarted = function (user) {
    var i;

    for(i=0; i<this.users.length; i++) {
        if (this.users[i]._id === user._id) {
            return true;
        }
    }

    log.debug("Fail to find user in blogBot");
    return false;
};

BlogBot.stop = function (user) {
    log.debug("stop get blog of user " + user.id);
};

BlogBot.add_blogs_to_db = function (user, recv_blogs) {

    /*
     { "provider":object, "blogs":
                            [ {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
                              {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] },
     */

    var i = 0;

    if (recv_blogs == undefined) {
        log.debug("add_blogs_to_db Fail to get recv_blogs");
        return;
    }

    var provider = recv_blogs.provider;
    var blogs = recv_blogs.blogs;
    var blogDb = BlogBot.findBlogDbByUser(user);

    if (blogDb == undefined) {
        log.debug('add_blogs_to_db : Fail to find blogDb of user='+user._id);
        return;
    }

    //log.debug(provider);
    var site = blogDb.findSiteByProvider(provider.providerName);

    if (site) {
        for (i = 0; i<blogs.length; i++) {
            var blog = blogDb.find_blog_by_blog_id(site, blogs[i].blog_id);
            if (!blog) {
                site.blogs.push(blogs[i]);
                BlogBot.request_get_post_count(user, site.provider.providerName, blogs[i].blog_id,
                                BlogBot.add_posts_from_new_blog);
            }
        }
    }
    else {
        site = blogDb.addProvider(provider, blogs);
        for (i = 0; i < site.blogs.length; i++) {
            BlogBot.request_get_post_count(user, site.provider.providerName, site.blogs[i].blog_id,
                            BlogBot.add_posts_from_new_blog);
        }
    }

    log.debug('site providerName=' + site.provider.providerName);
//    for (var j = 0; j < site.blogs.length; j++) {
//        log.debug(site.blogs[j]);
//    }
};

BlogBot.findOrCreate = function (user) {
    var i;

    log.debug("find or create blog db of user " + user._id);

    for (i = 0; i < user.providers.length; i++)
    {
        var p = user.providers[i];
        BlogBot.request_get_bloglist(user, p.providerName, p.providerId, BlogBot.add_blogs_to_db);
    }
};

BlogBot.getSites = function (user) {
    log.debug('BlogBot.getSites');
    return BlogBot.findBlogDbByUser(user);
};

BlogBot.addGroup = function(user, group) {
    var groupDb = BlogBot.findGroupDbByUser(user);
    groupDb.groups.push(group);
};

BlogBot.setGroups = function(user, groups) {
    var groupDb = BlogBot.findGroupDbByUser(user);
    groupDb.groups = groups;
};

BlogBot.getGroups = function(user) {
    var groupDb = BlogBot.findGroupDbByUser(user);
    return groupDb.groups;
};

BlogBot.add_postinfo_to_db = function (user, recv_posts) {
    if (recv_posts == undefined) {
        log.error("Fail to get recv_posts");
        return;
    }

    if (recv_posts.posts == undefined) {
        log.error("BlogBot.add_postinfo_to_db: Broken posts");
        return;
    }

    if (recv_posts.posts[0].title == undefined) {
        log.error("Fail to find title !!");
        //TODO content 및 다른 것으로 찾아서 넣는다.
        return;
    }

    var postDb = BlogBot.findPostDbByUser(user);

    var post = postDb.find_post_by_title(recv_posts.posts[0].title);

    if (post == undefined) {
        log.error("Fail to found post by title"+recv_posts.posts[0].title);
        return;
    }

    postDb.add_postinfo(post, recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[0]);
    log.info("postDb.add_postinfo !!! ");
};

BlogBot.add_posts_to_db = function(user, recv_posts) {
    if (recv_posts === undefined) {
        log.error("Fail to get recv_posts");
        return;
    }

    log.debug('BlogBot.add_posts_to_db');

    var postDb = BlogBot.findPostDbByUser(user);

    //TODO: change from title to id
    for(var i = 0; i<recv_posts.posts.length;i++) {

        BlogBot._makeTitle(recv_posts.posts[i]);
        //log.debug(recv_posts.posts[i]);

        if (recv_posts.posts[i].title != undefined) {
            var post = postDb.find_post_by_title(recv_posts.posts[i].title);

            //log.debug(recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[i]);
            if (post) {
                postDb.add_postinfo(post, recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[i]);
                continue;
            }
        }

        postDb.add_post(recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[i]);
    }

    //postDb.saveFile();
};

BlogBot.recursiveGetPosts = function(user, provider_name, blog_id, options, callback) {
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

        if (recv_posts.posts.length != 0) {
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

BlogBot.add_posts_from_new_blog = function(user, recv_post_count) {

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

function _checkError(err, response, body) {
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

BlogBot.request_get_bloglist = function(user, providerName, providerId, callback) {
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

BlogBot.request_get_post_count = function(user, provider_name, blog_id, callback) {
    var url = "http://www.justwapps.com/"+provider_name + "/bot_post_count/";
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

BlogBot.request_get_posts = function(user, provider_name, blog_id, options, callback) {
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

BlogBot.getHistories = function (user) {

    var historyDb = BlogBot.findHistoryDbByUser(user);
    var histories = [];
    if (historyDb == undefined) {
        log.error('Fail to find historyDb of userId='+user._id);
        return histories;
    }

    log.info('histories length='+historyDb.histories.length);
    return historyDb.histories;
};

BlogBot.addHistory = function(user, srcPost, postStatus, dstPost) {
    var historyDb = BlogBot.findHistoryDbByUser(user);
    log.debug('BlogBot.addHistory : userId='+ user._id);
    historyDb.addHistory(srcPost, postStatus, dstPost);
};

BlogBot._makeTitle = function (post) {

    if (post.title != undefined) {
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

BlogBot.request_post_content = function (user, post, provider_name, blog_id, callback) {
    var url = "http://www.justwapps.com/"+provider_name + "/bot_posts";
    url += "/new";
    url += "/"+encodeURIComponent(blog_id);
    url += "?";
    url += "userid=" + user._id;

    //send_data title, content, tags, categories
//    if (post.title == undefined) {
//        BlogBot._makeTitle(post);
//    }

    var opt = { form: post };

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

        if (recv_posts.posts == undefined) {
            BlogBot.addHistory(user, post, response.statusCode);
        }
        else {
            BlogBot.addHistory(user, post, response.statusCode, recv_posts.posts[0]);
        }
        //add success to history
    });
};

/*****************************************************/
BlogBot.getPosts = function (user) {

    var postDb = BlogBot.findPostDbByUser(user);
    var posts = [];
    log.debug('BlogBot.getPosts : userid='+ user._id);
    if (postDb === undefined) {
        log.debug('Fail to find postdb of user='+user._id);
        return posts;
    }

    //var userID = this.user._id;
    //log.debug(this.user);
//    var p = this.user.providers[0];
//    var url = "http://www.justwapps.com/blog/blogCollectFeedback/posts";
//    url = url + "?userid=" + this.user.id;
//    url = url + "&providerid=" + p.providerId;
//    log.debug("url="+url);
//    request.get(url, function (err, response, body) {
//      var hasError = _checkError(err, response, body);
//      if (hasError !== undefined) {
//        callback(hasError);
//        return;
//      }
//        log.debug("[BlogBot.getPosts]" + body);
//        var jsonData = JSON.parse(body);
//        log.debug(jsonData);
//        socket.emit('posts', jsonData);
//    });

    log.debug('posts length='+postDb.posts.length);
    return postDb.posts;
};

//unused this functions
BlogBot.getComments = function (socket, user, postID) {
    log.debug('BlogBot.getComments : '+ user._id);
    var userID = user._id;
    //log.debug(user);
    var p = user.providers[0];

//    var url = "http://www.justwapps.com/blog/blogCollectFeedback/posts/"+postID+"/comments";
//    url = url + "?userid=" + userId;
//    url = url + "&providerid=" + p.providerId;
//    log.debug("url="+url);
//    request.get(url, function (err, response, data) {
//        if(err) {
//            log.debug("Cannot get getComments : " + err);
//        }
//        log.debug("[BlogBot.getComments]" + data);
//        var jsonData = JSON.parse(data);
//        log.debug(jsonData);
//        socket.emit('comments', jsonData);
//    });
};

BlogBot.getReplies = function (user, postID, callback) {
    var postDb = BlogBot.findPostDbByUser(user);
    var post = postDb.find_post_by_id(postID);

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


BlogBot.getRepliesByInfo = function (user, providerName, blogID, postID, callback) {

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

