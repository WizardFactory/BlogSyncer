/**
 * @ngdoc directive
 * @name rfx.directive:rAutogrow
 * @element textarea
 * @function
 *
 * @description
 * Resize textarea automatically to the size of its text content.
 *
 * **Note:** ie<9 needs pollyfill for window.getComputedStyle
 *
 * @example
 <example module="rfx">
 <file name="index.html">
 <textarea ng-model="text" r-autogrow class="input-block-level"></textarea>
 <pre>{{text}}</pre>
 </file>
 </example>
 */

"use strict";

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var session = require('express-session');
var mongoose = require('mongoose');

var facebook = require('./routes/facebook');
var google = require('./routes/google');
var kakao = require('./routes/kakao');
var tumblr = require('./routes/tumblr');
var twitter = require('./routes/twitter');
var Wordpress = require('./routes/wordpress');
var tistory = require('./routes/tistory');
var blogRoutes = require('./routes/blogRoutes');
var blogBot = require('./controllers/blogBot');
var userMgr = require('./controllers/userManager');

var svcConfig = require('./config/all');
var Logger = require('./controllers/log');

var app = express();

if (app.get('env') === 'development') {
    global.log = new Logger(__dirname + "/debug.log");
}
else {
    global.log = new Logger();
}

var connectInfo = svcConfig.db;

log.info(connectInfo);

mongoose.connect(connectInfo);

blogBot.load();


setTimeout(function() {
    blogBot.task();
}, 1000*30); //30 secs

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(__dirname + '/public/views/imgs/favicon.ico'));

if (app.get('env') === 'development') {
    // Enable logger (morgan)
    app.use(morgan('dev'));

    // Disable views cache
    app.set('view cache', false);
} else {
    app.locals.cache = 'memory';
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/facebook', facebook);
app.use('/google', google);
app.use('/kakao', kakao);
app.use('/tumblr', tumblr);
app.use('/twitter', twitter);
app.use('/Wordpress', Wordpress);
app.use('/tistory', tistory);
app.use('/blogs', blogRoutes);

app.route('/user')
    .get(function(req, res) {
        if (!req.user) {
            res.write('NAU');
        }
        else {
            res.write(JSON.stringify(req.user));
        }
        res.end();
    });

app.route('/user/:reqProviderIndex')
    .delete(function (req, res) {
        if (!req.user) {
            res.write('NAU');
        }

        var providerIndex = req.params.reqProviderIndex;
        var provider = req.user.providers[providerIndex];

        userMgr.deleteProvider(req.user, providerIndex, function(err, user) {
                if (err) {
                    log.error(err);
                    return res.status(err.statusCode).send(err);
            }
            blogBot.deleteSitesOfProvider(user, provider, function(err, sites) {
                if (err) {
                    log.error(err);
                    return res.status(err.statusCode).send(err);
                }
                log.debug(sites);
                req.logIn(user, function(error) {
                    if (!error) {
                        // successfully serialized user to session
                        res.end();
                    }
                });
            });
        });
    });

app.use('/logout', function (req, res) {
    req.logout();
    res.redirect("/#");
});

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error("Not Found : "+req.url);
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
