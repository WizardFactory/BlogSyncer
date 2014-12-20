bs.directive('whenScrolled', function () {
    "use strict";

    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var rawElement = element[0];
            angular.element(window).bind('scroll', function () {
                if (scope.waiting === true) {
                    return;
                }
                var rectObject = rawElement.getBoundingClientRect();
                if (rectObject.top !== 0 && rectObject.bottom !== 0 && rectObject.bottom <= window.innerHeight + 100) {
                    scope.$apply(attrs.whenScrolled);
                }
            });
        }
    };
});