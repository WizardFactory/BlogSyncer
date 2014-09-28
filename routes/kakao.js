/**
 * Created by aleckim on 2014. 7. 19..
 */

var userdb = require('../models/userdb');

var express = require('express');
var passport = require('passport');
var request = require('request');
var KakaoStrategy = require('passport-kakao').Strategy;
var childm = require('./childmanager');

var router = express.Router();

var svcConfig = require('../models/svcConfig.json');
var clientConfig = svcConfig.kakao;

var KAKAO_API_URL = "https://kapi.kakao.com";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new KakaoStrategy({
        clientID: clientConfig.clientID,
        callbackURL: svcConfig.svcURL + "/kakao/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
//        console.log("accessToken:" + accessToken);
//        console.log("refreshToken:" + refreshToken);
//        console.log("profile:" + JSON.stringify(profile));

        var provider = {
            "providerName": profile.provider,
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": profile.id,
            "displayName": profile.username
        };

        var user = userdb.findOrCreate(req.user, provider);
        childm.sendMessage(user, 'findOrCreate');

        process.nextTick(function () {
            return done(null, user);
        });
    }
));

router.get('/authorize',
    passport.authenticate('kakao')
);

router.get('/authorized',
    passport.authenticate('kakao', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        console.log('Successful!');
        res.redirect('/#');
    }
);

function _getUserID(req, res) {
    var userid = 0;

    if (req.user) {
        userid = req.user.id;
    }
    else if (req.query.userid)
    {
       //this request form child process;
       userid = req.query.userid;
    }
    else {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
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
        return;
    }

    var p = userdb.findProvider(user_id, "kakao");

    var api_url = KAKAO_API_URL+"/v1/user/me";

    console.log(api_url);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, data) {
        console.log(data);
        res.send(data);
    });

});

router.get('/mystories', function (req, res) {
    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    var p = userdb.findProvider(user_id, "kakao");

    var api_url = KAKAO_API_URL+"/v1/api/story/mystories";

    console.log(api_url);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, data) {
        console.log(data);
        res.send(data);
    });
});

router.get('/bot_bloglist', function (req, res) {

    console.log(req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    var p = userdb.findProvider(user_id, "kakao");

    var api_url = KAKAO_API_URL+"/v1/user/me";

    console.log(api_url);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, data) {
        console.log(data);
        var nickname = data.properties.nickname;
        var blog_url = "stroy.kakao.com/" + nickname;
        var send_data = {};
        send_data.provider = p;
        send_data.blogs = [];
        send_data.blogs.push({"blog_id":nickname, "blog_title":nickname, "blog_url":blog_url});
/*
 { "provider":object, "blogs":
 [ {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"},
 {"blog_id":12, "blog_title":"wzdfac", "blog_url":"wzdfac.iptime.net"} ] },
 */
        res.send(send_data);
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {

    console.log(req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    //kakao did not support post_count.
    var blog_id = req.params.blog_id;
    var send_data = {};
    send_data.provider_name = 'kakao';
    send_data.blog_id = blog_id;
    send_data.post_count = -1;

    res.send(send_data);

    return;

 });

router.get('/bot_posts/:blog_id', function (req, res) {

    console.log(req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    var blog_id = req.params.blog_id;
    var last_id = req.query.offset;
    var after = req.query.after;
    var p = userdb.findProvider(user_id, "kakao");

    var api_url = KAKAO_API_URL+"/v1/api/story/mystories";
    if (last_id) {
        api_url += "?";
        api_url += "last_id=" + last_id;
    }

    console.log(api_url);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, data) {
        console.log(data);

        var send_data = {};
        send_data.provider_name = 'kakao';
        send_data.blog_id = blog_id;
        send_data.post_count = data.length;
        send_data.posts = [];

        for (var i = 0; i<data.length; i++) {
            var raw_post = data[i];
            var post_date = new Date(raw_post.created_at);
            var after_date = new Date(after);

            if (post_date < after_date) {
                //console.log('post is before');
                continue;
            }

            var send_post = {};
            //send_post.title;
            send_post.modified = raw_post.created_at;
            send_post.id = raw_post.id;
            send_post.url = raw_post.url;
            send_post.categories = [];
            send_post.tags = [];
            send_post.content = raw_post.content;

            send_data.posts.push(send_post);
        }
        res.send(send_data);
    });
});

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {

    console.log(req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    var blog_id = req.params.blog_id;
    var post_id = req.params.post_id;
    var p = userdb.findProvider(user_id, "kakao");

    var api_url = KAKAO_API_URL+"/v1/api/story/mystory";
    if (post_id) {
        api_url += "?";
        api_url += "id=" + post_id;
    }

    console.log(api_url);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, data) {

        console.log(data);

        var send_data = {};
        send_data.provider_name = 'kakao';
        send_data.blog_id = blog_id;
        send_data.post_count = 1;
        send_data.posts = [];

        {
            var raw_post = data;
            var send_post = {};
            //send_post.title;
            send_post.modified = raw_post.created_at;
            send_post.id = raw_post.id;
            send_post.url = raw_post.url;
            send_post.categories = [];
            send_post.tags = [];

            send_post.content = raw_post.content;
            send_post.replies = [];
            send_post.replies.push({"comment_count":raw_post.comment_count});
            send_post.replies.push({"like_count":raw_post.like_count});
            send_data.posts.push(send_post);
        }

        res.send(send_data);
    });
});

