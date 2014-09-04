/**
 * Created by aleckim on 2014. 7. 20..
 */


var request = require('request');
var express = require('express');
var url = require('url');
var passport = require('passport');
var TistoryStrategy = require('passport-tistory').Strategy;

var userdb = require('../models/userdb');
var childm = require('./childmanager');

var router = express.Router();

var TISTORY_CLIENT_ID = "790c21e5390770f3463d9b428fab8622";
var TISTORY_CLIENT_SECRET = "790c21e5390770f3463d9b428fab86225dff8f624e5d52c94ce86e2eb85a106696450c6e";
var API_TISTORY_COM = "https://www.tistory.com/apis/";

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new TistoryStrategy({
        clientID: TISTORY_CLIENT_ID,
        clientSecret: TISTORY_CLIENT_SECRET,
        callbackURL: "http://www.justwapps.com/tistory/authorized",
        passReqToCallback : true
    },
    function(req, accessToken, refreshToken, profile, done) {
//       console.log("accessToken:" + accessToken);
//       console.log("refreshToken:" + refreshToken);
//       console.log("profile:" + JSON.stringify(profile));

        var provider = {
            "providerName": 'tistory',
            "accessToken": accessToken,
            "refreshToken": refreshToken,
            "providerId": profile.userId,
            "displayName": profile.id
        };

        var user = userdb.findOrCreate(req.user, provider);
        childm.sendMessage(user, 'findOrCreate');

        process.nextTick(function () {
            return done(null, user);
        });
    }
));

router.get('/authorize',
    passport.authenticate('tistory')
);

router.get('/authorized',
    passport.authenticate('tistory', { failureRedirect: '/#signin' }),
    function(req, res) {
        // Successful authentication, redirect home.
        console.log('Successful!');
        res.redirect('/#');
    }
);

getUserId = function (req) {
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
};

router.get('/info', function (req, res) {
    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var p = userdb.findProvider(user_id, "tistory");

    var api_url = API_TISTORY_COM+"blog/info?access_token="+ p.accessToken+"&output=json";

    console.log(api_url);
    request.get(api_url, function (err, response, data) {
        console.log(data);
        res.send(data);
    });
});

router.get('/post/list/:simpleName', function (req, res) {
    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var p = userdb.findProvider(user_id, "tistory");
    var blog_name = req.params.simpleName;
    var api_url = API_TISTORY_COM+"post/list?access_token="+ p.accessToken;
    api_url = api_url + "&targetUrl=" + blog_name;
    api_url = api_url + "&output=json";

    console.log(api_url);
    request.get(api_url, function (err, response, data) {
        console.log(data);
        res.send(data);
    });
});

router.get('/bot_bloglist', function (req, res) {

    console.log(req.url);

    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var p = userdb.findProvider(user_id, "tistory");

    var api_url = API_TISTORY_COM+"blog/info?access_token="+ p.accessToken+"&output=json";

    console.log(api_url);
    request.get(api_url, function (err, response, data) {
        //console.log(data);
        var send_data = {};
        send_data.provider = p;
        send_data.blogs = [];

        var item = JSON.parse(data).tistory.item;
        console.log('item length=' + item.length);

        for (var i=0;i<item.length;i++) {
            var hostname = url.parse(item[i].url).hostname;
            var target_url;
            if(hostname.indexOf('tistory.com') > -1) {
                target_url = hostname.split('.')[0];
            }
            else {
                target_url = hostname;
            }
            console.log('target_url=', target_url);
            //tistory api had used targetUrl instead of blogId;
            send_data.blogs.push({"blog_id":target_url, "blog_title":item[i].title, "blog_url":item[i].url});
        }

        res.send(send_data);
    });
});

router.get('/bot_post_count/:blog_id', function (req, res) {

    console.log(req.url);

    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var blog_id = req.params.blog_id;
    var p = userdb.findProvider(user_id, "tistory");

    var api_url = API_TISTORY_COM+"blog/info?";
    api_url = api_url + "access_token="+ p.accessToken;
    api_url += "&blog_id="+blog_id;
    api_url += "&output=json";

    console.log(api_url);
    request.get(api_url, function (err, response, data) {
        //console.log(data);
        var blog_id = req.params.blog_id;
        var item = JSON.parse(data).tistory.item;
        console.log('item length=' + item.length);

        for (var i=0;i<item.length;i++) {
            var hostname = url.parse(item[i].url).hostname;
            var target_url = hostname.split('.')[0];
            if (target_url == blog_id) {
                break;
            }
        }

        var send_data = {};
        send_data.provider_name = 'tistory';

        if (i == item.length) {
            console.log('Fail to find blog='+blog_id);
            send_data.blog_id = blog_id;
            send_data.post_count = 0;
        }
        else {
            send_data.blog_id = blog_id;
            send_data.post_count = item[i].statistics.post;
        }

        res.send(send_data);
    });
});

router.get('/bot_posts/:blog_id/:offset', function (req, res) {

    console.log(req.url);

    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        console.log(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var target_url = req.params.blog_id;
    var offset = req.params.offset;
    var count = offset.split("-")[1];
    var page = offset.split("-")[0]/count+1; //start from 1
    var p = userdb.findProvider(user_id, "tistory");

    var api_url = API_TISTORY_COM+"post/list?";
    api_url = api_url + "access_token="+ p.accessToken;
    api_url += "&targetUrl="+target_url; //조회할 티스토리 주소
    api_url += "&page="+page;
    api_url += "&count="+count;
    api_url += "&output=json";

    console.log(api_url);
    request.get(api_url, function (err, response, data) {
        var target_url = req.params.targetUrl;
        console.log(data);
        var item = JSON.parse(data).tistory.item;

        var send_data = {};
        send_data.provider_name = 'tistory';
        send_data.blog_id = target_url;
        send_data.post_count = item.posts.post.length;
        send_data.posts = [];

        for (var i = 0; i<item.posts.post.length; i++) {
            var raw_post = item.posts.post[i];
            var send_post = {};
            send_post.title = raw_post.title;
            send_post.modified = raw_post.date;
            send_post.id = raw_post.id;
            send_post.url = raw_post.postUrl;
            send_post.categories = [];
            //send_post.categories.push(change_to_string(raw_post.categoryId));
            send_post.categories.push(raw_post.categoryId);
            send_data.posts.push(send_post);
        }
        res.send(send_data);
    });
});

module.exports = router;
