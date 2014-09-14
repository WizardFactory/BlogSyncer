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

    var target_url = req.params.blog_id;
    var p = userdb.findProvider(user_id, "tistory");

    var api_url = API_TISTORY_COM+"blog/info?";
    api_url = api_url + "access_token="+ p.accessToken;
    api_url += "&output=json";

    console.log(api_url);
    request.get(api_url, function (err, response, data) {
        //console.log(data);
        var item = JSON.parse(data).tistory.item;
        console.log('item length=' + item.length);

        for (var i=0;i<item.length;i++) {
            var hostname = url.parse(item[i].url).hostname;
            var target_host = hostname.split('.')[0];
            if (target_host == target_url) {
                break;
            }
        }

        var send_data = {};
        send_data.provider_name = 'tistory';

        if (i == item.length) {
            console.log('Fail to find blog='+target_url);
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

router.get('/bot_posts/:blog_id', function (req, res) {

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
    var offset = req.query.offset;
    var after = req.query.after;
    if (offset) {
        var count = offset.split("-")[1];
        var page = offset.split("-")[0] / count + 1; //start from 1
    }
    var p = userdb.findProvider(user_id, "tistory");

    var api_url = API_TISTORY_COM+"post/list?";
    api_url = api_url + "access_token="+ p.accessToken;
    api_url += "&targetUrl="+target_url; //조회할 티스토리 주소
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

    console.log(api_url);
    request.get(api_url, function (err, response, data) {
        //console.log(data);
        var item = JSON.parse(data).tistory.item;

        var send_data = {};
        send_data.provider_name = 'tistory';
        send_data.blog_id = target_url;
        send_data.post_count = 0;
        send_data.posts = [];

        var recv_post_count = 0;
        if (item.totalCount == 1) {
            recv_post_count = item.totalCount;
        }
        else {
           recv_post_count =  item.posts.post.length;
        }
        console.log('tistory target_url='+target_url+' posts='+recv_post_count);

        for (var i = 0; i<recv_post_count; i++) {
            var raw_post = {};
            if (item.totalCount == 1) {
                raw_post = item.posts.post;
            }
            else {
                raw_post = item.posts.post[i];
            }
            var post_date = new Date(raw_post.date);
            if (after) {
                var after_date = new Date(after);
                if (post_date < after_date) {
                    console.log('post(' + raw_post.id + ') is before');
                    continue;
                }
                else {
                    console.log('add post(' + raw_post.id + ')');
                }
            }

            var send_post = {};
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

router.get('/bot_posts/:blog_id/:post_id', function (req, res) {
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
    var post_id = req.params.post_id;
    var p = userdb.findProvider(user_id, "tistory");

    var api_url = API_TISTORY_COM+"post/read?";
    api_url = api_url + "access_token="+ p.accessToken;
    api_url += "&targetUrl="+target_url; //조회할 티스토리 주소
    api_url += "&postId="+post_id;
    api_url += "&output=json";

    console.log(api_url);
    request.get(api_url, function (err, response, data) {

        console.log(data);
        var item = JSON.parse(data).tistory.item;

        var send_data = {};
        send_data.provider_name = 'tistory';
        send_data.blog_id = target_url;
        send_data.posts = [];

        var raw_post = item;
        var post_date = new Date(raw_post.date);

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
        send_post.replies.push({"comment_count":raw_post.comments});
        send_post.replies.push({"trackback_count":raw_post.trackbacks});
        send_data.posts.push(send_post);
        res.send(send_data);
    });
 });


router.post('/bot_posts/new/:blog_id', function (req, res) {
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
    var p = userdb.findProvider(user_id, "tistory");

    var api_url = API_TISTORY_COM+"post/write";
    var new_post = {};
    new_post.access_token  = p.accessToken;
    new_post.targetUrl = target_url;
    new_post.visibility = 3; //3:발행

    //change catgory name to id
    if (req.body.title) {
        new_post.title =  req.body.title;
    }
    else {
       console.log("Fail to get title");
       res.send("Fail to get title");
       return;
    }

    if (req.body.content) {
        new_post.content = req.body.content;
    }
    if (req.body.tags) {
        new_post.tag=req.body.tags;
    }
    var category_id = 0;
    //get category_id from name
    if (category_id) {
        new_post.category_id = category_id;
    }
    new_post.output = "json";

    console.log(api_url);
    console.log(new_post);

    request.post(api_url,{
        form: new_post
    }, function (err, response, data) {
        var _ref;
        if (!err && ((_ref = response.statusCode) !== 200 && _ref !== 301)) {
            err = "" + response.statusCode + " " ;
            console.log(err);
            console.log(data);
            res.send(err);
            return;
        }

        console.log(data);
        var item = JSON.parse(data).tistory;

        var send_data = {};
        send_data.provider_name = 'tistory';
        send_data.blog_id = target_url;
        send_data.posts = [];

        var send_post = {};
        send_post.title = new_post.title;
        //todo: get date
        send_post.modified = new Date();
        send_post.id = item.postId;
        send_post.url = item.url;
        send_post.categories = [];
        //send_post.categories.push(change_to_string(raw_post.categoryId));
        send_post.categories.push(new_post.category_id);

        send_data.posts.push(send_post);

        console.log(send_data);
        res.send(send_data);
    });
});

module.exports = router;
