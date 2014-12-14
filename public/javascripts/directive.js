bs.directive('whenScrolled', function () {
    "use strict";

    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var rawElement = element[0];
            angular.element(window).bind('scroll', function () {
                var rectObject = rawElement.getBoundingClientRect();
                if (rectObject.bottom <= window.innerHeight + 100) {
                    scope.$apply(attrs.whenScrolled);
                }
            });
        }
    };
});