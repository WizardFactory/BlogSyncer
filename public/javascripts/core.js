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

bs.controller('homeCtrl', function ($scope) {
    $scope.message = '당신의 블로그 글들을 동기화 시킵니다.';
});

bs.controller('signinCtrl', function ($scope, $http) {
    $scope.message = 'Please sign in';

    $scope.goAuth = function () {
        $http.get('/api/wordpress')
            .success( function(data) {
                if (data == 'NAU') {
                    location.href = 'api/wordpress/authorize';
                }
                else {
                    $scope.auth = data;
                    window.alert(JSON.stringify($scope.auth));
                }
            })
            .error(function(data){
                console.log('Error: '+ data);
            });
    }
});

