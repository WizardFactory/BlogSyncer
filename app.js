var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
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
var wordpress = require('./routes/wordpress');
var tistory = require('./routes/tistory');
var blogRoutes = require('./routes/blogRoutes');

var app = express();

app.use(favicon());
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
app.use('/Wordpress', wordpress);
app.use('/tistory', tistory);
app.use('/blog', blogRoutes);

app.get('*', function(req, res) {
    res.redirect('/#' + req.originalUrl);
});

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

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
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
