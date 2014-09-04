/**
 *
 * Created by aleckim on 2014. 8. 13..
 */

var request = require('request');
var blogdb = require('../models/blogdb');
var postdb = require('../models/postdb');

function blogbot() {

}

blogbot.getandpush = function() {
    console.log("start get blog of user" + this.user.id);
    //
    //getposts(provider)
    //
};

blogbot.start = function (user) {
    console.log("start blogbot");
    this.user = user;
/*
    this.intarval = setInterval(this.getandpush, 1000*60, user); //1 min
    request.post("http://www.justwapps.com/child/reg", function (error, response, body) {
        //if (!error && response.statusCode == 200) {
            console.log('posted register');
            //console.log(error);
            console.log(body);
        //}
    });
*/
};

blogbot.stop = function () {
    console.log("stop get blog of user " + this.user.id);
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
        var url = "http://www.justwapps.com/"+p.providerName + "/bot_bloglist";
        url = url + "?";
        url = url + "userid=" + user.id;
        url = url + "&";
        url = url + "providerid=" + p.providerId;

        console.log("url="+url);
        request.get(url, function (err, response, data) {
            //console.log(data);
            /*
             { "provider":object, "blogs":
                                    [ {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
                                     {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] },
             */
            var provider = JSON.parse(data).provider;
            var blogs = JSON.parse(data).blogs;
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
                        blogbot.add_posts_from_new_blog(site.provider, blogs[i]);
                    }
                }
            }
            else {
                site = blogdb.addProvider(provider, blogs);
                blogbot.update_post_db(site);
            }

            console.log('site providerName=' + site.provider.providerName);
            for (var j = 0; j < site.blogs.length; j++) {
                console.log(site.blogs[j]);
            }
        });
    }

    // db가 완성되기 전에 return 될 것임.
    return blogdb.sites;
};

blogbot.getSites = function () {
    console.log('blogbot.getSites');
    return blogdb.sites;
};

blogbot.update_post_db = function(site) {
    console.log('update_post_db');
    console.log(site);
    for (var i = 0; i < site.blogs.length; i++) {
        blogbot.add_posts_from_new_blog(site.provider, site.blogs[i]);
    }
};

blogbot.add_post_to_db = function(recv_posts) {
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

    //postdb.saveFile();

    return;
};

blogbot.get_posts_from_blog = function (provider_name, blog_id, offset) {
    var url = "http://www.justwapps.com/"+provider_name + "/bot_posts/";
    url = url + blog_id;
    url = url + "/";
    url = url + offset;
    url = url + "?";
    url = url + "userid=" + this.user.id;
    console.log("url="+url);
    request.get(url, function (err, response, data) {
        console.log(data);
        var recv_posts = JSON.parse(data);
        blogbot.add_post_to_db(recv_posts);
    });
};

blogbot.add_posts_from_new_blog = function(provider, blog) {
    console.log(blog);
    var url = "http://www.justwapps.com/"+provider.providerName + "/bot_post_count/";
    url = url + blog.blog_id;
    url = url + "?";
    url = url + "userid=" + this.user.id;

    console.log("url="+url);
    request.get(url, function (err, response, data) {
        console.log(data);
        var provider_name = JSON.parse(data).provider_name;
        var blog_id =  JSON.parse(data).blog_id;
        var post_count = JSON.parse(data).post_count;
        //how many posts get per 1 time.
        for(var i = 0; i<post_count;i+=20) {
            var offset = i + '-20';
            blogbot.get_posts_from_blog(provider_name,blog_id, offset);
        }
    });
};

//blogbot.check_new_posts_of_blog = function(blog) {
// get last post
// if new post call push_post_to_blog
//};

//blogbot.push_post_to_blog = function(blog) {
// get new post
// while blogs
//  send post to blog without current blog
//  if get error retry post
//};

module.exports = blogbot;

