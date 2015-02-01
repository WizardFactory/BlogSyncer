/**
 * Created by aleckim on 2014. 7. 20.
 */

var router = require('express').Router();
var passport = require('passport');
var request = require('request');
var url = require('url');

var blogBot = require('./blogbot');
var userMgr = require('./userManager');
var svcConfig = require('../models/svcConfig.json');

var clientConfig = svcConfig.tistory;
var TistoryStrategy = require('passport-tistory').Strategy;
var TISTORY_API_URL = "https://www.tistory.com/apis";
var TISTORY_PROVIDER = "tistory";

passport.serializeUser(function(user, done) {
    "use strict";
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    "use strict";
    done(null, obj);
});

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
            "providerName": TISTORY_PROVIDER,
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": profile.userId.toString(),
            "displayName": profile.id
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

router.get('/info', function (req, res) {
    "use strict";
    var userId = userMgr._getUserId(req, res);

    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        var api_url;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        api_url = TISTORY_API_URL+"/blog/info?access_token="+ provider.accessToken+"&output=json";

        log.debug(api_url);

        request.get(api_url, function (err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
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
    var userId = userMgr._getUserId(req, res);

    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        var api_url;
        var blog_name;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        blog_name = req.params.simpleName;
        api_url = TISTORY_API_URL+"/post/list?access_token="+ provider.accessToken;
        api_url = api_url + "&targetUrl=" + blog_name;
        api_url = api_url + "&output=json";

        log.debug(api_url);

        request.get(api_url, function (err, response, body) {
            var hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
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
    var userId = userMgr._getUserId(req, res);
    var providerId;
    if (!userId) {
        return;
    }

    providerId = req.query.providerid;

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, providerId, function (err, user, provider) {
        var api_url;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        api_url = TISTORY_API_URL + "/blog/info?access_token=" + provider.accessToken + "&output=json";

        log.debug(api_url);
        request.get(api_url, function (err, response, body) {
            var hasError;
            var send_data;
            var item;
            var i;
            var hostname;
            var target_url;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }
            //log.debug(body);

            send_data = {};
            send_data.provider = provider;
            //log.debug(p);

            send_data.blogs = [];

            item = JSON.parse(body).tistory.item;
            log.debug('item length=' + item.length);

            for (i = 0; i < item.length; i+=1) {
                hostname = url.parse(item[i].url).hostname;
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
    var userId = userMgr._getUserId(req, res);

    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        var api_url;
        var target_url;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        target_url = req.params.blog_id;
        api_url = TISTORY_API_URL + "/blog/info?";
        api_url = api_url + "access_token=" + provider.accessToken;
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
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }
            //log.debug(data);
            item = JSON.parse(body).tistory.item;
            log.debug('item length=' + item.length);

            for (i = 0; i < item.length; i+=1) {
                hostname = url.parse(item[i].url).hostname;
                target_host = hostname.split('.')[0];
                if (target_host === target_url) {
                    break;
                }
            }

            send_data = {};
            send_data.provider_name = TISTORY_PROVIDER;

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

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        var api_url;
        var target_url;
        var offset;
        var after;
        var count;
        var page;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        target_url = req.params.blog_id;
        offset = req.query.offset;
        after = req.query.after;
        if (offset) {
            count = offset.split("-")[1];
            page = offset.split("-")[0] / count + 1; //start from 1
        }

        api_url = TISTORY_API_URL + "/post/list?";
        api_url = api_url + "access_token=" + provider.accessToken;
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
                if (response.statusCode) {
                    res.statusCode = response.statusCode;
                }
                else {
                    log.error(" userId="+userId+" You have to set detail error!!");
                    res.statusCode = 400;
                }
                res.send(hasError);
                return;
            }
            //log.debug(body);
            item = JSON.parse(body).tistory.item;

            send_data = {};
            send_data.provider_name = TISTORY_PROVIDER;
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

            for (i = 0; i < recv_post_count; i+=1) {
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
                        log.debug("add post(" + raw_post.id + ")");
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
                send_data.post_count += 1;
            }
            res.send(send_data);
        });
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
    "use strict";
    var userId;

    log.debug(req.url);
    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        var api_url;
        var target_url;
        var post_id;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        target_url = req.params.blog_id;
        post_id = req.params.post_id;

        api_url = TISTORY_API_URL + "/post/read?";
        api_url = api_url + "access_token=" + provider.accessToken;
        api_url += "&targetUrl=" + target_url; //조회할 티스토리 주소
        api_url += "&postId=" + post_id;
        api_url += "&output=json";

        log.debug(api_url);
        request.get(api_url, function (err, response, body) {
            var hasError;
            var item;
            var send_data;
            var raw_post;
            var send_post;

            hasError = _checkError(err, response, body);
            if (hasError) {
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }
            //log.debug(data);
            item = JSON.parse(body).tistory.item;

            send_data = {};
            send_data.provider_name = TISTORY_PROVIDER;
            send_data.blog_id = target_url;
            send_data.posts = [];

            raw_post = item;

            send_post = {};
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
    var userId = userMgr._getUserId(req, res);

    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        var api_url;
        var target_url;
        var new_post;
        var category_id;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        target_url = req.params.blog_id;
        api_url = TISTORY_API_URL + "/post/write";
        new_post = {};
        new_post.access_token = provider.accessToken;
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
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }

            //log.debug(body);
            item = JSON.parse(body).tistory;

            send_data = {};
            send_data.provider_name = TISTORY_PROVIDER;
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

    userId = userMgr._getUserId(req, res);
    if (!userId) {
        return;
    }

    userMgr._findProviderByUserId(userId, TISTORY_PROVIDER, undefined, function (err, user, provider) {
        var api_url;
        var targetURL;
        var postID;

        if (err) {
            log.error("Fail to find provider");
            log.error(err.toString());
            return res.send(err);
        }

        targetURL = req.params.blogID;
        postID = req.params.postID;
        api_url = TISTORY_API_URL + "/comment/list?";
        api_url = api_url + "access_token=" + provider.accessToken;
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
                res.statusCode = response.statusCode;
                res.send(hasError);
                return;
            }
            //log.debug(body);
            item = JSON.parse(body).tistory.item;
            send = {};
            send.providerName = provider.providerName;
            send.blogID = targetURL;
            send.postID = postID;
            send.found = item.totalCount;
            send.comments = [];
            for (i = 0; i < item.totalCount; i+=1) {
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

function _checkError(err, response, body) {
    "use strict";
    var bodyErr;
    var errStr;

    if (err) {
        log.error(err);
        return err;
    }
    if (response.statusCode >= 400) {
        bodyErr = body.meta ? body.meta.msg : body.error;
        errStr = 'tistory API error: ' + response.statusCode + ' ' + bodyErr;
        log.debug(errStr);
        return new Error(errStr);
    }
}

module.exports = router;
