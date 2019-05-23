'use strict';

angular.module('bahmni.common.recurrence')
    .directive('recurrence', [function () {
        var controller = function ($scope) {
            $scope.today = Bahmni.Common.Util.DateUtil.getDateWithoutTime(Bahmni.Common.Util.DateUtil.now());

            $scope.getMinEndDate = function () {
                return $scope.startDate ? moment($scope.startDate).format('YYYY-MM-DD') : $scope.today;
            };

            $scope.isRecurrenceTerminationTypeFrequency = function () {
                return $scope.recurringPattern.recurrenceTerminationType === 'frequency';
            };

            $scope.isRecurrenceTerminationTypeEndDate = function () {
                return $scope.recurringPattern.recurrenceTerminationType === 'endDate';
            };
        };

        return {
            restrict: "E",
            scope: {
                recurringPattern: "=",
                recurrenceTypes: "=",
                startDate: "="
            },
            controller: controller,
            templateUrl: "../common/recurrence/views/recurrence.html"
        };
    }]);
