'use strict';

angular.module('bahmni.common.recurrence')
    .directive('recurrence', [function () {
        return {
            restrict: "E",
            scope: {
                recurringPattern: "=",
                recurrenceTypes: "="
            },
            templateUrl: "../common/recurrence/views/recurrence.html"
        };
    }]);
