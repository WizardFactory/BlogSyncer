/**
 * Created by aleckim on 2014. 7. 19..
 */

var User = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var blogBot = require('./blogbot');
var request = require('request');

var router = express.Router();

var svcConfig = require('../models/svcConfig.json');
var clientConfig = svcConfig.twitter;

var log = require('winston');

var OAuth = require('oauth').OAuth;
// global variable for object of OAuth
var objOAuth = new OAuth("https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    clientConfig.clientID,
    clientConfig.clientSecret,
    "1.0A",
    null,
    "HMAC-SHA1");

var TWITTER_API_URL = "https://api.twitter.com/1.1";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

function _updateOrCreateUser(req, provider, callback) {
    User.findOne({'providers.providerName':provider.providerName
            , 'providers.providerId': provider.providerId},
        function (err, user) {
            var p;
            var isNewProvider = false;

            if (err) {
                return callback(err);
            }

            // if there is a user id already but no token (user was linked at one point and then removed)
            if (user) {
                log.debug("Found user of pName="+provider.providerName+",pId="+provider.providerId);
                p = user.findProvider("twitter");
                if (p.accessToken !== provider.accessToken) {
                    p.accessToken = provider.accessToken;
                    p.refreshToken = provider.refreshToken;
                    user.save (function(err) {
                        if (err)
                            return callback(err);

                        return callback(null, user, isNewProvider);
                    });
                }
                else {
                    return callback(null, user, isNewProvider);
                }
            }
            else {
                isNewProvider = true;

                if (req.user) {
                    User.findById(req.user._id, function (err, user) {
                        if (err) {
                            log.error(err);
                            return callback(err);
                        }
                        if (!user) {
                            log.error("Fail to get user id="+req.user._id);
                            log.error(err);
                            return callback(err);
                        }
                        // if there is no provider, add to User
                        user.providers.push(provider);
                        user.save(function(err) {

                            if (err) {
                                return callback(err);
                            }

                            return callback(null, user, isNewProvider);
                        });
                    });
                }
                else {
                    // if there is no provider, create new user
                    var newUser = new User();
                    newUser.providers = [];

                    newUser.providers.push(provider);
                    newUser.save(function(err) {
                        if (err)
                            return callback(err);

                        return callback(null, newUser, isNewProvider);
                    });
                }
            }
        } );
}

passport.use(new TwitterStrategy({
        consumerKey: clientConfig.clientID,
        consumerSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/twitter/authorized",
        passReqToCallback : true
    },
    function(req, token, tokenSecret, profile, done) {
//        log.debug("token:" + token); // 인증 이후 auth token을 출력할 것이다.
//        log.debug("token secret:" + tokenSecret); // 인증 이후 auto token secret을 출력할 것이다.
//        log.debug("profile:" + JSON.stringify(profile));
        var provider = {
            "providerName":profile.provider,
            "token":token,
            "tokenSecret":tokenSecret,
            "providerId":profile.username,
            "displayName":profile.displayName
        };



        _updateOrCreateUser(req, provider, function(err, user, isNewProvider) {
            if (err) {
                log.error("Fail to get user ");
                return done(err);
            }

            if (isNewProvider) {
                if (!blogBot.isStarted(user)) {
                    blogBot.start(user);
                }
                blogBot.findOrCreate(user);
            }

            process.nextTick(function () {
                return done(null, user);
            });
        });
    }
));

router.get('/authorize',
    passport.authenticate('twitter')
);

