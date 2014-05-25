/**
 * Created by aleckim on 2014. 5. 15..
 */
//public/core.js

var blogSyncer = angular.module('BlogSyncer', []);

function mainController($scope, $http) {
    $scope.goAuth = function() {
     $http.get('/api/wordpress')
        .success( function(data) {
             if (data == 'NAU') {
                 location.href = 'api/wordpress/authorize';
             }
             else {
                 $scope.auth = data;
                 console.log(data);
             }
        })
        .error(function(data){
            console.log('Error: '+ data);
        });
    };
}
