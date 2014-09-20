/**
 *
 * Created by aleckim on 2014. 8. 13..
 */

var request = require('request');
var blogdb = require('../models/blogdb');
var postdb = require('../models/postdb');
var historydb = require('../models/historydb');

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
        if (this.users[i].user.id === user.id) {
            return this.users[i].blogDb;
        }
    }
    console.log('users='+this.users.length);
    console.log('Fail to find user '+user.id);
};

BlogBot.findPostDbByUser = function(user) {
    for (var i=0; i<this.users.length; i++) {
        if (this.users[i].user.id === user.id) {
            return this.users[i].postDb;
        }
    }
};

BlogBot.findHistoryDbByUser = function(user) {
    for (var i=0; i<this.users.length; i++) {
        if (this.users[i].user.id === user.id) {
            return this.users[i].historyDb;
        }
    }
};

BlogBot.send_post_to_blogs = function (user, recv_posts) {
    var blogDb = BlogBot.findBlogDbByUser(user);
    var sites = blogDb.sites;
    var blog_id = recv_posts.blog_id;
    var provider_name = recv_posts.provider_name;
    var post = recv_posts.posts[0];

    for (var i = 0; i < sites.length; i++) {
        for (var j = 0; j < sites[i].blogs.length; j++) {
            target_blog = sites[i].blogs[j];
            if (target_blog.blog_id == blog_id && sites[i].provider.providerName == provider_name) {
                console.log('send_post_to_blogs: skip current blog id='+blog_id+' provider='+provider_name);
                //skip current blog
            }
            else {
                console.log('send_post_to_blogs: post id='+post.id+' to provider='+sites[i].provider.providerName+
                                ' blog='+target_blog.blog_id);
                BlogBot.request_post_content(user, post, sites[i].provider.providerName, target_blog.blog_id,
                                BlogBot.add_postinfo_to_db);
            }
        }
    }

    return;
};

BlogBot.push_posts_to_blogs = function(user, recv_posts) {
    var postDb = BlogBot.findPostDbByUser(user);
//TODO: if post count over max it need to extra update - aleckim
    for(var i=0; i<recv_posts.posts.length;i++) {
        var new_post = recv_posts.posts[i];
        if (postDb.find_post_by_post_id_of_blog(recv_posts.provider_name, recv_posts.blog_id, new_post.id)) {
            console.log('this post was already saved - provider ' + recv_posts.provider_name + ' blog ' +
                            recv_posts.blog_id + ' post ' + new_post.id);
        }
        else {
            BlogBot._makeTitle(new_post);
            postDb.add_post(recv_posts.provider_name, recv_posts.blog_id, new_post);
            BlogBot.request_get_posts(user, recv_posts.provider_name, recv_posts.blog_id, {"post_id":new_post.id},
                            BlogBot.send_post_to_blogs);
            //push post to others blog and add_postinfo
        }
    }

    return;
};

BlogBot.getAndPush = function(user) {
    console.log("start get blog of user" + user.id);
    var blogDb = BlogBot.findBlogDbByUser(user);
    var postDb = BlogBot.findPostDbByUser(user);
    var sites = blogDb.sites;
    var after = postDb.lastUpdateTime.toISOString();
    console.log(after);

    for (var i = 0; i < sites.length; i++) {
        for (var j = 0; j < sites[i].blogs.length; j++) {
            BlogBot.request_get_posts(user, sites[i].provider.providerName, sites[i].blogs[j].blog_id,
                            {"after":after}, BlogBot.push_posts_to_blogs);
        }
    }
    postDb.lastUpdateTime = new Date();
};

BlogBot.task = function() {
    console.log('Run BlogBot Task');
    for (var i=0; i<this.users.length; i++)  {
        var user = this.users[i].user;
        BlogBot.getAndPush(user);
    }
//    var post = {};
//    post.title = "justwapps test";
//    post.content = "it is for test of justwapps";
//    post.tags = "justwapps, api";
//    post.categories ="development";
//    BlogBot.request_post_content(this.users[0].user, post, "tumblr", "kimalec", BlogBot.add_postinfo_to_db);
};

BlogBot.start = function (user) {
    console.log("start BlogBot");
    var userInfo = {};
    userInfo.user = user;
    var sites = [];
    userInfo.blogDb = new blogdb(sites);
    console.log(userInfo.blogDb);
    var posts = [];
    userInfo.postDb = new postdb(posts);
    userInfo.postDb.lastUpdateTime = new Date();
    var histories = [];
    userInfo.historyDb = new historydb(histories);
    this.users.push(userInfo);
    return;
};

BlogBot.stop = function (user) {
    console.log("stop get blog of user " + user.id);
    return;
};

