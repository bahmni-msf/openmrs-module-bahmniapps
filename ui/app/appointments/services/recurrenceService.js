'use strict';

angular.module('bahmni.appointments')
    .service('recurrenceService', function () {
        this.getRecurringAppointmentDates = function (recurringPattern, startDate) {
            var numberOfOccurrences = recurringPattern.frequency;
            var recurrenceInterval = recurringPattern.period;
            var lastDate = moment(startDate).add(recurrenceInterval * (numberOfOccurrences - 1), "d").toDate();
            var currentDate = startDate;
            var appointmentDates = [];
            while (currentDate <= lastDate) {
                appointmentDates.push(currentDate);
                currentDate = moment(currentDate).add(recurrenceInterval, "d").toDate();
            }
            return appointmentDates;
        };
    });
