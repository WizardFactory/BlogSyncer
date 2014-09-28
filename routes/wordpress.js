/**
 *
 * Created by aleckim on 2014. 5. 15..
 */

var userdb      = require('../models/userdb');
var blogCommon  = require('./blogjs/blogCommon');

var express = require('express');
var passport = require('passport');
var request = require('request');
var wordpressStrategy = require('passport-wordpress').Strategy;
var childm = require('./childmanager');
var router = express.Router();

var svcConfig = require('../models/svcConfig.json');
var clientConfig = svcConfig.Wordpress;

var WORDPRESS_API_URL = "https://public-api.wordpress.com/rest/v1";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new wordpressStrategy({
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/wordpress/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
//        console.log("accessToken:" + accessToken);
//        console.log("refreshToken:" + refreshToken);
        console.log("profile:"+JSON.stringify(profile));
        var providerId;
        //if user didn't set blog for oauth, token_site_id set to false
        if (profile._json.token_site_id != false) {
            providerId = profile._json.token_site_id;
        }
        else {
            providerId = profile._json.primary_blog;
        }

        var provider = {
            "providerName":profile.provider,
            "accessToken":accessToken,
            "refreshToken":refreshToken,
            "providerId":providerId, //it is not user id(it's blog_id)
            "displayName":profile.displayName
        };

        var user = userdb.findOrCreate(req.user, provider);
        childm.sendMessage(user, 'findOrCreate');

        process.nextTick(function () {
            return done(null, user);
        });
    }
));

router.get('/authorize',
    passport.authenticate('wordpress')
);

router.get('/authorized',
    passport.authenticate('wordpress', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        console.log('Successful!');
        res.redirect('/#');
    }
);

 function _getUserID(req) {
    var userid = 0;

    if (req.user) {
        userid = req.user.id;
    }
    else if (req.query.userid)
    {
       //this request form child process;
       userid = req.query.userid;
    }

    return userid;
}

function _checkError(err, response, body) {
    if (err) {
        console.log(err);
        return err;
    }
    if (response.statusCode >= 400) {
        var err = body.meta ? body.meta.msg : body.error;
        var errStr = 'API error: ' + response.statusCode + ' ' + err;
        console.log(errStr);
        return new Error(errStr);
    }
}

router.get('/me', function (req, res) {
    var user_id = _getUserID(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var api_url = WORDPRESS_API_URL+"/me";
    console.log(api_url);
    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, body) {
        var hasError = _checkError(err, response, body);
        if (hasError !== undefined) {
            res.send(hasError);
            return;
        }
        console.log(body);
        res.send(body);
    });
});

router.get('/posts/:blog_id', function (req, res) {
    blogCommon.getWPPosts(req, res);
});

