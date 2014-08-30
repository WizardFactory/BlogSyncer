/**
 *
 * Created by aleckim on 2014. 8. 13..
 */

var request = require('request');
var blogdb = require('../models/blogdb');

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
        url = url + "?userid=" + user.id;
        url = url + "&providerid=" + p.providerId;
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
                blogdb.addBlog(site, blogs);
            }
            else {
                site = blogdb.addProvider(provider, blogs);
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

blogbot.getPosts = function(provider) {
   //get count
   //for until count
   //get post
   //findorcreate postdb
   //
};

//blogbot.add_posts_from_new_blog = function(blog) {
// get count
// while until count
// get post
// add post to postdb
//};

//blogbot.check_new_posts_of_blog = function(blog) {
//};

//blogbot.push_post_to_blog = function(blog) {
//};

module.exports = blogbot;