BlogBot.add_blogs_to_db = function (user, recv_blogs) {

    /*
     { "provider":object, "blogs":
                            [ {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
                              {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] },
     */
    var provider = recv_blogs.provider;
    var blogs = recv_blogs.blogs;
    var blogDb = BlogBot.findBlogDbByUser(user);

    if (blogDb === undefined) {
         console.log('add_blogs_to_db : Fail to find blogDb of user='+user.id);
        return;
    }

    var site = blogDb.findSiteByProvider(provider.providerName);
    //console.log(provider);

    if (site) {
        for (var i = 0; i<blogs.length; i++) {
            var blog = blogDb.find_blog_by_blog_id(site, blogs[i].blog_id);
            if (blog) {
                continue;
            }
            else {
                site.blogs.push(blogs[i]);
                BlogBot.request_get_post_count(user, site.provider.providerName, blogs[i].blog_id,
                                BlogBot.add_posts_from_new_blog);
            }
        }
    }
    else {
        site = blogDb.addProvider(provider, blogs);
        for (var i = 0; i < site.blogs.length; i++) {
            BlogBot.request_get_post_count(user, site.provider.providerName, site.blogs[i].blog_id,
                            BlogBot.add_posts_from_new_blog);
        }
    }

    console.log('site providerName=' + site.provider.providerName);
//    for (var j = 0; j < site.blogs.length; j++) {
//        console.log(site.blogs[j]);
//    }

    return;
};

BlogBot.findOrCreate = function (user) {
    console.log("find or create blog db of user " + user.id);

    for (var i = 0; i < user.providers.length; i++)
    {
        var p = user.providers[i];
        BlogBot.request_get_bloglist(user, p.providerName, p.providerId, BlogBot.add_blogs_to_db);
    }

    return;
};

BlogBot.getSites = function (user) {
    console.log('BlogBot.getSites');
    return BlogBot.findBlogDbByUser(user);
};

BlogBot.add_postinfo_to_db = function (user, recv_posts) {
    var postDb = BlogBot.findPostDbByUser(user);
    //TODO: change from title to id
    if (recv_posts.posts[0].title !== undefined) {
        var post = postDb.find_post_by_title(recv_posts.posts[0].title);
        if (post) {
            postDb.add_postinfo(post, recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[0]);
        }
        else {
            console.log('Fail to found post');
        }
    }
    else {
        //TODO content 및 다른 것으로 찾아서 넣는다.
    }
};

BlogBot.add_posts_to_db = function(user, recv_posts) {

    console.log('BlogBot.add_posts_to_db');

    var postDb = BlogBot.findPostDbByUser(user);

    //TODO: change from title to id
    for(var i = 0; i<recv_posts.posts.length;i++) {
        if (recv_posts.posts[i].title !== undefined) {
            var post = postDb.find_post_by_title(recv_posts.posts[i].title);

            //console.log(recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[i]);
            if (post) {
                postDb.add_postinfo(post, recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[i]);
                continue;
            }
        }

        postDb.add_post(recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[i]);
    }

    //postDb.saveFile();

    return;
};

BlogBot.recursiveGetPosts = function(user, provider_name, blog_id, options, callback) {
    BlogBot.request_get_posts(user, provider_name, blog_id, options, function (user, recv_posts) {
        console.log("recursiveGetPosts: recv posts");
        callback(user, recv_posts);
        if (recv_posts.posts.length != 0) {
            var index = recv_posts.posts.length-1;
            var new_opts = {};
            new_opts.offset = recv_posts.posts[index].id;
            console.log("recursiveGetPosts: get posts");
            BlogBot.recursiveGetPosts(user, provider_name, blog_id, new_opts, callback);
        }
        else {
            console.log("Stop recursive call functions");
        }
    });
};

BlogBot.add_posts_from_new_blog = function(user, recv_post_count) {
    console.log('BlogBot.add_posts_from_new_blog');
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
        console.log("post_count didn't supported");
        var options = {};
        BlogBot.recursiveGetPosts(user, provider_name, blog_id, options, BlogBot.add_posts_to_db);
    }
    //else for nothing

    return;
};

BlogBot.request_get_bloglist = function(user, provider_name, provider_id, callback) {
    var url = "http://www.justwapps.com/" + provider_name + "/bot_bloglist";
    url += "?";
    url += "providerid=" + provider_id;
    url += "&";

    url += "userid=" + user.id;

    console.log("url=" + url);
    request.get(url, function (err, response, data) {
        console.log(data);
        var recv_blogs = JSON.parse(data);
        callback(user, recv_blogs);
    });

    return;
};

BlogBot.request_get_post_count = function(user, provider_name, blog_id, callback) {
    var url = "http://www.justwapps.com/"+provider_name + "/bot_post_count/";
    url += blog_id;
    url += "?";
    url += "userid=" + user.id;

    console.log("url="+url);
    request.get(url, function (err, response, data) {
        //console.log(data);
        var recv_post_count = JSON.parse(data);
        callback(user, recv_post_count);
    });

    return;
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

    url += "userid=" + user.id;

    console.log(url);
    request.get(url, function (err, response, data) {
        //TODO: add exception code.
        //console.log(data);
        var recv_posts = JSON.parse(data);
        callback(user, recv_posts);
    });

    return;
};