router.get('/authorized',
    passport.authenticate('twitter', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

function _getUserID(req) {
    var userid = 0;

    if (req.user) {
        userid = req.user._id;
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
        log.debug(err);
        return err;
    }
    if (response.statusCode >= 400) {
        var err = body.meta ? body.meta.msg : body.error;
        var errStr = 'API error: ' + response.statusCode + ' ' + err;
        log.debug(errStr);
        return new Error(errStr);
    }
}

function _requestGet(url, accessToken, callback) {
    request.get(url, {
        json: true,
        headers: {
            "authorization": "Bearer " + accessToken
        }
    }, function (err, response, body) {
        callback(err, response, body);
    });
}

router.get('/bot_bloglist', function (req, res) {

    log.debug("Twitter : "+ req.url + ' : this is called by bot');

    var user_id = _getUserID(req);

    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    if (req.query.providerid == false) {
        var errorMsg = 'User:'+user_id+' did not have blog!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var p;
        var api_url;

        p = user.findProvider("twitter", req.query.providerid);
        api_url = TWITTER_API_URL + "/users/show.json?screen_name=" + p.providerId;
        // instantiate Twit module
        //var twitter = new Twit(twitConfig);
        //var twit = new twitter(twitConfig);

        //userTimeline(p, req, res);

        objOAuth.get(api_url, p.token, p.tokenSecret, function (error, data) {
            var result;
            if(error) {
                result = {error: error};
                res.send(result);
                return;
            } else {
                result = JSON.parse(data);
            }

            log.debug(result);

            var blog_id = result.id;
            var blog_title = result.name;
            var blog_url = result.url;
            var send_data = {};

            send_data.provider = p;
            send_data.blogs = [];
            send_data.blogs.push({"blog_id":blog_id, "blog_title":blog_title, "blog_url":blog_url});

            res.send(send_data);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {

    log.debug("Twitter: "+ req.url + ' : this is called by bot');

    var user_id = _getUserID(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var p;
        var api_url;
        var blog_id = req.query.providerid;

        p = user.findProvider("twitter", blog_id);
        api_url = TWITTER_API_URL + "/users/show.json?screen_name=" + p.providerId;

        log.debug(api_url);

        objOAuth.get(api_url, p.token, p.tokenSecret, function (error, data) {
            var result;
            var send_data = {};

            if(error) {
                result = {error: error};
                res.send(result);
                return;
            } else {
                result = JSON.parse(data);
            }

            log.debug(result);

            send_data.provider_name = 'twitter';
            send_data.blog_id = result.id;
            send_data.post_count = result.statuses_count;

            log.debug(result.statuses_count);

            res.send(send_data);
        });
    });
});

router.get('/bot_posts/:blog_id', function (req, res) {
    log.debug("Twitter : "+ req.url + ' : this is called by bot');

    var user_id = _getUserID(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var blog_id = req.query.providerid;
        var last_id = req.query.offset;
        var after = req.query.after;
        // https://dev.twitter.com/rest/public/timelines
        // use max_id for twit offset in twitter
        var lastCnt = 0;
        var count = 0;
        var api_url;

        if (user.providers === null) {
            log.error("user.providers is null !!!");
            return;
        }

        count = 20;

        var p = user.findProvider("twitter", blog_id);
        api_url = TWITTER_API_URL+"/statuses/user_timeline.json?screen_name="+ p.providerId
            + "&count=" + count;

        if (last_id) {
            api_url += "&";
            api_url += "max_id=" + last_id;
        }

        //log.debug(api_url);

        objOAuth.get(api_url, p.token, p.tokenSecret, function (error, response, body) {
            var result = [];
            var resultVal;

            var hasError = _checkError(err, response, body);
            if (hasError !== undefined) {
                res.send(hasError);
                return;
            }

            result = JSON.parse(response);//data;

            if(result.length === undefined) {
                log.debug("result is empty !!!")
                return;
            }

            var send_data = {};
            var i = 0;

            send_data.provider_name = 'twitter';
            send_data.blog_id = blog_id;
            send_data.posts = [];

            for (i = 0; i < result.length; i++) {
                var raw_post = result[i];
                if (after !== undefined) {
                    var post_date = new Date(raw_post.created_at);
                    var after_date = new Date(after);

                    if (post_date < after_date) {
                        //log.debug('post is before');
                        continue;
                    }
                }

                var send_post = {};
                send_post.title = raw_post.text;
                send_post.modified = raw_post.created_at;
                send_post.id = raw_post.id;
                send_post.url = raw_post.url;
                send_post.categories = [];
                send_post.tags = [];
                send_post.content = raw_post.content;

                send_data.posts.push(send_post);
                send_data.stopReculsive = false;
            }

            send_data.post_count = send_data.posts.length;

            if( (last_id == send_data.posts[i-1].id)
                && (result.length == 1) ) {
                log.debug("stop Reculsive!!!!");
                send_data.stopReculsive = true;
            }

            res.send(send_data);
        });
    });
});

// 추가 구현 예정
/*
router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    log.debug("Twitter : "+ req.url + ' : this is called by bot');

    var user_id = _getUserID(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var blog_id = req.params.blog_id;
        var post_id = req.params.post_id;
        var p = user.findProvider("Wordpress", blog_id);
        var api_url = WORDPRESS_API_URL+"/sites/"+blog_id;

        api_url += "/posts";
        api_url += "/" + post_id;

        log.debug(api_url);

        _requestGet(api_url, p.accessToken, function(err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError !== undefined) {
                res.send(hasError);
                return;
            }

            //log.debug(data);
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
//                log.debug('category-raw');
//                log.debug(category_arr);
//                log.debug('category-send');
//                log.debug(send_post.categories);
            }
            if (raw_post.tags) {
                var tag_arr = Object.keys(raw_post.tags);
                for (j=0; j<tag_arr.length; j++) {
                    send_post.tags.push(tag_arr[j]);
                }
//                log.debug('tag-raw');
//                log.debug(tag_arr);
//                log.debug('tags-send');
//                log.debug(send_post.tags);
            }
            send_post.content = raw_post.content;
            send_post.replies = [];
            send_post.replies.push({"comment_count":raw_post.comment_count});
            send_post.replies.push({"like_count":raw_post.like_count});
            send_data.posts.push(send_post);
            res.send(send_data);
        });
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    log.debug('Wordpress ' + req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var blog_id = req.params.blog_id;
        var p = user.findProvider("Wordpress", blog_id);
        var api_url = WORDPRESS_API_URL+"/sites/"+blog_id +"/posts/new";

        log.debug(api_url);
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
//                log.debug('category-raw');
//                log.debug(category_arr);
//                log.debug('category-send');
//                log.debug(send_post.categories);
            }
            if (raw_post.tags) {
                var tag_arr = Object.keys(raw_post.tags);
                for (j=0; j<tag_arr.length; j++) {
                    send_post.tags.push(tag_arr[j]);
                }
//                log.debug('tag-raw');
//                log.debug(tag_arr);
//                log.debug('tags-send');
//                log.debug(send_post.tags);
            }
            //send_post.content = raw_post.content;
            send_data.posts.push(send_post);
            log.debug(send_data);
            res.send(send_data);
        });
    });
});

router.get('/bot_comments/:blogID/:postID', function (req, res) {
    log.debug(req.url);
    var userID = _getUserID(req);
    if (userID == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    User.findById(user_id, function (err, user) {
        var blogID = req.params.blogID;
        var postID = req.params.postID;
        var p = user.findProvider("Wordpress", blogID);
        var api_url = WORDPRESS_API_URL+"/sites/"+blogID;
        api_url += "/posts";
        api_url += "/" + postID;
        api_url += "/replies";

        log.debug(api_url);

        _requestGet(api_url, p.accessToken, function(err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError !== undefined) {
                res.send(hasError);
                return;
            }

            log.debug(body);

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
});
*/

module.exports = router;

