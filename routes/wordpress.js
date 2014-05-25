/**
 *
 * Created by aleckim on 2014. 5. 15..
 */

var express = require('express');
var WordPressRest = require('wordpressrest');
var router = express.Router();
var url = require('url');

var fs = require('fs');
var dbfilename = 'wordpressrest.db';
try {
    var wordpress_tokens = JSON.parse(fs.readFileSync(dbfilename)).wordpress_tokens;
}
catch (e) {}


var options = {
    wordpress_client_id: "35169",
    wordpress_client_secret: "giyzfEzoqkuwmjxuWT5Tz7E16NtKkud0zT4otmX9xNDH4AJE6mc3U5dGepYrPd5A",
    wordpress_redirect_uri: "http://www.justwapps.com/api/wordpress/authorized",
    wordpress_tokens: wordpress_tokens
};

var wordpressrest = new WordPressRest(options);

router.get('/', function(req, res) {
    console.log(req.url);
    if (!wordpressrest.wordpress_tokens) {
        /* This is called by RESTFull API, so need to redirect from client */
        res.write('NAU');
        res.end();
    }
    else {
        var pathname = url.parse(req.url).pathname;
        console.log('Already have wordpress tokens');
        var wurl = url.parse(req.url, true);
        wurl.pathname = pathname.substring(pathname.indexOf('/', 1));
        wurl.pathname = wurl.pathname + 'rest/v1/me';
        delete wurl.protocol;
        delete wurl.hostname;
        delete wurl.host;
        req.url = url.format(wurl);
        wordpressrest.call_wordpress(req, null, function(response){
            console.log('callback Bearer');
            console.log(response.body);
            this.writeHead(response.statusCode, response.headers);
            response.pipe(this);
        }.bind(res));
    }
});

router.get('/authorize', function(req, res) {
    console.log(req.url);
    wordpressrest.authorize(req, function(response) {
        console.log('statusCode: ' + response.statusCode);
        this.writeHead(response.statusCode, response.headers);
        response.pipe(this);
    }.bind(res));
});

router.get('/authorized', function(req,res) {
    console.log(req.url);
    delete req.headers['accept-encoding'];
    wordpressrest.get_access_token(req, function(res, dbfilename, response) {
        if(response.error) {
            console.log('response was error');
            res.end(JSON.stringify(response));
        }
        else if(response.statusCode != 200) {
            console.log('Error statusCode is not 200');
            res.writeHead(response.statusCode, response.headers);
            response.pipe(res);
        }
        else {
            var body = [];
            console.log('got access_token');
            response.on('data', function(chunk) {
                this.push(chunk);
            }.bind(body));
            response.on('end', function(res, body, dbfilename) {
                var tokens = JSON.parse(Buffer.concat(body).toString());
                if(this.wordpress_tokens) {
                    for(var k in tokens) {
                        this.wordpress_tokens[k] = tokens[k]
                    }
                }
                else {
                    this.wordpress_tokens = tokens;
                }
                fs.writeFile(dbfilename, JSON.stringify({'wordpress_tokens': this.wordpress_tokens}));
                res.end(JSON.stringify({'oauth2': 'authorized'}));
            }.bind(this, res, body, dbfilename));
        }
    }.bind(wordpressrest, res, dbfilename));
});
module.exports = router;

