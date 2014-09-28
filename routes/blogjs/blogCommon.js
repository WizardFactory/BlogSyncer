var userdb      = require('../../models/userdb');
var request     = require('request');

var log         = require('winston');

var API_WORDPRESS_COM = "https://public-api.wordpress.com/rest/v1";

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

function getWPPosts(req, res) {
    var user_id = getUserId(req);
    log.debug(user_id);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    //var p = userdb.findProviderId(user_id, req.query.providerid);
    var p = userdb.findProvider(user_id, "Wordpress");
    log.debug(p);
    var blog_id = p.providerId;
    log.debug(blog_id);
    var api_url = API_WORDPRESS_COM+"/sites/"+blog_id+"/posts";

    log.debug(api_url);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, data) {
        log.debug("[blogCommon-getWPPosts]" + data);
        res.send(data);
    });
}

function getWPComments(req, res) {
    var user_id = getUserId(req);
    if (user_id == 0) {
        var errorMsg = 'You have to login first!';
        log.debug(errorMsg);
        res.send(errorMsg);
        res.redirect("/#/signin");
        return;
    }

    var p = userdb.findProvider(user_id, "Wordpress");
    var blog_id = p.providerId;
    var posts_id = req.params.postsID;
    var api_url = API_WORDPRESS_COM+"/sites/"+blog_id+"/posts/"+posts_id+"/replies";
    //var api_url = API_WORDPRESS_COM+"/sites/"+blog_id+"/comments";

    //log.debug(req);

    request.get(api_url, {
        json: true,
        headers: {
            "authorization": "Bearer " + p.accessToken
        }
    }, function (err, response, data) {
        log.debug(data);
        res.send(data);
    });
}

exports.API_WORDPRESS_COM   = API_WORDPRESS_COM;

exports.getWPPosts          = getWPPosts;
exports.getWPComments       = getWPComments;
