'use strict';

angular.module('bahmni.ot')
    .controller('calendarViewController', ['$scope', '$rootScope', '$state', 'appService', 'patientService', 'locationService',
        function ($scope, $rootScope, $state, appService, patientService, locationService) {
            var init = function () {
                $scope.filterParams = $state.filterParams;
                $scope.filters = {};
                $scope.filters.providers = [];
                $scope.view = 'Calendar';
                $scope.weekOrDay = 'day';
                $scope.surgeonList = _.map($rootScope.surgeons, function (surgeon) {
                    var newVar = {
                        name: surgeon.person.display,
                        uuid: surgeon.uuid
                    };
                    newVar[surgeon.person.display] = false;
                    var otCalendarColorAttribute = _.find(surgeon.attributes, function (attribute) {
                        return attribute.attributeType.display === 'otCalendarColor';
                    });
                    newVar.otCalendarColor = getBackGroundHSLColorFor(otCalendarColorAttribute);
                    return newVar;
                });
                $scope.filters.statusList = [];
                $scope.appointmentStatusList = [{name: Bahmni.OT.Constants.scheduled}, {name: Bahmni.OT.Constants.completed},
                    {name: Bahmni.OT.Constants.postponed}, {name: Bahmni.OT.Constants.cancelled}];
                return locationService.getAllByTag('Operation Theater').then(function (response) {
                    $scope.locations = response.data.results;
                    var locations = {};
                    _.each($scope.locations, function (location) {
                        locations[location.name] = true;
                    });
                    $scope.filters.locations = locations;
                    $scope.filters = $scope.filterParams || $scope.filters;
                    $scope.patient = $scope.filters.patient && $scope.filters.patient.value;
                    $scope.applyFilters();
                    return $scope.locations;
                });
            };

            var getBackGroundHSLColorFor = function (otCalendarColorAttribute) {
                var hue = otCalendarColorAttribute ? otCalendarColorAttribute.value.toString() : "0";
                return "hsl(" + hue + ", 100%, 90%)";
            };

            $scope.applyFilters = function () {
                $scope.filterParams = _.cloneDeep($scope.filters);
                $state.filterParams = $scope.filterParams;
            };

            $scope.clearFilters = function () {
                $scope.filters.locations = {"OT 1": true, "OT 2": true, "OT 3": true};
                $scope.filters.providers = [];
                $scope.filters.statusList = [];
                $scope.patient = "";
                $scope.filters.patient = null;
                removeFreeTextItem();

                $scope.applyFilters();
            };

            var removeFreeTextItem = function () {
                $("input.input")[0].value = "";
                $("input.input")[1].value = "";
            };

            $scope.search = function () {
                return patientService.search($scope.patient).then(function (response) {
                    return response.data.pageOfResults;
                });
            };

            $scope.onSelectPatient = function (data) {
                $scope.filters.patient = data;
            };

            $scope.clearThePatientFilter = function () {
                $scope.filters.patient = null;
            };

            $scope.responseMap = function (data) {
                return _.map(data, function (patientInfo) {
                    patientInfo.label = patientInfo.givenName + " " + patientInfo.familyName + " " + "(" + patientInfo.identifier + ")";
                    return patientInfo;
                });
            };

            $scope.goToNewSurgicalAppointment = function () {
                var options = {};
                options['dashboardCachebuster'] = Math.random();
                $state.go("newSurgicalAppointment", options);
            };
            $scope.viewDate = $state.viewDate || (moment().startOf('day')).toDate();
            $state.viewDate = $scope.viewDate;
            $scope.calendarConfig = appService.getAppDescriptor().getConfigValue("calendarView");
            $scope.goToPreviousDate = function (date) {
                $scope.viewDate = Bahmni.Common.Util.DateUtil.subtractDays(date, 1);
                $state.viewDate = $scope.viewDate;
            };

            $scope.goToCurrentDate = function () {
                $scope.viewDate = new Date(moment().startOf('day'));
                $state.viewDate = $scope.viewDate;
                $scope.weekOrDay = 'day';
            };

            $scope.goToNextDate = function (date) {
                $scope.viewDate = Bahmni.Common.Util.DateUtil.addDays(date, 1);
                $state.viewDate = $scope.viewDate;
            };

            $scope.goToCurrentWeek = function () {
                $scope.weekStartDate = new Date(moment().startOf('week'));
                $scope.weekEndDate = new Date(moment().endOf('week').endOf('day'));
                $scope.weekOrDay = 'week';
            };

            $scope.goToNextWeek = function () {
                $scope.weekStartDate = Bahmni.Common.Util.DateUtil.addDays($scope.weekStartDate, 7);
                $scope.weekEndDate = Bahmni.Common.Util.DateUtil.addDays($scope.weekEndDate, 7);
            };

            $scope.goToPreviousWeek = function () {
                $scope.weekStartDate = Bahmni.Common.Util.DateUtil.subtractDays($scope.weekStartDate, 7);
                $scope.weekEndDate = Bahmni.Common.Util.DateUtil.subtractDays($scope.weekEndDate, 7);
            };

            init();
        }]);
