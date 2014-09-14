bs.directive('multiselect',['$document', function($document) {
    return {
        restrict: 'E',              // Element name
        require: '?ngModel',
        scope: {
            choices: '=',
            selected: '='
        },
        templateUrl: 'views/multiselect.html',
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