'use strict';

angular.module('bahmni.appointments')
    .service('appointmentsService', ['$http', 'appService',
        function ($http, appService) {
            this.save = function (appointmentRequest) {
                return $http.post(Bahmni.Appointments.Constants.createAppointmentUrl, appointmentRequest, {
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };
            this.update = function (appointmentRequest) {
                var updateAppointmentUrl = appService.getAppDescriptor().formatUrl(Bahmni.Appointments.Constants.updateAppointmentUrl, {appointmentUuid: appointmentRequest.uuid});
                return $http.put(updateAppointmentUrl, appointmentRequest, {
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };
            this.search = function (appointment) {
                return $http.post(Bahmni.Appointments.Constants.searchAppointmentUrl, appointment, {
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };

            this.getAppointmentsForServiceType = function (serviceTypeUuid) {
                var params = {"appointmentServiceTypeUuid": serviceTypeUuid};
                return $http.get(Bahmni.Appointments.Constants.getAppointmentsForServiceTypeUrl, {
                    params: params,
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };

            this.getAllAppointments = function (params) {
                return $http.get(Bahmni.Appointments.Constants.getAllAppointmentsUrl, {
                    params: params,
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };

            this.getAppointmentByUuid = function (appointmentUuid) {
                var params = {uuid: appointmentUuid};
                return $http.get(Bahmni.Appointments.Constants.getAppointmentByUuid, {
                    params: params,
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };

            this.getAppointmentsSummary = function (params) {
                return $http.get(Bahmni.Appointments.Constants.getAppointmentsSummaryUrl, {
                    params: params,
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };

            this.changeStatus = function (appointmentUuid, toStatus, onDate) {
                var params = {toStatus: toStatus, onDate: onDate};
                var changeStatusUrl = appService.getAppDescriptor().formatUrl(Bahmni.Appointments.Constants.changeAppointmentStatusUrl, {appointmentUuid: appointmentUuid});
                return $http.post(changeStatusUrl, params, {
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };

            this.undoCheckIn = function (appointmentUuid) {
                return $http.post(Bahmni.Appointments.Constants.undoCheckInUrl + appointmentUuid, {
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };
        }]);
