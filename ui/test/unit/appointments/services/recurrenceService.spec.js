'use strict';

describe('RecurrenceService', function () {
    var recurrenceService;

    beforeEach(function () {
        module('bahmni.appointments');
    });

    beforeEach(inject(['recurrenceService', function (recurrenceServiceInjected) {
        recurrenceService = recurrenceServiceInjected;
    }]));

    it('should return three alternate days with current date as start date when period is 2 and frequency is 3 ' +
        'and type is day', function () {
        var recurringPattern = {
            frequency: 3,
            period: 2,
            type: "Day"
        };
        var startDate = moment().toDate();

        var recurringAppointmentDates = recurrenceService.getRecurringAppointmentDates(recurringPattern, startDate);

        expect(recurringAppointmentDates.length).toBe(3);
        expect(recurringAppointmentDates[0]).toEqual(startDate);
        expect(recurringAppointmentDates[1]).toEqual(moment(startDate).add(2, "d").toDate());
        expect(recurringAppointmentDates[2]).toEqual(moment(startDate).add(4, "d").toDate());
    });
});
