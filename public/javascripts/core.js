/**
 * Created by aleckim on 2014. 5. 15..
 */
var bs = angular.module("BlogSyncer", ['ngRoute', 'ngSanitize', 'ui.bootstrap']);

// define service
bs.factory('User', function () {
    "use strict";

    var user= {};
//    var port = -1;

    return {
        getUser: function () {
            return user;
        },
        setUser: function (usr) {
            user = usr;
        }
//        getChildPort: function() {
//           console.log('getChildPort port='+port);
//           return port;
//        },
//        setChildPort: function(prt) {
//            console.log('setChildPort port='+prt);
//            port = prt;
//            console.log('port='+port);
//        }
    };
});

// setting module
bs.config(function ($routeProvider) {
    "use strict";

    $routeProvider
        // route for cover page
        .when('/', {
            templateUrl : '../views/home.html',
            controller : 'homeCtrl'
        })
        // route for blog page
        .when('/blog/blogRegister', {
            templateUrl : '../views/blog/registerBlog.html',
            controller : 'blogRegisterCtrl'
        })
        .when('/blog/blogSetSync', {
            templateUrl : '../views/blog/setSync.html',
            controller : 'blogCtrl'
        })
        .when('/blog/blogHistorySync', {
            templateUrl : '../views/blog/historySync.html',
            controller : 'blogHistoryCtrl'
        })
        .when('/blog/blogCollectFeedback', {
            templateUrl : '../views/blog/collectFeedback.html',
            controller : 'blogCollectFeedbackCtrl'
        })
        // route for sign in page
        .when('/signin', {
            templateUrl : '../views/signin.html',
            controller : 'signinCtrl'
        });
});