function _convertToURL(postId) {
    var indexOfDot = postId.indexOf(".");
    var str = postId.substring(0,indexOfDot);
    str += "/";
    str += postId.substring(indexOfDot+1);

    console.log(str);
    return str;
}

router.post('/bot_posts/new/:blog_id', function (req, res) {

    console.log(req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    var blog_id = req.params.blog_id;
    var p = userdb.findProvider(user_id, "kakao");

    var api_url = KAKAO_API_URL+"/v1/api/story/post/note";
    var new_post = {};
    new_post.content = "";
    console.log(api_url);

    if (req.body.title !== undefined) {
        new_post.content += req.body.title +'\n';
    }
    if (req.body.content) {
        new_post.content += req.body.content;
    }

    console.log(new_post);

    request.post(api_url, {
        headers: {
            "authorization": "Bearer " + p.accessToken
        },
        form: new_post
    }, function (err, response, data) {
        var _ref;
        if (!err && ((_ref = response.statusCode) !== 200 && _ref !== 301)) {
            err = "" + response.statusCode + " " ;
            console.log(err);
            res.send(err);
            return;
        }

        //console.log(data);

        //add post info
        var send_data = {};
        send_data.provider_name = 'kakao';
        send_data.blog_id = blog_id;
        send_data.posts = [];

        var send_post = {};
        var raw_post;
        if (typeof(data) === "string") {
            raw_post = JSON.parse(data);
        }
        else if (typeof(data) === "object") {
            raw_post = data;
        }

        send_post.modified = new Date();

        if (raw_post === undefined) {
            var errMsg = "Fail to post";
            console.log(errMsg);
            res.send(errMsg);
            return;
        }

        send_post.id = raw_post.id;
        send_post.url = "https://story.kakao.com" + "/" + _convertToURL(raw_post.id);
        send_post.categories = [];
        send_post.tags = [];
        send_post.content = new_post.content;

        send_data.posts.push(send_post);
        console.log(send_data);
        res.send(send_data);
    });
});


router.get('/bot_comments/:blogID/:postID', function (req, res) {
    console.log(req.url);

    var user_id = _getUserID(req);
    if (user_id == 0) {
        return;
    }

    var blog_id = req.params.blogID;
    var post_id = req.params.postID;
    var p = userdb.findProvider(user_id, "kakao");

    var api_url = KAKAO_API_URL+"/v1/api/story/mystory";
    if (post_id) {
        api_url += "?";
        api_url += "id=" + post_id;
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
        console.log(body);

        var send = {};
        send.providerName = "kakao";
        send.blogID = blog_id;
        send.postID = post_id;
        send.found = body.comment_count;
        send.comments = [];

        for(var i=0; i<body.comment_count; i++) {
            var comment = {};
            comment.URL = body.url;
            comment.content = body.comments[i].text;
            send.comments.push(comment);
        }
        res.send(send);
    });
});

module.exports = router;
