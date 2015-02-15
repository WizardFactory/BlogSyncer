/**
 * Created by aleckim on 2014. 7. 5..
 */

var router = require('express').Router();
var passport = require('passport');

var blogBot = require('./blogbot');
var userMgr = require('./userManager');
var svcConfig = require('../models/svcConfig.json');

var clientConfig = svcConfig.tumblr;
var TumblrStrategy = require('passport-tumblr').Strategy;
var tumblr = require('tumblr.js');
var TUMBLR_PROVIDER = "tumblr";

passport.serializeUser(function(user, done) {
    "use strict";
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    "use strict";
    done(null, obj);
});

passport.use(new TumblrStrategy({
        consumerKey: clientConfig.clientID,
        consumerSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL+"/tumblr/authorized",
        passReqToCallback : true
    },
    function(req, token, tokenSecret, profile, done) {
        "use strict";
        var provider;

//        log.debug("token:" + token); // 인증 이후 auth token을 출력할 것이다.
//        log.debug("token secret:" + tokenSecret); // 인증 이후 auto token secret을 출력할 것이다.
//        log.debug("profile:" + JSON.stringify(profile));

        provider= {
            "providerName":profile.provider,
            "token":token,
            "tokenSecret":tokenSecret,
            "providerId":profile.username.toString(),
            "displayName":profile.username
        };

        userMgr._updateOrCreateUser(req, provider, function(err, user, isNewProvider) {
            if (err) {
                log.error("Fail to get user ");
                return done(err);
            }

            if (isNewProvider) {
                if (!blogBot.isStarted(user)) {
                    blogBot.start(user);
                }
                else {
                    blogBot.findOrCreate(user);
                }
            }

            process.nextTick(function () {
                return done(null, user);
            });
        });
    }
));

router.get('/authorize',
    passport.authenticate('tumblr')
);

router.get('/authorized',
    passport.authenticate('tumblr', { failureRedirect: '/#signin' }),
    function(req, res) {
        "use strict";

        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

router.get('/info', function (req, res) {
    "use strict";
    var userId;

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        var client;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        client.userInfo(function(error, data) {
            if (error) {

                //throw new Error(error);
                res.statusCode = 400;
                res.send(error);
                return;
            }
            log.debug(data);
            res.send(data);
        });
    });
});

