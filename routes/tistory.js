/**
 * Created by aleckim on 2014. 7. 20..
 */

var request = require('request');
var express = require('express');
var url = require('url');
var passport = require('passport');
var TistoryStrategy = require('passport-tistory').Strategy;

var User = require('../models/userdb');
var blogBot = require('./blogbot');

var router = express.Router();

var svcConfig = require('../models/svcConfig.json');
var clientConfig = svcConfig.tistory;

var log = require('winston');

var TISTORY_API_URL = "https://www.tistory.com/apis";

passport.serializeUser(function(user, done) {
    "use strict";
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    "use strict";
    done(null, obj);
});

function _updateOrCreateUser(req, provider, callback) {
    "use strict";
    User.findOne({'providers.providerName':provider.providerName,
            'providers.providerId': provider.providerId},
        function (err, user) {
            var p;
            var isNewProvider = false;

            if (err) {
                return callback(err);
            }

            // if there is a user id already but no token (user was linked at one point and then removed)
            if (user) {
                log.debug("Found user of pName="+provider.providerName+",pId="+provider.providerId);
                p = user.findProvider("tistory");
                if (p.accessToken !== provider.accessToken) {
                    p.accessToken = provider.accessToken;
                    p.refreshToken = provider.refreshToken;
                    user.save (function(err) {
                        if (err) {
                            return callback(err);
                        }
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
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, newUser, isNewProvider);
                    });
                }
            }
        } );
}

