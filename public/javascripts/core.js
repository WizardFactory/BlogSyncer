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
        .when('/blogRegister', {
            templateUrl : '../blog/registerBlog.html',
            controller : 'blogCtrl'
        })
        .when('/blogSetSync', {
            templateUrl : '../blog/setSync.html',
            controller : 'blogCtrl'
        })
        .when('/blogHistorySync', {
            templateUrl : '../blog/historySync.html',
            controller : 'blogCtrl'
        })
        .when('/blogCollectFeedback', {
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

    var postsID = 0;

    $http.get('/blog/blogCollectFeedback/posts/' + postsID + '/comments/')
        .success(function (data) {
            console.log("success comments");
            if (data == 'NAU') {
                console.log('NAU');
            }
            else {
                var comments = data.comments[0].content;

                $scope.comments = comments;

                console.log(data);
                console.log(comments);
            }
        })
        .error(function (data) {
            window.alert('Error: ' + data);
        });

    $http.get('/blog/blogCollectFeedback/posts')
        .success(function (data) {
            console.log("success posts");
            if (data == 'NAU') {
                console.log('NAU');
            }
            else {
                postsID = data.posts[0].ID;

                $scope.title = data.posts[0].title;

                console.log(data);
                console.log(postsID);

                $http.get('/blog/blogCollectFeedback/posts/'+ postsID + '/comments' );
            }
        })
        .error(function (data) {
            window.alert('Error: ' + data);
       });


});


bs.controller('homeCtrl', function ($scope, $http, User) {

    $scope.user = User.getUser();
    $scope.child_port = User.getChildPort();
    //set/get Child port is not working now.
    $scope.child_port = 20149;
    $scope.title = "Blog 등록~!";

    if (!$scope.user.id) {
        console.log('you have to signin~');
    }

    var child_url = 'http://www.justwapps.com:'+ $scope.child_port +'/blog';
    var childio = io.connect(child_url);
    console.log('child_url='+child_url);

    childio.on('connect', function () {
        childio.emit('blog', {msg: 'getSites'});
    });
    childio.on('sites', function(data){
        console.log(data);
        $scope.blog_list = data;
    });

});

bs.controller('homeCtrl', function ($q, $scope, $http, User) {
    $scope.user = User.getUser();


    $scope.username = '당신';
    $scope.message = '의 블로그 글들을 동기화 시킵니다.';
    $scope.signstat = 'Sign in';

    // add DropDown Blog
    $scope.options = [{"Route":"/blogRegister","Display":"블로그 등록"},{"Route":"/blogSetSync","Display":"동기화 설정"},
        {"Route":"/blogHistorySync","Display":"동기 히스토리"},{"Route":"/blogCollectFeedback","Display":"피드백 모음"}]

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

