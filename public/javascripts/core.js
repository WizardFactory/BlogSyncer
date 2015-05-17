/**
 * Created by aleckim on 2014. 5. 15..
 */
var bs = angular.module("BlogSyncer", ['ngRoute', 'ngSanitize', 'ui.bootstrap']);

// define service
bs.factory('Data', function () {
    "use strict";

    var user = {};
    var providerType = ["facebook", "google", "kakao", "tistory", "tumblr", "twitter", "Wordpress"];
    var postType = [
        ["post","post","post","post","post","post","post"],
        ["link","post","link","post","post","link","post"],
        ["post","post","post","post","post","post","post"],
        ["link","post","link","post","post","link","post"],
        ["link","post","link","post","post","link","post"],
        ["post","post","post","post","post","post","post"],
        ["link","post","link","post","post","link","post"]
    ];
//    var port = -1;

    return {
        getUser: function () {
            return user;
        },
        setUser: function (usr) {
            user = usr;
        },
        getPostType: function (fromProvider, toProvider) {
            if (typeof(fromProvider) === 'number' && typeof(toProvider) === 'number') {
                return postType[fromProvider][toProvider];
            }
            else {
                var from = providerType.indexOf(fromProvider);
                var to = providerType.indexOf(toProvider);
                return postType[from][to];
            }
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

bs.factory('Site', function SiteList($http) {
   "use strict";
    var sites;

    return {
        getSiteList: function getSiteList() {
            return sites;
        },
        pullSitesFromServer: function pullSitesFromServer(cb) {
            console.log("pullSitesFromServer: blogs/sites");

            sites = [];
            $http.get("/blogs/sites")
                .success(function (data) {
                    console.log(data);
                    for (var i = 0; i < data.sites.length; i += 1) {
                        for (var j = 0; j < data.sites[i].blogs.length; j += 1) {
                            var site = {'provider' : data.sites[i].provider, 'blog' : data.sites[i].blogs[j]};
                            sites.push(site);
                        }
                    }
                    cb(undefined, sites);
                })
                .error(function (data) {
                    var errStr = 'Error: ' + data;
                    cb(errStr);
                });
        }
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