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

var Logger = require('./controllers/log');
global.log  = new Logger(__dirname + "/debug.log");

var svcConfig = require('./config/all');

var app = express();
var blogBot = require('./controllers/blogBot');

var connectInfo = svcConfig.db;

log.info(connectInfo);

mongoose.connect(connectInfo);

blogBot.load();

/* server마다 시간 오차가 있을 수 있음. 원래는 그래도 상관없을 수 있으나, 정확한 분석이 필요. */
setInterval(function() {

    blogBot.task();
}, 1000*30); //1 min

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(__dirname + '/public/views/imgs/favicon.ico'));

if (process.env.NODE_ENV === 'development') {
    // Enable logger (morgan)
    app.use(morgan('dev'));

    // Disable views cache
    app.set('view cache', false);
} else if (process.env.NODE_ENV === 'production') {
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

app.use('/user', function (req, res) {
   if (!req.user) {
        res.write('NAU');
   }
   else {
       res.write(JSON.stringify(req.user));
   }
   res.end();
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
