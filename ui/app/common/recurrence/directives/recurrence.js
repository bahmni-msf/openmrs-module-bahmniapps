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

            $scope.updateSelectedDays = function (day) {
                var index = $scope.recurringPattern.daysOfWeek.indexOf(day);
                if (index == -1) {
                    $scope.recurringPattern.daysOfWeek.push(day);
                } else {
                    $scope.recurringPattern.daysOfWeek.splice(index, 1);
                }
            };

            $scope.isDaySelected = function (day) {
                $scope.recurringPattern.daysOfWeek = $scope.recurringPattern.daysOfWeek || [];
                return $scope.recurringPattern.daysOfWeek.includes(day);
            };

            $scope.setTerminationType = function (terminationType) {
                $scope.recurringPattern.recurrenceTerminationType = terminationType;
            };

            function setRecurrenceTerminationType () {
                if ($scope.recurringPattern.frequency) {
                    $scope.setTerminationType("frequency");
                } else if ($scope.recurringPattern.endDate) {
                    $scope.setTerminationType("endDate");
                } else {
                    $scope.setTerminationType("");
                }
            }

            var init = function () {
                setRecurrenceTerminationType();
            };

            init();
        };

        return {
            restrict: "E",
            scope: {
                recurringPattern: "=",
                recurrenceTypes: "=",
                startDate: "=",
                weekDays: "="
            },
            controller: controller,
            templateUrl: "../common/recurrence/views/recurrence.html"
        };
    }]);
