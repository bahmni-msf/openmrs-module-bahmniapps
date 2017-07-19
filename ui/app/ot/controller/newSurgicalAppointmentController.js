'use strict';

angular.module('bahmni.ot')
    .controller('NewSurgicalAppointmentController', ['$scope', '$q', '$window', 'patientService', 'surgicalAppointmentService', 'messagingService', 'programService', 'appService', 'ngDialog', 'spinner', 'queryService',
        function ($scope, $q, $window, patientService, surgicalAppointmentService, messagingService, programService, appService, ngDialog, spinner, queryService) {
            var init = function () {
                $scope.selectedPatient = $scope.ngDialogData && $scope.ngDialogData.patient;
                $scope.patient = $scope.ngDialogData && $scope.ngDialogData.patient && ($scope.ngDialogData.patient.value || $scope.ngDialogData.patient.display);
                $scope.otherSurgeons = _.cloneDeep($scope.surgeons);
                return $q.all([surgicalAppointmentService.getSurgicalAppointmentAttributeTypes()]).then(function (response) {
                    $scope.attributeTypes = response[0].data.results;
                    var attributes = {};
                    var mapAttributes = new Bahmni.OT.SurgicalBlockMapper().mapAttributes(attributes, $scope.attributeTypes);
                    $scope.attributes = $scope.ngDialogData && $scope.ngDialogData.surgicalAppointmentAttributes || mapAttributes;
                    if ($scope.isEditMode()) {
                        programService.getEnrollmentInfoFor($scope.ngDialogData.patient.uuid, "custom:(uuid,dateEnrolled,program:(uuid),patient:(uuid))").then(function (response) {
                            $scope.enrollmentInfo = response && response[0];
                        });
                    }
                });
            };

            $scope.isEditMode = function () {
                return $scope.patient && $scope.ngDialogData && $scope.ngDialogData.id;
            };

            $scope.search = function () {
                return patientService.search($scope.patient).then(function (response) {
                    return response.data.pageOfResults;
                });
            };

            $scope.onSelectPatient = function (data) {
                $scope.selectedPatient = data;
                var sqlGlobalProperty = appService.getAppDescriptor().getConfigValue('procedureSQLGlobalProperty');
                if (!sqlGlobalProperty) {
                    return;
                }
                var params = {
                    patientUuid: data.uuid,
                    q: sqlGlobalProperty,
                    v: "full"
                };
                spinner.forPromise(queryService.getResponseFromQuery(params).then(function (response) {
                    if (response.data.length) {
                        $scope.attributes.procedure.value = response.data[0]['all_procedures'];
                        var estHrs = response.data[0]['esthrs'];
                        var estMins = response.data[0]['estmins'];
                        $scope.attributes.estTimeHours.value = estHrs ? Math.floor(parseInt(estHrs) + estMins / 60) : 0;
                        $scope.attributes.estTimeMinutes.value = estMins ? parseInt(estMins) % 60 : 0;
                    } else {
                        $scope.attributes.procedure.value = "";
                        $scope.attributes.estTimeHours.value = 0;
                        $scope.attributes.estTimeMinutes.value = 0;
                    }
                }));
            };

            $scope.responseMap = function (data) {
                return _.map(data, function (patientInfo) {
                    patientInfo.label = patientInfo.givenName + " " + patientInfo.familyName + " " + "( " + patientInfo.identifier + " )";
                    return patientInfo;
                });
            };

            $scope.createAppointmentAndAdd = function () {
                if ($scope.surgicalAppointmentForm.$valid) {
                    var appointment = {
                        id: $scope.ngDialogData && $scope.ngDialogData.id,
                        patient: $scope.selectedPatient,
                        sortWeight: $scope.ngDialogData && $scope.ngDialogData.sortWeight,
                        actualStartDatetime: $scope.ngDialogData && $scope.ngDialogData.actualStartDatetime,
                        actualEndDatetime: $scope.ngDialogData && $scope.ngDialogData.actualEndDatetime,
                        status: $scope.ngDialogData && $scope.ngDialogData.status || Bahmni.OT.Constants.scheduled,
                        notes: $scope.ngDialogData && $scope.ngDialogData.notes,
                        uuid: $scope.ngDialogData && $scope.ngDialogData.uuid,
                        voided: $scope.ngDialogData && $scope.ngDialogData.voided,
                        surgicalAppointmentAttributes: $scope.attributes
                    };
                    $scope.addSurgicalAppointment(appointment);
                }
                return $q.when({});
            };

            $scope.close = function () {
                ngDialog.close();
            };

            $scope.goToForwardUrl = function () {
                var forwardUrl = appService.getAppDescriptor().getConfigValue('patientDashboardUrl');
                if (!$scope.enrollmentInfo) {
                    messagingService.showMessage('error', forwardUrl.errorMessage);
                    return;
                }
                var params = {
                    patientUuid: $scope.enrollmentInfo.patient.uuid,
                    dateEnrolled: $scope.enrollmentInfo.dateEnrolled,
                    programUuid: $scope.enrollmentInfo.program.uuid,
                    enrollment: $scope.enrollmentInfo.uuid
                };
                var formattedUrl = appService.getAppDescriptor().formatUrl(forwardUrl.link, params);
                $window.open(formattedUrl);
            };

            spinner.forPromise(init());
        }]);
