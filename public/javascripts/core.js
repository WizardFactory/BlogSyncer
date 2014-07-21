/**
 * Created by aleckim on 2014. 5. 15..
 */
var bs = angular.module("BlogSyncer", ['ngRoute']);

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

bs.config(function ($routeProvider) {
    $routeProvider
        // route for cover page
        .when('/', {
            templateUrl : '../home.html',
            controller : 'homeCtrl'
        })
        // route for blog page
        .when('/blog', {
            templateUrl : '../blog.html',
            controller : 'blogCtrl'
        })
        // route for sign in page
        .when('/signin', {
            templateUrl : '../signin.html',
            controller : 'signinCtrl'
        });
});

bs.controller('homeCtrl', function ($scope, $http, User) {
    $scope.username = '당신';
    $scope.message = '의 블로그 글들을 동기화 시킵니다.';
    $scope.signstat = 'Sign in';
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

