/**
 * Created by aleckim on 2014. 5. 15..
 */
var bs = angular.module("BlogSyncer", ['ngRoute']);

// define service
bs.factory('User', function () {
    var user = {};

    return {
        getUser: function () {
           return user;
        },
        setUser: function (usr) {
           user = usr;
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
    $scope.username = '당신';
    $scope.message = '의 블로그 글들을 동기화 시킵니다.';
    $scope.signstat = 'Sign in';

    // add DropDown Blog
    $scope.options = [{"Route":"/blogRegister","Display":"블로그 등록"},{"Route":"/blogSetSync","Display":"동기화 설정"},
        {"Route":"/blogHistorySync","Display":"동기 히스토리"},{"Route":"/blogCollectFeedback","Display":"피드백 모음"}]

    console.log('Start homeCtrl');

    $http.get('/user')
            .success(function (data) {
              if (data == 'NAU')  {
                  console.log('NAU');
              }
              else {
                  var user = data;
                  User.setUser(user);
                  $scope.signstat = 'My account';
                  $scope.username = user.providers[0].displayName;
                  console.log('Change username, signstat');
              }
            })
            .error(function (data) {
                window.alert('Error: ' + data);
            });
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

