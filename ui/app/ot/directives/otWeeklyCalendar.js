'use strict';

angular.module('bahmni.ot')
    .directive('otWeeklyCalendar', [function () {
        return {
            restrict: 'E',
            controller: "otCalendarController",
            scope: {
                weekStartDate: "=",
                viewDate: "="
            },
            templateUrl: "../ot/views/otWeeklyCalendar.html"
        };
    }]);