passport.use(new TistoryStrategy({
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        callbackURL: svcConfig.svcURL + "/tistory/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
        "use strict";
//       log.debug("accessToken:" + accessToken);
//       log.debug("refreshToken:" + refreshToken);
//       log.debug("profile:" + JSON.stringify(profile));

        var provider = {
            "providerName": 'tistory',
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": profile.userId,
            "displayName": profile.id
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
    passport.authenticate('tistory')
);

router.get('/authorized',
    passport.authenticate('tistory', { failureRedirect: '/#signin' }),
    function(req, res) {
        "use strict";
        // Successful authentication, redirect home.
        log.debug('Successful!');
        res.redirect('/#');
    }
);

function _getUserID(req, res) {
    "use strict";
    var userId;
    var errorMsg;

    if (req.user) {
        userId = req.user._id;
    }
    else if (req.query.userid) {

       //this request form child process;
       userId = req.query.userid;
    }
    else {
        errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
    }

    return userId;
}

function _checkError(err, response, body) {
    "use strict";
    var bodyErr;
    var errStr;

    if (err) {
        log.debug(err);
        return err;
    }
    if (response.statusCode >= 400) {
        bodyErr = body.meta ? body.meta.msg : body.error;
        errStr = 'tistory API error: ' + response.statusCode + ' ' + bodyErr;
        log.debug(errStr);
        return new Error(errStr);
    }
}

router.get('/info', function (req, res) {
    "use strict";
    var userId = _getUserID(req, res);

    if (!userId) {
        return;
    }

    User.findById(userId, function (err, user) {
        var p;
        var api_url;

        if (err) {
            log.error(err);
            res.send(err);
            return;
        }
        if (!user) {
            log.error("Fail to get user id="+userId);
            log.error(err);
            res.send(err);
            return;
        }

        p = user.findProvider("tistory");
        api_url = TISTORY_API_URL+"/blog/info?access_token="+ p.accessToken+"&output=json";

        log.debug(api_url);

        request.get(api_url, function (err, response, body) {

            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }
            log.debug(body);
            res.send(body);
        });
    });
});

router.get('/post/list/:simpleName', function (req, res) {
    "use strict";
    var userId = _getUserID(req, res);

    if (!userId) {
        return;
    }

    User.findById(userId, function (err, user) {
        var p;
        var api_url;
        var blog_name;

        if (err) {
            log.error(err);
            res.send(err);
            return;
        }
        if (!user) {
            log.error("Fail to get user id="+userId);
            log.error(err);
            res.send(err);
            return;
        }

        blog_name = req.params.simpleName;
        p = user.findProvider("tistory");
        if (!p) {
            log.error("Fail to find provider tistory");
            res.send("Fail to find provider tistory");
            return;
        }
        api_url = TISTORY_API_URL+"/post/list?access_token="+ p.accessToken;
        api_url = api_url + "&targetUrl=" + blog_name;
        api_url = api_url + "&output=json";

        log.debug(api_url);

        request.get(api_url, function (err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }
            //log.debug(body);
            res.send(body);
        });
    });
});

router.get('/bot_bloglist', function (req, res) {
    "use strict";
    var userId = _getUserID(req, res);

    if (!userId) {
        return;
    }

    User.findById(userId, function (err, user) {
        var p;
        var api_url;

        if (err) {
            log.error(err);
            res.send(err);
            return;
        }
        if (!user) {
            log.error("Fail to get user id="+userId);
            log.error(err);
            res.send(err);
            return;
        }

        p = user.findProvider("tistory");
        if (!p) {
            log.error("Fail to find provider tistory");
            res.send("Fail to find provider tistory");
            return;
        }

        api_url = TISTORY_API_URL + "/blog/info?access_token=" + p.accessToken + "&output=json";

        log.debug(api_url);
        request.get(api_url, function (err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }
            //log.debug(body);

            var send_data = {};
            send_data.provider = p;
            //log.debug(p);

            send_data.blogs = [];

            var item = JSON.parse(body).tistory.item;
            log.debug('item length=' + item.length);

            for (var i = 0; i < item.length; i++) {
                var hostname = url.parse(item[i].url).hostname;
                var target_url;
                if (hostname.indexOf('tistory.com') > -1) {
                    target_url = hostname.split('.')[0];
                }
                else {
                    target_url = hostname;
                }
                log.debug('target_url=', target_url);
                //tistory api had used targetUrl instead of blogId;
                send_data.blogs.push({"blog_id": target_url, "blog_title": item[i].title, "blog_url": item[i].url});
            }

            res.send(send_data);
        });
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {
    "use strict";
    var userId = _getUserID(req, res);

    if (!userId) {
        return;
    }

    User.findById(userId, function (err, user) {
        var p;
        var api_url;
        var target_url;

        if (err) {
            log.error(err);
            res.send(err);
            return;
        }
        if (!user) {
            log.error("Fail to get user id="+userId);
            log.error(err);
            res.send(err);
            return;
        }

        target_url = req.params.blog_id;
        p = user.findProvider("tistory");
        if (!p) {
            log.error("Fail to find provider tistory");
            res.send("Fail to find provider tistory");
            return;
        }
        api_url = TISTORY_API_URL + "/blog/info?";
        api_url = api_url + "access_token=" + p.accessToken;
        api_url += "&output=json";

        log.debug(api_url);

        request.get(api_url, function (err, response, body) {
            var hasError;
            var item;
            var i;
            var hostname;
            var target_host;
            var send_data;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }
            //log.debug(data);
            item = JSON.parse(body).tistory.item;
            log.debug('item length=' + item.length);

            for (i = 0; i < item.length; i++) {
                hostname = url.parse(item[i].url).hostname;
                target_host = hostname.split('.')[0];
                if (target_host === target_url) {
                    break;
                }
            }

            send_data = {};
            send_data.provider_name = 'tistory';

            if (i === item.length) {
                log.debug('Fail to find blog=' + target_url);
                send_data.blog_id = target_url;
                send_data.post_count = 0;
            }
            else {
                send_data.blog_id = target_url;
                send_data.post_count = item[i].statistics.post;
            }

            res.send(send_data);
        });
    });
});

router.get('/bot_posts/:blog_id', function (req, res) {
    "use strict";
    var userId;

    log.debug("tistory: "+ req.url);

    userId = _getUserID(req, res);
    if (!userId) {
        return;
    }

    User.findById(userId, function (err, user) {
        var p;
        var api_url;
        var target_url;
        var offset;
        var after;
        var count;
        var page;

        if (err) {
            log.error(err);
            res.send(err);
            return;
        }
        if (!user) {
            log.error("Fail to get user id="+userId);
            log.error(err);
            res.send(err);
            return;
        }

        target_url = req.params.blog_id;
        offset = req.query.offset;
        after = req.query.after;
        if (offset) {
            count = offset.split("-")[1];
            page = offset.split("-")[0] / count + 1; //start from 1
        }

        p = user.findProvider("tistory");
        if (!p) {
            log.error("Fail to find provider tistory");
            res.send("Fail to find provider tistory");
            return;
        }
        api_url = TISTORY_API_URL + "/post/list?";
        api_url = api_url + "access_token=" + p.accessToken;
        api_url += "&targetUrl=" + target_url; //조회할 티스토리 주소
        if (offset) {
            api_url += "&page=" + page;
            api_url += "&count=" + count;
        }
        if (after) {
            if (!offset) {
                api_url += "&count=" + 30;
            }
            api_url += "&sort=date";
        }
        api_url += "&output=json";

        //log.debug(api_url);

        request.get(api_url, function (err, response, body) {
            var hasError;
            var item;
            var send_data;
            var recv_post_count;
            var i;
            var raw_post;
            var post_date;
            var after_date;
            var send_post;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }
            //log.debug(body);
            item = JSON.parse(body).tistory.item;

            send_data = {};
            send_data.provider_name = 'tistory';
            send_data.blog_id = target_url;
            send_data.post_count = 0;
            send_data.posts = [];

            recv_post_count = 0;
            if (item.totalCount === 1) {
                recv_post_count = item.totalCount;
            }
            else {
                recv_post_count = item.posts.post.length;
            }
            //log.debug('tistory target_url='+target_url+' posts='+recv_post_count);

            for (i = 0; i < recv_post_count; i++) {
                raw_post = {};
                if (recv_post_count === 1) {
                    raw_post = item.posts.post;
                }
                else {
                    raw_post = item.posts.post[i];
                }
                post_date = new Date(raw_post.date);
                if (after) {
                    after_date = new Date(after);
                    if (post_date < after_date) {
                        //log.debug('post(' + raw_post.id + ') is before');
                        continue;
                    }
                    else {
                        log.debug('add post(' + raw_post.id + ')');
                    }
                }

                send_post = {};
                send_post.title = raw_post.title;
                send_post.modified = raw_post.date;
                send_post.id = raw_post.id;
                send_post.url = raw_post.postUrl;
                send_post.categories = [];
                //send_post.categories.push(change_to_string(raw_post.categoryId));
                send_post.categories.push(raw_post.categoryId);
                send_data.posts.push(send_post);
                send_data.post_count++;
            }
            res.send(send_data);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    "use strict";
    var userId;

    log.debug(req.url);
    userId = _getUserID(req, res);
    if (!userId) {
        return;
    }

    User.findById(userId, function (err, user) {
        var p;
        var api_url;
        var target_url;
        var post_id;

        if (err) {
            log.error(err);
            res.send(err);
            return;
        }
        if (!user) {
            log.error("Fail to get user id="+userId);
            log.error(err);
            res.send(err);
            return;
        }

        target_url = req.params.blog_id;
        post_id = req.params.post_id;
        p = user.findProvider("tistory");
        if (!p) {
            log.error("Fail to find provider tistory");
            res.send("Fail to find provider tistory");
            return;
        }

        api_url = TISTORY_API_URL + "/post/read?";
        api_url = api_url + "access_token=" + p.accessToken;
        api_url += "&targetUrl=" + target_url; //조회할 티스토리 주소
        api_url += "&postId=" + post_id;
        api_url += "&output=json";

        log.debug(api_url);
        request.get(api_url, function (err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }
            //log.debug(data);
            var item = JSON.parse(body).tistory.item;

            var send_data = {};
            send_data.provider_name = 'tistory';
            send_data.blog_id = target_url;
            send_data.posts = [];

            var raw_post = item;

            var send_post = {};
            send_post.title = raw_post.title;
            send_post.modified = raw_post.date; //it's write date tistory was not supporting modified date
            send_post.id = raw_post.id;
            send_post.url = raw_post.postUrl;
            send_post.categories = [];
            //send_post.categories.push(change_to_string(raw_post.categoryId));
            send_post.categories.push(raw_post.categoryId);

            send_post.content = raw_post.content;
            send_post.replies = [];
            send_post.replies.push({"comment_count": raw_post.comments});
            send_post.replies.push({"trackback_count": raw_post.trackbacks});
            send_data.posts.push(send_post);
            res.send(send_data);
        });
    });
 });


router.post('/bot_posts/new/:blog_id', function (req, res) {
    "use strict";
    //log.debug(req.url);
    var userId = _getUserID(req, res);

    if (!userId) {
        return;
    }

    User.findById(userId, function (err, user) {
        var p;
        var api_url;
        var target_url;
        var new_post;
        var category_id;

        if (err) {
            log.error(err);
            res.send(err);
            return;
        }
        if (!user) {
            log.error("Fail to get user id="+userId);
            log.error(err);
            res.send(err);
            return;
        }

        target_url = req.params.blog_id;
        p = user.findProvider("tistory");
        if (!p) {
            log.error("Fail to find provider tistory");
            res.send("Fail to find provider tistory");
            return;
        }

        api_url = TISTORY_API_URL + "/post/write";
        new_post = {};
        new_post.access_token = p.accessToken;
        new_post.targetUrl = target_url;
        new_post.visibility = 3; //3:발행

        //change catgory name to id
        if (req.body.title) {
            new_post.title = req.body.title;
        }
        else {
            log.error("Fail to get title");
            res.send("Fail to get title");
            return;
        }

        if (req.body.content) {
            new_post.content = req.body.content;
        }
        if (req.body.tags) {
            new_post.tag = req.body.tags;
        }

        category_id = 0;

        //get category_id from name
        if (category_id) {
            new_post.category_id = category_id;
        }
        new_post.output = "json";

        request.post(api_url, {
            form: new_post
        }, function (err, response, body) {
            var hasError;
            var item;
            var send_data;
            var send_post;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }

            //log.debug(body);
            item = JSON.parse(body).tistory;

            send_data = {};
            send_data.provider_name = 'tistory';
            send_data.blog_id = target_url;
            send_data.posts = [];

            send_post = {};
            send_post.title = new_post.title;
            //todo: get date
            send_post.modified = new Date();
            send_post.id = item.postId;
            send_post.url = item.url;
            send_post.categories = [];
            //send_post.categories.push(change_to_string(raw_post.categoryId));
            send_post.categories.push(new_post.category_id);

            send_data.posts.push(send_post);

            //log.debug(send_data);
            res.send(send_data);
        });
    });
});

router.get('/bot_comments/:blogID/:postID', function (req, res) {
    "use strict";
    var userId;

    log.debug(req.url);

    userId = _getUserID(req, res);
    if (!userId) {
        return;
    }

    User.findById(userId, function (err, user) {
        var p;
        var api_url;
        var targetURL;
        var postID;

        if (err) {
            log.error(err);
            res.send(err);
            return;
        }
        if (!user) {
            log.error("Fail to get user id="+userId);
            log.error(err);
            res.send(err);
            return;
        }

        targetURL = req.params.blogID;
        postID = req.params.postID;
        p = user.findProvider("tistory");
        if (!p) {
            log.error("Fail to find provider tistory");
            res.send("Fail to find provider tistory");
            return;
        }

        api_url = TISTORY_API_URL + "/comment/list?";
        api_url = api_url + "access_token=" + p.accessToken;
        api_url += "&targetUrl=" + targetURL; //조회할 티스토리 주소
        api_url += "&postId=" + postID;
        api_url += "&output=json";

        log.debug(api_url);

        request.get(api_url, function (err, response, body) {
            var hasError;
            var item;
            var send;
            var i;
            var comment;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.send(hasError);
                return;
            }
            //log.debug(body);
            item = JSON.parse(body).tistory.item;
            send = {};
            send.providerName = p.providerName;
            send.blogID = targetURL;
            send.postID = postID;
            send.found = item.totalCount;
            send.comments = [];
            for (i = 0; i < item.totalCount; i++) {
                comment = {};
                comment.date = item.comments.comment[i].date;
                comment.URL = item.url;
                comment.content = item.comments.comment[i].comment;
                send.comments.push(comment);
            }

            res.send(send);
        });
    });
});

module.exports = router;
