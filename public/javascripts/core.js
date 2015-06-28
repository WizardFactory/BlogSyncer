/**
 * Created by aleckim on 2014. 5. 15..
 */
var bs = angular.module("BlogSyncer", ['ngRoute', 'ngSanitize', 'ui.bootstrap', 'pascalprecht.translate']);

// define service
bs.factory('Data', function (Type, $http) {
    "use strict";

    var user = null;
    var sites = null;
    var groups = null;
    var providerType = [Type.PROVIDER.FACEBOOK, Type.PROVIDER.GOOGLE, Type.PROVIDER.KAKAO,
        Type.PROVIDER.TISTORY, Type.PROVIDER.TUMBLR, Type.PROVIDER.TWITTER, Type.PROVIDER.WORDPRESS];
    var postType = [
        [Type.POST.POST, Type.POST.POST, Type.POST.POST, Type.POST.POST, Type.POST.POST, Type.POST.POST, Type.POST.POST],
        [Type.POST.LINK, Type.POST.POST, Type.POST.LINK, Type.POST.POST, Type.POST.POST, Type.POST.LINK, Type.POST.POST],
        [Type.POST.POST, Type.POST.POST, Type.POST.POST, Type.POST.POST, Type.POST.POST, Type.POST.POST, Type.POST.POST],
        [Type.POST.LINK, Type.POST.POST, Type.POST.LINK, Type.POST.POST, Type.POST.POST, Type.POST.LINK, Type.POST.POST],
        [Type.POST.LINK, Type.POST.POST, Type.POST.LINK, Type.POST.POST, Type.POST.POST, Type.POST.LINK, Type.POST.POST],
        [Type.POST.POST, Type.POST.POST, Type.POST.POST, Type.POST.POST, Type.POST.POST, Type.POST.POST, Type.POST.POST],
        [Type.POST.LINK, Type.POST.POST, Type.POST.LINK, Type.POST.POST, Type.POST.POST, Type.POST.LINK, Type.POST.POST]
    ];
//    var port = -1;

    return {
        getUser: function () {
            return user;
        },
        setUser: function (user) {
            user = user;
        },
        pullUserFromServer: function (cb) {
            console.log("pullUserFromServer: user");

            $http.get('/user')
                .success(function (data) {
                    if (data === 'NAU') {
                        console.log('NAU');
                    }
                    else {
                        user = data;
                        cb(undefined, user);
                    }
                })
                .error(function (data) {
                    cb(data);
                });
        },
        getSiteList: function () {
            return sites;
        },
        pullSitesFromServer: function (cb) {
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
                    cb(data);
                });
        },
        getGroups: function () {
            return groups;
        },
        pullGroupsFromServer: function (cb) {
            console.log("pullGroupsFromServer: blogs/groups");

            $http.get("/blogs/groups")
                .success(function (data) {
                    console.log(data);
                    groups = data.groups;
                    cb(undefined, groups);
                })
                .error(function (data) {
                    cb(data);
                });
        },
        getProviderType: function() {
            return providerType;
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

bs.config(function ($translateProvider) {
    "use strict";

    //$translateProvider.translations('kor', langData.kor);
    //language change : $translate.use(langKey);
    //string translate : {{'TRANSLATION_ID' | translate}}

    $translateProvider.useStaticFilesLoader({
        prefix: 'views/strings/',
        suffix: '.json'
    });
    var lang = navigator.language.split("-"); //ko, ko-kr 둘 다 ko로 설정
    $translateProvider.preferredLanguage(lang[0]);
});


bs.constant("Type", {
    MENU: {
        HOME: 0,
        BLOG_REGISTER: 1,
        COLLECT_FEEDBACK: 2,
        HISTORY : 3,
        SIGNIN : 4
    },
    PROVIDER: {
        WORDPRESS: 'Wordpress',
        TISTORY: 'tistory',
        GOOGLE: 'google',
        FACEBOOK: 'facebook',
        TUMBLR: 'tumblr',
        TWITTER: 'twitter',
        KAKAO: 'kakao'
    },
    POST: {
        NONE: 'none',
        POST: 'post',
        LINK: 'link'
    },
    GROUP_INFO: {
        POLYGONS: 0,
        TABLE: 1
    },
    SYNC_ENABLE: {
        OFF: "false",
        NONE: 'none',
        ON: 'true'
    },
    ALERT: {
        NONE: '',
        SUCCESS: 'alert-success',
        INFO: 'alert-info',
        WARNING: 'alert-warning',
        DANGER : 'alert-danger'
    }
});