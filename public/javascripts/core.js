/**
 * Created by aleckim on 2014. 5. 15..
 */
var bs = angular.module("BlogSyncer", ['ngRoute']);

// define service
bs.factory('User', function () {
    var user= {};
    var port = -1;

    return {
        getUser: function () {
           return user;
        },
        setUser: function (usr) {
           user = usr;
        },
        getChildPort: function() {
           console.log('getChildPort port='+port);
           return port;
        },
        setChildPort: function(prt) {
            console.log('setChildPort port='+prt);
            port = prt;
            console.log('port='+port);
        }
    };
});

// setting module
bs.config(function ($routeProvider) {
    $routeProvider
        // route for cover page
        .when('/', {
            templateUrl : '../home.html',
            controller : 'homeCtrl'
        })
        // route for blog page
        .when('/blog/blogRegister', {
            templateUrl : '../blog/registerBlog.html',
            controller : 'blogCtrl'
        })
        .when('/blog/blogSetSync', {
            templateUrl : '../blog/setSync.html',
            controller : 'blogCtrl'
        })
        .when('/blog/blogHistorySync', {
            templateUrl : '../blog/historySync.html',
            controller : 'blogCtrl'
        })
        .when('/blog/blogCollectFeedback', {
            templateUrl : '../blog/collectFeedback.html',
            controller : 'blogCtrl'
        })
        // route for sign in page
        .when('/signin', {
            templateUrl : '../signin.html',
            controller : 'signinCtrl'
        });
});

bs.controller('blogCtrl', function ($scope, $http, User) {
	$scope.user = User.getUser();
    $scope.child_port = User.getChildPort();
    //set/get Child port is not working now.
    $scope.child_port = 20149;
    $scope.title = "Blog 등록~!";
    $scope.posts = [];

    if (!$scope.user.id) {
        console.log('you have to signin~');
    }

    var child_url = 'http://www.justwapps.com:'+ $scope.child_port +'/blog';
    var childio = io.connect(child_url);
    console.log('child_url='+child_url);

//    childio.on('connect', function () {
//        childio.emit('blog', {msg: 'getSites'});
//    });
//    childio.on('sites', function(data){
//        console.log(data);
//        $scope.blog_list = data;
//    });

    // About blogCollectFeedback
    var postsID = 0;

      childio.emit('blog', {msg: 'getPosts'});
//    childio.on('connect', function(){
//        childio.emit('blog', {msg: 'getPosts'});
//    });

    childio.on('posts', function(data){
        var post_ids = [];
        for (var i=0; i<data.post_db.length; i++) {
            console.log('push post_id='+data.post_db[i].id);
            post_ids.push(data.post_db[i].id);
        }
        var messages = { msg : 'get_reply_count', post_ids : post_ids };
        console.log('send get_reply_count post_ids='+post_ids.length);
        childio.emit('blog', messages );

        $scope.$apply(function () {
            $scope.posts = data.post_db;
        });
    });

    childio.on('reply_count', function(data) {
        console.log('reply_count');
        console.log(data);
        for (var i = 0; i<$scope.posts.length; i++) {
            if ($scope.posts[i].id == data.post_id) {
               for (var j=0; j<$scope.posts[i].infos.length; j++) {
                   var info = $scope.posts[i].infos[j];
                   if (info.provider_name == data.provider_name && info.blog_id == data.blog_id) {
                       $scope.$apply(function () {
                           console.log('provider='+info.provider_name+' blog='+info.blog_id+' add comment_count, like_count');
                           $scope.posts[i].infos[j].comment_count = data.comment_count;
                           $scope.posts[i].infos[j].like_count = data.like_count;
                       });
                       break;
                   }
               }
               break;
            }
        }
    });

//    childio.on('connect', function(data){
//        var messages = { msg : 'getComments', postID : postsID };
//        childio.emit('blog', messages );
//    });
//    childio.on('comments', function(data){
//        var comments = data.comments[0].content;
//        $scope.$apply(function() {
//            $scope.comments = comments;
//        });
//    });
});

bs.controller('homeCtrl', function ($q, $scope, $http, User) {
    $scope.user = User.getUser();

    $scope.username = '당신';
    $scope.message = '의 블로그 글들을 동기화 시킵니다.';
    $scope.signstat = 'Sign in';

    // add DropDown Blog
    $scope.options = [{"Route":"/#/blog/blogRegister","Display":"블로그 등록"},{"Route":"/#/blog/blogSetSync","Display":"동기화 설정"},
        {"Route":"/#/blog/blogHistorySync","Display":"동기 히스토리"},{"Route":"/#/blog/blogCollectFeedback","Display":"피드백 모음"}]

    console.log('Start homeCtrl');


    if (!$scope.user.id) {
        var httpGet = function() {
            var deferred = $q.defer();
            $http.get('/user')
                .success(function (data) {
                    if (data == 'NAU') {
                        console.log('NAU');
                    }
                    else {
                        var user = data;
                        User.setUser(user);
                        $scope.signstat = 'My account';
                        $scope.username = user.providers[0].displayName;
                        console.log('Change username, signstat');
                    }
                    deferred.resolve();
                })
                .error(function (data) {
                    window.alert('Error: ' + data);
                });

            return deferred.promise;
        };

        var firsttime_skip = 0;
        httpGet()
            .then(function () {
                console.log('user id = '+ User.getUser().id);
                if (User.getUser().id) {
                    console.log('get_child_port');
                    if (firsttime_skip) {
                        $http.get('/user/child_port')
                            .success(function (data) {
                                console.log(User.getUser());
                                console.log('recv child_port =' + data.child_port);
                                User.setChildPort(data.child_port);
                            })
                            .error(function (data) {
                                window.alert('Error: ' + data);
                            });
                    }
                    else {
                        firsttime_skip = 1;
                    }
                }
                else {
                    console.log('you have to signin~');
                }
            });
    }
    else
    {
        $http.get('/child_port')
            .success(function (data) {
                console.log('recv child_port =' + data.child_port);
                return data;
            })
            .error(function (data) {
                window.alert('Error: ' + data);
            });
    }
});

bs.controller('signinCtrl', function ($scope, $http, User) {
    $scope.user = User.getUser();

    $scope.providers = [ "Wordpress", "tistory", "google", "facebook", "tumblr", "twitter", "kakao"];

    if ($scope.user.id) {
        $scope.message = 'Your accounts';
    }
    else {
        $scope.message = 'Please sign in';
    }
});

bs.directive('multiselect',['$document', function($document){

    return {
        restrict: 'E',              // Element name
        require: '?ngModel',
        scope: {
            choices: '=',
            selected: '='
        },
        templateUrl: 'multiselect.html',
        replace: true,
        link: function(scope, element, attr){
            scope.isVisible = false;
            scope.isChecked = function(item){
                if(scope.selected.indexOf(item) !== -1){
                    return true;
                }
                return false;
            };
            scope.toggleCheck = function(item){
                if(!scope.isChecked(item)){
                    scope.selected.push(item);
                }else{
                    scope.selected.splice(scope.selected.indexOf(item), 1);
                }
            };
            scope.toggleSelect = function(){
                scope.isVisible = !scope.isVisible;
            }

            element.bind('click', function(event) {
                event.stopPropagation();
            });

            $document.bind('click', function(){
                scope.isVisible = false;
                scope.$apply();
            });
        }
    };
}]);

