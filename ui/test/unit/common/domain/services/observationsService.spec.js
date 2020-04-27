'use strict';

describe("observationsService", function () {
    var mockBackend, observationsService;

    beforeEach(function () {
        module('bahmni.common.domain');
        inject(function (_observationsService_, $httpBackend) {
            observationsService = _observationsService_;
            mockBackend = $httpBackend
        });
    });

    describe("fetchForEncounter", function () {
        it("should fetch observations for encounter", function () {
            mockBackend.expectGET('/openmrs/ws/rest/v1/bahmnicore/observations?concept=concept+name&encounterUuid=encounterUuid&loadComplexData=loadComplexData').respond({results: ["Some data"]});

            observationsService.fetchForEncounter("encounterUuid", ["concept name"], "loadComplexData").then(function (response) {
                expect(response.data.results.length).toBe(1);
                expect(response.data.results[0]).toBe("Some data");
            });

            mockBackend.flush();
        })
    });

    describe("fetchForPatientProgram", function () {
        it("should fetch observations for patient program", function () {
            mockBackend.expectGET('/openmrs/ws/rest/v1/bahmnicore/observations?concept=conceptName1&concept=conceptName2&loadComplexData=loadComplexData&numberOfEncounters=2&patientProgramUuid=patientProgramUuid&scope=latest').respond({results: ["latest Observation"]});

            observationsService.fetchForPatientProgram("patientProgramUuid", ["conceptName1", "conceptName2"],"latest", null , "loadComplexData", 2).then(function (response) {
                expect(response.data.results.length).toBe(1);
                expect(response.data.results[0]).toBe("latest Observation");
            });

            mockBackend.flush();
        })
    });

    describe("getObsInFlowSheet", function () {
        it("should send parameters specified in call to the server when conceptSet is passed", function () {
            mockBackend.expectGET('/openmrs/ws/rest/v1/bahmnicore/observations/flowSheet?' +
            'conceptNames=conceptNames&conceptSet=conceptSet&enrollment=patientProgramUuid' +
            '&groupByConcept=groupByConcept&initialCount=initialCount&latestCount=latestCount&loadComplexData=false' +
            '&name=groovyExtension&numberOfVisits=numberOfVisits&orderByConcept=orderByConcept&patientUuid=patientUuid')
                .respond({results: ["Some data"]});

            observationsService.getObsInFlowSheet("patientUuid", "conceptSet", "groupByConcept", "orderByConcept", "conceptNames",
                "numberOfVisits", "initialCount", "latestCount", "groovyExtension",
                null, null, "patientProgramUuid");

            mockBackend.flush();
        });
    });

    describe("getObsInFlowSheet", function () {
        it("should send parameters specified in call to the server when formNames is passed", function () {
            mockBackend.expectGET('/openmrs/ws/rest/v1/bahmnicore/observations/flowSheet?' +
                'conceptNames=conceptNames&enrollment=patientProgramUuid&formNames=formNames' +
                '&groupByConcept=groupByConcept&initialCount=initialCount&latestCount=latestCount&loadComplexData=false' +
                '&name=groovyExtension&numberOfVisits=numberOfVisits&orderByConcept=orderByConcept&patientUuid=patientUuid')
                .respond({results: ["Some data"]});

            observationsService.getObsInFlowSheet("patientUuid", null, "groupByConcept", "orderByConcept", "conceptNames",
                "numberOfVisits", "initialCount", "latestCount", "groovyExtension",
                null, null, "patientProgramUuid", "formNames");

            mockBackend.flush();
        });
    });

    describe("fetch By Observation Uuid", function() {
       it ("should fetch bahmni observation by uuid", function() {
           mockBackend.expectGET('/openmrs/ws/rest/v1/bahmnicore/observations?loadComplexData=loadComplexData&observationUuid=observationUuid').respond({results: {uuid : "observationUuid"}});

           observationsService.getByUuid("observationUuid","loadComplexData").then(function (response) {
               expect(response.data.results.uuid).toEqual("observationUuid");
           });

           mockBackend.flush();
       });
    });

    describe("fetch", function () {
        it("should send parameters specified in call to the server when obsIgnoreList, filterObsWithOrders and visitUuid are present", function () {
            mockBackend.expectGET('/openmrs/ws/rest/v1/bahmnicore/observations?concept=conceptName1&concept=conceptName2&filterObsWithOrders=filterObsWithOrders&loadComplexData=false&obsIgnoreList=conceptName1&scope=latest&visitUuid=visitUuid').respond({results: ['Some data']});

            observationsService.fetch(undefined, ["conceptName1", "conceptName2"], "latest", undefined, "visitUuid", ["conceptName1"], "filterObsWithOrders", undefined, false);

            mockBackend.flush();
        });

        it("should send parameters specified in call to the server when obsIgnoreList, filterObsWithOrders and visitUuid are absent", function () {
            mockBackend.expectGET('/openmrs/ws/rest/v1/bahmnicore/observations?concept=conceptName1&concept=conceptName2&loadComplexData=false&numberOfVisits=3&patientProgramUuid=patientprogramUuid&patientUuid=patientUuid&scope=latest').respond({results: ['Some data']});

            observationsService.fetch("patientUuid", ["conceptName1", "conceptName2"], "latest", 3, undefined, undefined, null, "patientprogramUuid", false);

            mockBackend.flush();
        });

        it("should send parameters specified in call to the server when numberOfEncounters is present", function () {
            mockBackend.expectGET('/openmrs/ws/rest/v1/bahmnicore/observations?concept=conceptName1&concept=conceptName2&loadComplexData=false&numberOfEncounters=2&numberOfVisits=3&patientProgramUuid=patientprogramUuid&patientUuid=patientUuid&scope=latest').respond({results: ['Some data']});

            observationsService.fetch("patientUuid", ["conceptName1", "conceptName2"], "latest", 3, undefined, undefined, null, "patientprogramUuid", false, 2);

            mockBackend.flush();
        });
    });

});
