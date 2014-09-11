/**
 *
 * Created by aleckim on 2014. 8. 13..
 */

var request = require('request');
var blogdb = require('../models/blogdb');
var postdb = require('../models/postdb');
var blogCommon  = require('./blogjs/blogCommon');

function blogbot() {

}

blogbot.send_post_to_blogs = function (recv_posts) {
    var sites = blogdb.sites;
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
                console.log('send_post_to_blogs: post id='+post.id+' to provider='+sites[i].provider.providerName+' blog='+target_blog.blog_id);
                blogbot.request_post_content(post, sites[i].provider.providerName, target_blog.blog_id, blogbot.add_postinfo_to_db);
            }
        }
    }

    return;
};

blogbot.push_posts_to_blogs = function(recv_posts) {
//TODO: if post count over max it need to extra update - aleckim
    for(var i=0; i<recv_posts.posts.length;i++) {
        var new_post = recv_posts.posts[i];
        if (postdb.find_post_by_post_id_of_blog(recv_posts.provider_name, recv_posts.blog_id, new_post.id)) {
            console.log('this post was already saved - provider ' + recv_posts.provider_name + ' blog ' + recv_posts.blog_id + ' post ' + new_post.id);
        }
        else {
            postdb.add_post(recv_posts.provider_name, recv_posts.blog_id, new_post);
            blogbot.request_get_posts(recv_posts.provider_name, recv_posts.blog_id, {"post_id":new_post.id}
                                            , blogbot.send_post_to_blogs);
            //push post to others blog and add_postinfo
        }
    }

    return;
};

blogbot.getandpush = function() {
    console.log("start get blog of user" + this.user.id);
    var sites = blogdb.sites;
    var after = this.last_update_time.toISOString();
    console.log(after);

    for (var i = 0; i < sites.length; i++) {
        for (var j = 0; j < sites[i].blogs.length; j++) {
            blogbot.request_get_posts(sites[i].provider.providerName, sites[i].blogs[j].blog_id
                            , {"after":after}, blogbot.push_posts_to_blogs);
        }
    }
    this.last_update_time = new Date();

//    var post = {};
//    post.title = "justwapps test";
//    post.content = "it is for test of justwapps";
//    post.tags = "justwapps, api";
//    post.categories ="development";
//    blogbot.request_post_content(post, 'Wordpress', 72254286, blogbot.add_postinfo_to_db);

    return;
};

blogbot.start = function (user) {
    console.log("start blogbot");
    this.user = user;
    this.last_update_time = new Date();

    return;
};

blogbot.stop = function () {
    console.log("stop get blog of user " + this.user.id);

    return;
};

blogbot.add_blogs_to_db = function (recv_blogs) {
    /*
     { "provider":object, "blogs":
                            [ {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
                              {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] },
     */
    var provider = recv_blogs.provider;
    var blogs = recv_blogs.blogs;
    var site = blogdb.findSiteByProvider(provider.providerName);
    //console.log(provider);

    if (site) {
        for (var i = 0; i<blogs.length; i++) {
            var blog = blogdb.find_blog_by_blog_id(site, blogs[i].blog_id);
            if (blog) {
                continue;
            }
            else {
                site.blogs.push(blogs[i]);
                blogbot.request_get_post_count(site.provider.providerName, blogs[i].blog_id, blogbot.add_posts_from_new_blog);
            }
        }
    }
    else {
        site = blogdb.addProvider(provider, blogs);
        for (var i = 0; i < site.blogs.length; i++) {
            blogbot.request_get_post_count(site.provider.providerName, site.blogs[i].blog_id, blogbot.add_posts_from_new_blog);
        }
    }

    console.log('site providerName=' + site.provider.providerName);
    for (var j = 0; j < site.blogs.length; j++) {
        console.log(site.blogs[j]);
    }

    return;
};

blogbot.findOrCreate = function (user) {
    console.log("find or create blog db of user " + user.id);

    if (blogdb.sites) {
        console.log ("we have blog db");
        //we need to update new blog and site
        //return blogdb.sites;
    }

    for (var i = 0; i < user.providers.length; i++)
    {
        var p = user.providers[i];
        blogbot.request_get_bloglist(p.providerName, p.providerId, blogbot.add_blogs_to_db);
    }

    return;
};

blogbot.getSites = function () {
    console.log('blogbot.getSites');
    return blogdb.sites;
};

blogbot.add_postinfo_to_db = function (recv_posts) {
    //TODO: change from title to id
    var post = postdb.find_post_by_title(recv_posts.posts[0].title);
    if (post) {
        postdb.add_postinfo(post, recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[0]);
    }
    else {
        console.log('Fail to found post');
    }

    return;
};

