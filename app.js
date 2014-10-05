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

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var session = require('express-session');


var userdb = require('./models/userdb');

var facebook = require('./routes/facebook');
var google = require('./routes/google');
var kakao = require('./routes/kakao');
var tumblr = require('./routes/tumblr');
var twitter = require('./routes/twitter');
var Wordpress = require('./routes/wordpress');
var tistory = require('./routes/tistory');
var blogRoutes = require('./routes/blogRoutes');

var log = require('./routes/log');

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(__dirname + '/public/views/imgs/favicon.ico'));
app.use(logger('dev'));
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
       console.log('user ' + JSON.stringify(req.user));
       res.write(JSON.stringify(req.user));
   }
   res.end();
});

app.use('/logout', function (req, res) {
    req.logout();
    res.redirect("/#");
});

var blogBot = require('./routes/blogbot');

setInterval(function() {
    blogBot.task();
}, 1000*60); //1 min

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
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
