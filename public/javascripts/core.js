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
    // add select
    $scope.options = [{"Value":1,"Display":"블로그 등록"},{"Value":2,"Display":"동기화 설정"},{"Value":3,"Display":"동기 히스토리"},{"Value":4,"Display":"피드백 모음"}]
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
        restrict: 'E',
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
            scope.toggleChaeck = function(item){
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

