var userdb      = require('../../models/userdb');
var request     = require('request');

var API_WORDPRESS_COM = "https://public-api.wordpress.com/rest/v1";

function getWPPosts(req, res) {
    if (!req.user) {
        console.log('You have to login first!');
        res.send('You have to login first!');
    }
    else {
        var p = userdb.findProvider(req.user.id, "Wordpress");
        var blog_id = 72408697;//64797719;//req.params.blog_id;

        var api_url = API_WORDPRESS_COM+"/sites/"+blog_id+"/posts";

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
    }
}

function getWPComments(req, res) {
    if (!req.user) {
        console.log('You have to login first!');
        res.send('You have to login first!');
    }
    else {
        var p = userdb.findProvider(req.user.id, "Wordpress");
        var blog_id = 72408697;//64797719;//req.params.blog_id;                // FIX ME
        var posts_id = req.params.postsID;
        var api_url = API_WORDPRESS_COM+"/sites/"+blog_id+"/posts/"+posts_id+"/replies";
        //var api_url = API_WORDPRESS_COM+"/sites/"+blog_id+"/comments";

        //console.log(req);

        request.get(api_url, {
            json: true,
            headers: {
                "authorization": "Bearer " + p.accessToken
            }
        }, function (err, response, data) {
            console.log(data);
            res.send(data);
        });
    }
}

exports.API_WORDPRESS_COM   = API_WORDPRESS_COM;

exports.getWPPosts          = getWPPosts;
exports.getWPComments       = getWPComments;
