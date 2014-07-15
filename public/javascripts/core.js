/**
 * Created by aleckim on 2014. 5. 15..
 */
var bs = angular.module("BlogSyncer", ['ngRoute']);

bs.config(function ($routeProvider) {
    $routeProvider
        // route for cover page
        .when('/', {
            templateUrl : '../home.html',
            controller : 'homeCtrl'
        })
        // route for sign in page
        .when('/signin', {
            templateUrl : '../signin.html',
            controller : 'signinCtrl'
        });
});

bs.controller('homeCtrl', function ($scope, $http) {
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
                  $scope.signstat = 'Sign out';
                  $scope.username = data;
                  console.log('Change username, signstat');
              }
            })
            .error(function (data) {
                window.alert('Error: ' + data);
            });
});

bs.controller('signinCtrl', function ($scope, $http) {
    $scope.message = 'Please sign in';
});