router.get('/posts/:blogName', function (req, res) {
    "use strict";
    var userId;

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        var client;
        var blogName;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        blogName = req.params.blogName;

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        client.posts(blogName, function (error, response) {
            if (error) {

                //throw new Error(error);
                res.statusCode = 400;
                res.send(error);
                return;
            }
            log.debug(response);
            res.send(response);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    "use strict";
    var userId;
    var providerId;

    log.debug(req.url + ' : this is called by bot');

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    providerId = req.query.providerid;

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, providerId, function (err, user, provider) {
        var client;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        client.userInfo(function (error, response) {
            var send_data;
            var blogs;
            var i;

            if (error) {
                //throw new Error(error);
                res.statusCode = 400;
                res.send(error);
                return;
            }
            //log.debug(response);

            send_data = {};
            send_data.provider = provider;
            send_data.blogs = [];

            blogs = response.user.blogs;
            log.debug('blogs length=' + blogs.length);

            for (i = 0; i < blogs.length; i+=1) {
                send_data.blogs.push({"blog_id": blogs[i].name, "blog_title": blogs[i].title, "blog_url": blogs[i].url});
            }

            res.send(send_data);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    "use strict";
    var userId;

    log.debug("tumblr: "+ req.url + ' : this is called by bot');

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        var client;
        var blog_id;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        blog_id = req.params.blog_id;

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        client.blogInfo(blog_id, function(error, response) {
            if (error) {
                //throw new Error(error);
                log.error(error);
                res.statusCode = 400;
                res.send(error);
                return;
            }
            //log.debug(response);
            var send_data = {};
            send_data.provider_name = TUMBLR_PROVIDER;
            send_data.blog_id = response.blog.name;
            send_data.post_count = response.blog.posts;

            res.send(send_data);
        });
    });
 });

/**
 *
 * @param posts
 * @param raw_posts
 * @param is_body
 * @param after
 * @private
 */
function _pushPostsFromTumblr(posts, raw_posts, is_body, after) {
    "use strict";
    var i;
    var raw_post;
    var post_date;
    var after_date;
    var send_post;
    var j;

    for (i = 0; i<raw_posts.length; i+=1) {
        raw_post = raw_posts[i];

        post_date = new Date(raw_post.date);
        after_date = new Date(after);
        if (post_date < after_date) {
            //log.debug('post(' + raw_post.id + ') is before');
            continue;
        }

        send_post = {};
        send_post.title = raw_post.title;
        send_post.modified = raw_post.date;
        send_post.id = raw_post.id;
        send_post.url = raw_post.post_url;
        //tumblr does not support categories
//            send_post.categories = [];
//            for (var j=0;j<raw_post.categories.length;j++) {
//                send_post.categories.push(raw_post.categories[j]);
//            }
        send_post.tags = [];
        for (j=0; j<raw_post.tags.length; j+=1) {
            send_post.tags.push(raw_post.tags[j]);
        }
//            log.debug('tags-send');
//            log.debug(send_post.tags);

        switch (raw_post.type) {
            case "text":
                send_post.title = raw_post.title;
                if (is_body) {
                    send_post.content = raw_post.body;
                }
                break;
            case "photo":
                send_post.title = raw_post.caption;
                if (is_body) {
                    send_post.content = raw_post.photos; //it's no complete
                }
                break;
            case "quote":
                if (raw_post.text) {
                    send_post.title = raw_post.text;
                }
                else if (raw_post.source_title) {
                    send_post.title = raw_post.source_title;
                }
                if (is_body) {
                    send_post.content = raw_post.source;
                }
                break;
            case "link":
                send_post.title = raw_post.title;
                if (is_body) {
                    send_post.content = "url : raw_post.url"+" description : " + raw_post.description;
                }
                break;
            case "chat":
                send_post.title = raw_post.title;
                if (is_body) {
                    send_post.content = raw_post.body;
                }
                break;
            case "audio":
                if (raw_post.caption) {
                    send_post.title = raw_post.caption;
                }
                else if (raw_post.source_title) {
                    send_post.title = raw_post.source_title;
                }
                if (is_body) {
                    send_post.content = raw_post.player;
                }
                break;
            case "video":
                if (raw_post.caption) {
                    send_post.title = raw_post.caption;
                }
                else if (raw_post.source_title) {
                    send_post.title = raw_post.source_title;
                }
                if (is_body) {
                    send_post.content = raw_post.player[0].embed_code;
                }
                break;
            case "answer":
                send_post.title = raw_post.question;
                if (is_body) {
                    send_post.content = raw_post.answer;
                }
                break;
            default:
                log.debug('Fail to get type ' + raw_post.type);
                break;
        }
        send_post.replies = [];
        posts.push(send_post);
    }
}

router.get('/bot_posts/:blog_id', function (req, res) {
    "use strict";
    var userId;

    log.debug("tumblr: "+ req.url + ' : this is called by bot');

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        var client;
        var options;

        var blog_id = req.params.blog_id;
        var offset = req.query.offset;
        var after = req.query.after;
        var start_index;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        if (offset) {
            start_index = offset.split("-")[0];
            log.debug('offset=' + start_index);
            options = {offset: start_index};
        }

        client.posts(blog_id, options, function (error, response) {
            var send_data = {};

            if (error) {
                //throw new Error(error);
                res.statusCode = 400;
                res.send(error);
                return;
            }
            //log.debug(response);

            send_data.provider_name = TUMBLR_PROVIDER;
            send_data.blog_id = response.blog.name;
            send_data.post_count = 0;
            send_data.posts = [];
            _pushPostsFromTumblr(send_data.posts, response.posts, false, after);
            send_data.post_count = send_data.posts.length;

            res.send(send_data);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    "use strict";
    var userId;

    log.debug("tumblr: "+ req.url + ' : this is called by bot');

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        var client;
        var blog_id = req.params.blog_id;
        var post_id = req.params.post_id;
        var options;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        options = {id: post_id};

        client.posts(blog_id, options, function (error, response) {
            var send_data = {};

            if (error) {
                //throw new Error(error);
                res.statusCode = 400;
                res.send(error);
                return;
            }
            //log.debug(response);

            send_data.provider_name = TUMBLR_PROVIDER;
            send_data.blog_id = response.blog.name;
            send_data.post_count = 0;
            send_data.posts = [];

            _pushPostsFromTumblr(send_data.posts, response.posts, true, 0);
            send_data.post_count = send_data.posts.length;

            res.send(send_data);
        });
    });
});

router.post('/bot_posts/new/:blog_id', function (req, res) {
    "use strict";
    var userId;

    log.debug("tumblr: "+ req.url + ' : this is called by bot');

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TUMBLR_PROVIDER, undefined, function (err, user, provider) {
        var client;
        var blog_id;
        var options;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        blog_id = req.params.blog_id;
        options = {};

        client = tumblr.createClient({
            consumer_key: clientConfig.clientID,
            consumer_secret: clientConfig.clientSecret,
            token: provider.token,
            token_secret: provider.tokenSecret
        });

        if (req.body.content) {
            options.body = req.body.content;
        }
        else {
            log.debug("Fail to get content");
            res.send("Fail to get content");
            return;
        }

        if (req.body.title) {
            options.title = req.body.title;
        }

        if (req.body.tags) {
            options.tags = req.body.tags;
        }

        client.text(blog_id, options, function (error, response) {
            var options;

            if (error) {
                //throw new Error(error);
                res.statusCode = 400;
                res.send(error);
                return;
            }
            log.debug(response);
            options = response;

            client.posts(blog_id, options, function (error, response) {
                var send_data;

                if (error) {
                    //throw new Error(error);
                    res.statusCode = 400;
                    res.send(error);
                    return;
                }
                //log.debug(response);

                send_data = {};
                send_data.provider_name = TUMBLR_PROVIDER;
                send_data.blog_id = response.blog.name;
                send_data.post_count = 0;
                send_data.posts = [];

                _pushPostsFromTumblr(send_data.posts, response.posts, false, 0);
                send_data.post_count = send_data.posts.length;

                res.send(send_data);
            });
        });
    });
});

//router.get('/bot_comments/:blogID/:postID', function (req, res) {
//    log.debug(req.url);
//    var userID = _getUserId(req);
//    if (userID == 0) {
//        var errorMsg = 'You have to login first!';
//        log.debug(errorMsg);
//        res.send(errorMsg);
//        res.redirect("/#/signin");
//        return;
//    }
//
//    var blog_id = req.params.blog_id;
//    var post_id = req.params.post_id;
//
//    var p = userdb.findProvider(userID, "tumblr");
//    var client = tumblr.createClient({
//        consumer_key: clientConfig.clientID,
//        consumer_secret: clientConfig.clientSecret,
//        token: p.token,
//        token_secret: p.tokenSecret
//    });
//});

 module.exports = router;