blogbot.add_posts_to_db = function(recv_posts) {
    for(var i = 0; i<recv_posts.posts.length;i++) {
        var post = postdb.find_post_by_title(recv_posts.posts[i].title);
        //console.log(recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[i]);
        if (post) {
            postdb.add_postinfo(post, recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[i]);
        }
        else {
            postdb.add_post(recv_posts.provider_name, recv_posts.blog_id, recv_posts.posts[i]);
        }
    }

    postdb.saveFile();

    return;
};

blogbot.add_posts_from_new_blog = function(recv_post_count) {
    var provider_name = recv_post_count.provider_name;
    var blog_id =  recv_post_count.blog_id;
    var post_count = recv_post_count.post_count;
    //how many posts get per 1 time.
    for(var i = 0; i<post_count;i+=20) {
        var offset = i + '-20';
        blogbot.request_get_posts(provider_name,blog_id, {"offset":offset}, blogbot.add_posts_to_db);
    }

    return;
};

blogbot.request_get_bloglist = function(provider_name, provider_id, callback) {
    var url = "http://www.justwapps.com/" + provider_name + "/bot_bloglist";
    url += "?";
    url += "providerid=" + provider_id;
    url += "&";

    url += "userid=" + this.user.id;

    console.log("url=" + url);
    request.get(url, function (err, response, data) {
        //console.log(data)};
        var recv_blogs = JSON.parse(data);
        callback(recv_blogs);
    });

    return;
};

blogbot.request_get_post_count = function(provider_name, blog_id, callback) {
    var url = "http://www.justwapps.com/"+provider_name + "/bot_post_count/";
    url += blog_id;
    url += "?";
    url += "userid=" + this.user.id;

    console.log("url="+url);
    request.get(url, function (err, response, data) {
        console.log(data);
        var recv_post_count = JSON.parse(data);
        callback(recv_post_count);
    });

    return;
};

blogbot.request_get_posts = function(provider_name, blog_id, options, callback) {
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

    url += "userid=" + this.user.id;

    console.log(url);
    request.get(url, function (err, response, data) {
        //TODO: add exception code.
        //console.log(data);
        var recv_posts = JSON.parse(data);
        callback(recv_posts);
    });

    return;
};

blogbot.request_post_content = function (post, provider_name, blog_id, callback) {
    var url = "http://www.justwapps.com/"+provider_name + "/bot_posts";
    url += "/new";
    url += "/"+blog_id;
    url += "?";
    url += "userid=" + this.user.id;

    //send_data title, content, tags, categories
    var opt = { form: post };

    console.log('post='+url);
    request.post(url, opt, function (err, response, data) {
        var _ref;
        if (!err && ((_ref = response.statusCode) !== 200 && _ref !== 301)) {
            err = "" + response.statusCode + " " ;
            console.log(err);
        }
       //add post info
       //console.log(data);
       var recv_posts = JSON.parse(data);
       callback(recv_posts);
    });

    return;
};

/*****************************************************/
blogbot.getPosts = function (socket) {
    console.log('blogbot.getPosts : '+ this.user.id);
    var userID = this.user.id;
    console.log(this.user);
    var p = this.user.providers[0];
    var url = "http://www.justwapps.com/blog/blogCollectFeedback/posts";
    url = url + "?userid=" + this.user.id;
    url = url + "&providerid=" + p.providerId;
    console.log("url="+url);
    request.get(url, function (err, response, data) {
        if(err) {
            console.log("Cannot get Posts : " + err);
        }
        console.log("[blogbot.getPosts]" + data);
        var jsonData = JSON.parse(data);
        console.log(jsonData);
        socket.emit('posts', jsonData);
    });
}

blogbot.getComments = function (socket, postID) {
    console.log('blogbot.getComments : '+ this.user.id);
    var userID = this.user.id;
    console.log(this.user);
    var p = this.user.providers[0];
    var url = "http://www.justwapps.com/blog/blogCollectFeedback/posts/"+postID+"/comments";
    url = url + "?userid=" + this.user.id;
    url = url + "&providerid=" + p.providerId;
    console.log("url="+url);
    request.get(url, function (err, response, data) {
        if(err) {
            console.log("Cannot get getComments : " + err);
        }
        console.log("[blogbot.getComments]" + data);
        var jsonData = JSON.parse(data);
        console.log(jsonData);
        socket.emit('comments', jsonData);
    });
}

module.exports = blogbot;