router.get('/bot_bloglist', function (req, res) {

    console.log("Wordpress: "+ req.url + ' : this is called by bot');

    var user_id = _getUserID(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }
    if (req.query.providerId == false) {
        var errorMsg = 'User:'+user_id+' didnot have blog!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }
    var p = userdb.findProviderId(user_id, req.query.providerid);

    var api_url = WORDPRESS_API_URL+"/sites/"+p.providerId;

    console.log(api_url);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, body) {
        var hasError = _checkError(err, response, body);
        if (hasError !== undefined) {
            res.send(hasError);
            return;
        }

        //console.log(data);
        var blog_id = body.ID;
        var blog_title = body.name;
        var blog_url = body.URL;
        var send_data = {};
        send_data.provider = p;
        send_data.blogs = [];
        send_data.blogs.push({"blog_id":blog_id, "blog_title":blog_title, "blog_url":blog_url});

        /*
         { "provider":object, "blogs":
         [ {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
         {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] },
         */
        res.send(send_data);
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {

    console.log("Wordpress: "+ req.url + ' : this is called by bot');

    var user_id = _getUserID(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var blog_id = req.params.blog_id;
    var api_url = WORDPRESS_API_URL+"/sites/"+blog_id;
    var p = userdb.findProviderId(user_id, blog_id);

    console.log(api_url);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, body) {
        var hasError = _checkError(err, response, body);
        if (hasError !== undefined) {
            res.send(hasError);
            return;
        }
        var send_data = {};
        console.log(body.post_count);
        send_data.provider_name = 'Wordpress';
        send_data.blog_id = body.ID;
        send_data.post_count = body.post_count;
        res.send(send_data);
    });
 });

router.get('/bot_posts/:blog_id', function (req, res) {
    console.log("Wordpress: "+ req.url + ' : this is called by bot');

    var user_id = _getUserID(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var blog_id = req.params.blog_id;
    var offset = req.query.offset;
    var after = req.query.after;
    var is_extended = false;
    var p = userdb.findProviderId(user_id, blog_id);

    var api_url = WORDPRESS_API_URL+"/sites/"+blog_id;
    api_url += "/posts";
    api_url += "?";
    if (offset) {
        api_url += "offset=" + offset;
        is_extended = true;
    }
    if (after) {
        if (is_extended) {
            api_url += "&";
        }
        api_url += "after=" + after;
    }

    console.log(api_url);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, body) {
        var hasError = _checkError(err, response, body);
        if (hasError !== undefined) {
            res.send(hasError);
            return;
        }
        //console.log(data);
        //for (var i=0; i<data.posts.length;i++) {
        //    console.log('post_id='+data.posts[i].ID);
        //}
        if (body.posts === undefined) {
           console.log('Fail to get posts');
           res.send('Fail to get posts');
           return;
        }

        var send_data = {};
        send_data.provider_name = 'Wordpress';
        send_data.blog_id = blog_id;
        send_data.post_count = body.posts.length;
        send_data.posts = [];

        for (var i = 0; i<body.posts.length; i++) {
            var raw_post = body.posts[i];
            var post_date = new Date(raw_post.modified);
            var after_date = new Date(after);
            if (post_date < after_date) {
                //console.log('post is before');
                continue;
            }
            var send_post = {};
            send_post.title = raw_post.title;
            send_post.modified = raw_post.modified;
            send_post.id = raw_post.ID;
            send_post.url = raw_post.URL;
            send_post.categories = [];
            send_post.tags = [];
            var j=0;
            if (raw_post.categories) {
                var category_arr = Object.keys(raw_post.categories);
                for (j=0; j<category_arr.length; j++) {
                    send_post.categories.push(category_arr[j]);
                }
//                console.log('category-raw');
//                console.log(category_arr);
//                console.log('category-send');
//                console.log(send_post.categories);
            }
            if (raw_post.tags) {
                var tag_arr = Object.keys(raw_post.tags);
                for (j=0; j<tag_arr.length; j++) {
                    send_post.tags.push(tag_arr[j]);
                }
//                console.log('tag-raw');
//                console.log(tag_arr);
//                console.log('tags-send');
//                console.log(send_post.tags);
            }
            send_data.posts.push(send_post);
        }
        res.send(send_data);
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    console.log("Wordpress: "+ req.url + ' : this is called by bot');

    var user_id = _getUserID(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var blog_id = req.params.blog_id;
    var post_id = req.params.post_id;
    var p = userdb.findProviderId(user_id, blog_id);

    var api_url = WORDPRESS_API_URL+"/sites/"+blog_id;
    api_url += "/posts";
    api_url += "/" + post_id;

    console.log(api_url);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, body) {
        var hasError = _checkError(err, response, body);
        if (hasError !== undefined) {
            res.send(hasError);
            return;
        }
        //console.log(data);
        var send_data = {};
        send_data.provider_name = 'Wordpress';
        send_data.blog_id = blog_id;
        send_data.posts = [];

            var send_post = {};
            var raw_post = body;
            send_post.title = raw_post.title;
            send_post.modified = raw_post.modified;
            send_post.id = raw_post.ID;
            send_post.url = raw_post.URL;
            send_post.categories = [];
            send_post.tags = [];
            var j=0;
            if (raw_post.categories) {
                var category_arr = Object.keys(raw_post.categories);
                for (j=0; j<category_arr.length; j++) {
                    send_post.categories.push(category_arr[j]);
                }
//                console.log('category-raw');
//                console.log(category_arr);
//                console.log('category-send');
//                console.log(send_post.categories);
            }
            if (raw_post.tags) {
                var tag_arr = Object.keys(raw_post.tags);
                for (j=0; j<tag_arr.length; j++) {
                    send_post.tags.push(tag_arr[j]);
                }
//                console.log('tag-raw');
//                console.log(tag_arr);
//                console.log('tags-send');
//                console.log(send_post.tags);
            }
            send_post.content = raw_post.content;
            send_post.replies = [];
            send_post.replies.push({"comment_count":raw_post.comment_count});
            send_post.replies.push({"like_count":raw_post.like_count});
            send_data.posts.push(send_post);
        res.send(send_data);
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    console.log('Wordpress ' + req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var blog_id = req.params.blog_id;
    var p = userdb.findProviderId(user_id, blog_id);
    var api_url = WORDPRESS_API_URL+"/sites/"+blog_id +"/posts/new";

    console.log(api_url);

    request.post(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        },
        form: req.body
    }, function (err, response, body) {
        var hasError = _checkError(err, response, body);
        if (hasError !== undefined) {
            res.send(hasError);
            return;
        }
        //add post info
        var send_data = {};
        send_data.provider_name = 'Wordpress';
        send_data.blog_id = blog_id;
        send_data.posts = [];

        var send_post = {};
        var raw_post = body;
        send_post.title = raw_post.title;
        send_post.modified = raw_post.modified;
        send_post.id = raw_post.ID;
        send_post.url = raw_post.URL;
        send_post.categories = [];
        send_post.tags = [];
        var j=0;
        if (raw_post.categories) {
            var category_arr = Object.keys(raw_post.categories);
            for (j=0; j<category_arr.length; j++) {
                send_post.categories.push(category_arr[j]);
            }
//                console.log('category-raw');
//                console.log(category_arr);
//                console.log('category-send');
//                console.log(send_post.categories);
        }
        if (raw_post.tags) {
            var tag_arr = Object.keys(raw_post.tags);
            for (j=0; j<tag_arr.length; j++) {
                send_post.tags.push(tag_arr[j]);
            }
//                console.log('tag-raw');
//                console.log(tag_arr);
//                console.log('tags-send');
//                console.log(send_post.tags);
        }
        //send_post.content = raw_post.content;
        send_data.posts.push(send_post);
        console.log(send_data);
        res.send(send_data);
    });

    return;
});

router.get('/bot_comments/:blogID/:postID', function (req, res) {
    console.log(req.url);
    var userID = _getUserID(req);
    if (userID == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var blogID = req.params.blogID;
    var postID = req.params.postID;
    var p = userdb.findProviderId(userID, blogID);

    var api_url = WORDPRESS_API_URL+"/sites/"+blogID;
    api_url += "/posts";
    api_url += "/" + postID;
    api_url += "/replies";

    console.log(api_url);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, body) {
        var hasError = _checkError(err, response, body);
        if (hasError !== undefined) {
            res.send(hasError);
            return;
        }
        console.log(body);
        var send = {};
        send.providerName = p.providerName;
        send.blogID = blogID;
        send.postID = postID;
        send.found = body.found;
        send.comments = [];
        for(var i=0; i<body.found; i++) {
            var comment = {};
            comment.date = body.comments[i].date;
            comment.URL = body.comments[i].short_URL;
            comment.content = body.comments[i].content;
            send.comments.push(comment);
        }

        res.send(send);
    });

});

module.exports = router;