BlogBot.getHistorys = function (socket, user) {

    var historyDb = BlogBot.findHistoryDbByUser(user);

    console.log('BlogBot.getHistories : userId='+ user.id);
    if (historyDb === undefined) {
        console.log('Fail to find historyDb of userId='+user.id);
        socket.emit('histories', {"histories":[]});
        return;
    }

    console.log('histories length='+historyDb.histories.length);
    socket.emit('histories', {"histories":historyDb.histories});
};

BlogBot.addHistory = function(user, srcPost, postStatus, dstPost) {
    var historyDb = BlogBot.findHistoryDbByUser(user);
    historyDb.addHistory(srcPost, postStatus, dstPost);
};

BlogBot._makeTitle = function (post) {
     if (post.content !== undefined && post.content.length != 0) {

        var indexNewLine = post.content.indexOf("\n");

        if (indexNewLine < 30) {
            post.title = post.content.substr(0, indexNewLine);
            return;
        }

        if (post.content.length < 30) {
            post.title = post.content;
            return;
        }

        post.title = post.content.substr(0,27);
        return;
    }

    if (post.url !== undefined) {
        post.title = post.url;
        return;
    }

    console.log("Fail to make title!!!");
};

BlogBot.request_post_content = function (user, post, provider_name, blog_id, callback) {
    var url = "http://www.justwapps.com/"+provider_name + "/bot_posts";
    url += "/new";
    url += "/"+encodeURIComponent(blog_id);
    url += "?";
    url += "userid=" + user.id;

    //send_data title, content, tags, categories
    if (post.title === undefined) {
        BlogBot._makeTitle(post);
    }

    var opt = { form: post };

    console.log('post='+url);
    request.post(url, opt, function (err, response, data) {
        var _ref;
        if (!err && ((_ref = response.statusCode) !== 200 && _ref !== 301)) {
            err = "" + response.statusCode + " " ;
            console.log(err);
            //add fail to history
            BlogBot.addHistory(user, post, response.statusCode, undefined);
            return;
        }
       //add post info
       console.log(data);
       var recv_posts = JSON.parse(data);
       callback(user, recv_posts);

        BlogBot.addHistory(user, post, response.statusCode, recv_posts.posts[0]);
       //add success to history
    });

    return;
};

/*****************************************************/
BlogBot.getPosts = function (socket, user) {

    var postDb = BlogBot.findPostDbByUser(user);

    console.log('BlogBot.getPosts : userid='+ user.id);
    if (postdb === undefined) {
        console.log('Fail to find postdb of user='+user.id);
        socket.emit('posts', {"post_db":[]});
        return;
    }

    //var userID = this.user.id;
    //console.log(this.user);
//    var p = this.user.providers[0];
//    var url = "http://www.justwapps.com/blog/blogCollectFeedback/posts";
//    url = url + "?userid=" + this.user.id;
//    url = url + "&providerid=" + p.providerId;
//    console.log("url="+url);
//    request.get(url, function (err, response, data) {
//        if(err) {
//            console.log("Cannot get Posts : " + err);
//        }
//        console.log("[BlogBot.getPosts]" + data);
//        var jsonData = JSON.parse(data);
//        console.log(jsonData);
//        socket.emit('posts', jsonData);
//    });

    console.log('posts length='+postDb.posts.length);
    socket.emit('posts', {"post_db":postDb.posts});

    return;
};

BlogBot.getComments = function (socket, user, postID) {
    console.log('BlogBot.getComments : '+ user.id);
    var userID = user.id;
    //console.log(user);
    var p = user.providers[0];

//    var url = "http://www.justwapps.com/blog/blogCollectFeedback/posts/"+postID+"/comments";
//    url = url + "?userid=" + userId;
//    url = url + "&providerid=" + p.providerId;
//    console.log("url="+url);
//    request.get(url, function (err, response, data) {
//        if(err) {
//            console.log("Cannot get getComments : " + err);
//        }
//        console.log("[BlogBot.getComments]" + data);
//        var jsonData = JSON.parse(data);
//        console.log(jsonData);
//        socket.emit('comments', jsonData);
//    });

    return;
};

BlogBot.get_reply_count = function (socket, user, post_id) {
    var postDb = BlogBot.findPostDbByUser(user);
    var post = postDb.find_post_by_id(post_id);

    for (var i=0; i<post.infos.length; i++) {

        BlogBot.request_get_posts(user, post.infos[i].provider_name, post.infos[i].blog_id,
                        {"post_id":post.infos[i].post_id}, function (user, recv_posts) {
            var recv_post = recv_posts.posts[0];
            var send_data = {};
            send_data.post_id = post_id;
            send_data.provider_name = recv_posts.provider_name;
            send_data.blog_id = recv_posts.blog_id;
            send_data.replies = recv_post.replies;
            //console.log(send_data);
            socket.emit('reply_count', send_data);
        });
    }
    return;
};

module.exports = BlogBot;

