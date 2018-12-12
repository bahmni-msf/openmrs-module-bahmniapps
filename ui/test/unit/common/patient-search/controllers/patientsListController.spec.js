'use strict';

describe("PatientsListController", function () {
        var _spinner, _patientService, _appService, $bahmniCookieStore, _window, _printer;
        var controller, scope, findPatientsPromise, searchPatientsPromise, retrospectiveEntryService, getRecentPatientsPromise,configurationService, getAppDescriptor;
        var stateParams = { location: "Ganiyari"};

        beforeEach(module('bahmni.common.patientSearch'));
        beforeEach(module('bahmni.common.uiHelper'));

        var appExtensions = [
            {
                "id": "bahmni.clinical.patients.allPatients",
                "extensionPointId": "org.bahmni.patient.search",
                "type": "config",
                "extensionParams": {
                    "searchHandler": "emrapi.sqlSearch.activePatients",
                    "display": "All active patients",
                    "refreshTime": "10"
                },
                "label": "All active patients",
                "order": 1,
                "requiredPrivilege": "app:clinical"
            },
            {
                "id": "bahmni.clinical.patients.all",
                "extensionPointId": "org.bahmni.patient.search",
                "type": "config",
                "extensionParams": {
                    "display": "All patients",
                    "refreshTime": "10"
                },
                "label": "All patients",
                "order": 1,
                "requiredPrivilege": "app:clinical"
            },
            {
                "id": "bahmni.clinical.patients.patientsToAdmit",
                "extensionPointId": "org.bahmni.patient.search",
                "type": "config",
                "extensionParams": {
                    "searchHandler": "emrapi.sqlSearch.patientsToAdmit",
                    "display": "Patients to be admitted",
                    "refreshTime": "10"
                },
                "label": "Patients to be admitted",
                "order": 2,
                "offline": false,
                "requiredPrivilege": "app:clinical"
            }
        ];

        var patients = [
            {identifier: 'GAN1234', name: 'Ram Singh', uuid: 'p-uuid-1', activeVisitUuid: 'v-uuid-1'},
            {identifier: 'BAM1234', name: 'Shyam Singh', uuid: 'p-uuid-2', activeVisitUuid: 'v-uuid-2'},
            {identifier: 'SEM1234', name: 'Ganesh Singh', uuid: 'p-uuid-3', activeVisitUuid: 'v-uuid-3'},
            {identifier: 'GAN1235', name: 'Gani Singh', uuid: 'p-uuid-4', activeVisitUuid: 'v-uuid-4'}
        ];

        beforeEach(function () {
            $bahmniCookieStore = jasmine.createSpyObj('$bahmniCookieStore', ['remove', 'put', 'get']);
            $bahmniCookieStore.get.and.callFake(function (cookie) {
                if (cookie == Bahmni.Common.Constants.locationCookieName) {
                    return {uuid: 1, display: "Location" };
                }
            });
            configurationService = jasmine.createSpyObj('configurationService', ['getConfigurations']);
            _spinner = jasmine.createSpyObj('spinner', ['forPromise']);
            _spinner.forPromise.and.callFake(function (promiseParam) {
                return promiseParam;
            });

            getAppDescriptor = jasmine.createSpyObj('getAppDescriptor', ['getExtensions', 'getConfigValue', 'formatUrl']);
            getAppDescriptor.getExtensions.and.returnValue(appExtensions);
            getAppDescriptor.getConfigValue.and.returnValue({"recentPatientsDuration": 14});
            getAppDescriptor.formatUrl.and.returnValue("formattedUrl");
            _appService = jasmine.createSpyObj('appService', ['getAppDescriptor']);
            _appService.getAppDescriptor.and.returnValue(getAppDescriptor);
            _patientService = jasmine.createSpyObj('patientService', ['findPatients', 'search','getRecentPatients']);
            _printer = jasmine.createSpyObj('printer', ['printFromScope']);
            _window = jasmine.createSpyObj('$window', ['open', 'location']);
            findPatientsPromise = specUtil.createServicePromise('findPatients');
            searchPatientsPromise = specUtil.createServicePromise('search');
            getRecentPatientsPromise = specUtil.createServicePromise('getRecentPatients');
            _patientService.findPatients.and.returnValue(findPatientsPromise);
            _patientService.search.and.returnValue(searchPatientsPromise);
            _patientService.getRecentPatients.and.returnValue(getRecentPatientsPromise);
            _printer.printFromScope.and.returnValue(true);
            configurationService.getConfigurations.and.returnValue(specUtil.simplePromise({identifierTypesConfig:[{primary:true,name:"Bahmni Id"}]}));
        });

        beforeEach(inject(function ($rootScope) {
            scope = $rootScope.$new();
            $rootScope.patientConfig = Bahmni.Registration.PatientConfig();
            $rootScope.currentProvider = {uuid: "1111-2222"};

            var retrospectiveEntry = Bahmni.Common.Domain.RetrospectiveEntry.createFrom(Date.now());
            retrospectiveEntryService = jasmine.createSpyObj('retrospectiveEntryService', ['getRetrospectiveEntry']);
            retrospectiveEntryService.getRetrospectiveEntry.and.returnValue(retrospectiveEntry);
        }));

        var setUp = function () {
            inject(function ($controller, $rootScope) {
                controller = $controller('PatientsListController', {
                    $scope: scope,
                    $window: _window,
                    patientService: _patientService,
                    appService: _appService,
                    spinner: _spinner,
                    $stateParams: stateParams,
                    retrospectiveEntryService: retrospectiveEntryService,
                    $bahmniCookieStore: $bahmniCookieStore,
                    printer: _printer,
                    configurationService:configurationService
                });
            });
        };

        describe("initialization", function () {
            it('should initialize configurations and fetch patients', function () {
                scope.$apply(setUp);

                expect(scope.search.searchType).toEqual({ name : 'All active patients', display : 'All active patients', handler : 'emrapi.sqlSearch.activePatients', forwardUrl : undefined, id : 'bahmni.clinical.patients.allPatients', params : undefined, refreshTime : '10', view : 'tile',
                    showPrint : false, printHtmlLocation : null, searchColumns : undefined, additionalParams : undefined, translationKey : undefined, linkColumn: undefined, patientCount : '...' , links : undefined});
                expect(_patientService.findPatients).toHaveBeenCalled();

                findPatientsPromise.callThenCallBack({data: patients});

                expect(scope.search.activePatients.length).toBe(patients.length);
                expect(scope.search.searchResults.length).toBe(patients.length);
            });


        });

        describe("searchPatients", function () {
            beforeEach(function () {
                scope.$apply(setUp);
            });

            it('should search for patients with given search parameter', function () {
                scope.search.searchParameter = "GAN111";
                scope.searchPatients();

                expect(_patientService.search).toHaveBeenCalled();

                searchPatientsPromise.callThenCallBack({data: {pageOfResults: patients}});

                expect(scope.search.activePatients.length).toBe(patients.length);
                expect(scope.search.searchResults.length).toBe(patients.length);
            });



            it('should navigate to patient dashboard when the filter yields a single patient', function () {
                var ramSingh = {identifier: 'GAN1234', name: 'Ram Singh', uuid: 'p-uuid-1', activeVisitUuid: 'v-uuid-1'};
                scope.search.searchResults = [ ramSingh ];
                var result = undefined;
                scope.forwardPatient = function (patient) {
                    result = patient;
                };
                scope.filterPatientsAndSubmit();
                expect(result).toEqual(ramSingh);
            });


        });

        describe("patientCount",function(){
            beforeEach(function(){
                scope.$apply(setUp);
            });

            it('should return the patient count for the provided tab', function(){
                var searchType = { name: 'All active patients', display: 'All active patients', handler: 'emrapi.sqlSearch.activePatients', forwardUrl: undefined, id: 'bahmni.clinical.patients.allPatients', params: undefined , refreshTime: '10'};

                scope.search.searchType = searchType;
                scope.$digest();

                expect(_patientService.findPatients).toHaveBeenCalled();
                findPatientsPromise.callThenCallBack({data: patients});

                expect(searchType.patientCount).toEqual(4);
            });

            it('should call _.each when runPatientSearchInSerial is false', function () {
                getAppDescriptor.getConfigValue.and.returnValue({"runPatientSearchInSerial": false});
                spyOn(_, 'each');
                scope.$apply(setUp);

                expect(_.each).toHaveBeenCalled();
            });

            it('should not call _.each when runPatientSearchInSerial is true', function () {
                getAppDescriptor.getConfigValue.and.returnValue({"runPatientSearchInSerial": true});
                spyOn(_, 'each');
                scope.$apply(setUp);

                expect(_.each).not.toHaveBeenCalled();
            });

            it('should call function returned from debounce when debouncePatientSearchApi is true', function () {
                getAppDescriptor.getConfigValue.and.returnValue({
                    "debouncePatientSearchApi": true,
                    "debouncePatientSearchApiInterval": 2000
                });
                var debounceReturnFunc = jasmine.createSpy();
                spyOn(_, 'debounce').and.returnValue(debounceReturnFunc);
                scope.$apply(setUp);

                expect(_.debounce).toHaveBeenCalledWith(jasmine.any(Function), 2000, jasmine.any(Object));
                expect(debounceReturnFunc).toHaveBeenCalled()
            });

            it('should call function returned from debounce with Default interval when ' +
                'debouncePatientSearchApiInterval is not provided', function () {
                getAppDescriptor.getConfigValue.and.returnValue({
                    "debouncePatientSearchApi": true,
                });
                var debounceReturnFunc = jasmine.createSpy();
                spyOn(_, 'debounce').and.returnValue(debounceReturnFunc);
                scope.$apply(setUp);

                expect(_.debounce).toHaveBeenCalledWith(jasmine.any(Function), 2000, jasmine.any(Object));
                expect(debounceReturnFunc).toHaveBeenCalled()
            });

            it('should not call function returned from debounce when debouncePatientSearchApi is false', function () {
                getAppDescriptor.getConfigValue.and.returnValue({
                    "debouncePatientSearchApi": false,
                    "debouncePatientSearchApiInterval": 2000
                });
                var debounceReturnFunc = jasmine.createSpy();
                spyOn(_, 'debounce').and.returnValue(debounceReturnFunc);
                scope.$apply(setUp);

                expect(_.debounce).toHaveBeenCalledWith(jasmine.any(Function), 2000, jasmine.any(Object));
                expect(debounceReturnFunc).not.toHaveBeenCalled()
            });

            it('should call window open when forward url is given', function(){
                _window.open.and.returnValue(true);
                var patient = { patientUuid : "patientUuid", forwardUrl : "forwardUrl" };
                scope.forwardPatient(patient);
                expect(_window.open).toHaveBeenCalled();
            });

            it('should not call window location when forward url is not given', function(){
                _window.location.and.returnValue(true);
                var patient = { patientUuid : "patientUuid"};
                scope.forwardPatient(patient);
                expect(getAppDescriptor.formatUrl).not.toHaveBeenCalledWith(undefined, jasmine.any(Object), true);
            });
            
        });

        describe("patientListHeadings", function(){
            beforeEach(function(){
                scope.$apply(setUp);
            });

            it('should print headings which are filtered from ignore headings list', function(){
                var patients = [{emr_id : 'emr_Id123', treatment : 'treatment_id', uuid : '23279927', forwardUrl: 'forwardUrl',programUuid: 'programUuid',enrollment: 'enrollmentUuid', DQ_COLUMN_TITLE_ACTION: 'action url'}];
                var headings = scope.getHeadings(patients);
                expect(headings).toEqual(['emr_id', 'treatment', 'DQ_COLUMN_TITLE_ACTION']);
            });

            it('should print headings which are filtered from ignore headings list and print headings list', function(){
                var patients = [{emr_id : 'emr_Id123', treatment : 'treatment_id', uuid : '23279927', forwardUrl: 'forwardUrl', DQ_COLUMN_TITLE_ACTION: 'action url'}];
                var headings = scope.getPrintableHeadings(patients);
                expect(headings).toEqual(['emr_id', 'treatment']);
            });

            it('should print page from the config', function(){
                scope.search.searchType.printHtmlLocation = '/bahmni_config/openmrs/apps/dataintegrity/patientListPrint.html';
                scope.printPage();
                expect(_printer.printFromScope).toHaveBeenCalled();
            });
        });

    describe("isHeadingOfLinkColumn", function () {
        beforeEach(function () {
            scope.$apply(setUp);
        });

        describe("old link behaviour syntax", function () {
            it("should accept the link column from the config, when respective config present", function () {
                var search = {searchType: {linkColumn: "Status"}};
                var heading = "Status";
                var headingOfLinkColumn = scope.isHeadingOfLinkColumn(search, heading);
                expect(headingOfLinkColumn).toBeTruthy()
            });

            it("should accept the default link column, when nothing specified in the config", function () {
                var search = {searchType: {}};
                var heading = "identifier";
                var headingOfLinkColumn = scope.isHeadingOfLinkColumn(search, heading);
                expect(headingOfLinkColumn).toBeTruthy()
            });

            it("should not have a link on the column, when no match for heading found in config and default column list", function () {
                var search = {searchType: {}};
                var heading = "RandomColumn";
                var headingOfLinkColumn = scope.isHeadingOfLinkColumn(search, heading);
                expect(headingOfLinkColumn).toBeFalsy()
            });
        });

        it("should indicate if specified column in a link", function () {
            scope.search.searchType = {
                "id": "bahmni.clinical.patients.all",
                "extensionPointId": "org.bahmni.patient.search",
                "type": "config",
                "extensionParams": {
                    "display": "All patients",
                    "refreshTime": "10"
                },
                "forwardUrl": "#/patient/{{patientUuid}}/visit/{{visitUuid}}",
                "linkColumn": "action",
                "links": [
                    {
                        "url": "#/programs/patient/{{patientUuid}}/consultationContext",
                        "linkColumn": "status"
                    },
                    {
                        "url": "#/bedManagement/patient/{{patientUuid}}/visit/{{visitUuid}}",
                        "linkColumn": "bedStatus",
                        "newTab": true
                    }
                ],
                "label": "All patients",
                "order": 1,
                "requiredPrivilege": "app:clinical"
            };
            var linkColumnStatus = scope.isHeadingOfLinkColumn(scope.search, "status");
            expect(linkColumnStatus).toBeTruthy();
            var linkColumnBedStatus = scope.isHeadingOfLinkColumn(scope.search, "bedStatus");
            expect(linkColumnBedStatus).toBeTruthy();
            var linkColumn = scope.isHeadingOfLinkColumn(scope.search, "action");
            expect(linkColumn).toBeFalsy();
            var notConfiguredLinkColumn = scope.isHeadingOfLinkColumn(scope.search, "someRandomColumn");
            expect(notConfiguredLinkColumn).toBeFalsy();
        });
    });

    describe("forwardPatient", function () {
        beforeEach(function () {
            scope.$apply(setUp);
        });

        it("should take the forward url from the links of searchType, if it is configured", function () {
            scope.search.searchType = {
                "id": "bahmni.clinical.patients.all",
                "extensionPointId": "org.bahmni.patient.search",
                "type": "config",
                "extensionParams": {
                    "display": "All patients",
                    "refreshTime": "10"
                },
                "forwardUrl": "#/patient/{{patientUuid}}/visit/{{visitUuid}}",
                "linkColumn": "action",
                "links": [
                    {
                        "url": "#/programs/patient/{{patientUuid}}/consultationContext",
                        "linkColumn": "status"
                    },
                    {
                        "url": "#/bedManagement/patient/{{patientUuid}}/visit/{{visitUuid}}",
                        "linkColumn": "bedStatus",
                        "newTab": true
                    }
                ],
                "label": "All patients",
                "order": 1,
                "requiredPrivilege": "app:clinical"
            };

            scope.$apply();

            var patient = {identifier: 'GAN1234', name: 'Ram Singh', uuid: 'p-uuid-1', activeVisitUuid: 'v-uuid-1'};
            scope.forwardPatient(patient, "status");
            expect(getAppDescriptor.formatUrl).toHaveBeenCalledWith("#/programs/patient/{{patientUuid}}/consultationContext", jasmine.any(Object), true);
            expect(_window.open).toHaveBeenCalledWith("formattedUrl", "_self");
            scope.forwardPatient(patient, "bedStatus");
            expect(getAppDescriptor.formatUrl).toHaveBeenCalledWith("#/bedManagement/patient/{{patientUuid}}/visit/{{visitUuid}}", jasmine.any(Object), true);
            expect(_window.open).toHaveBeenCalledWith("formattedUrl", "_blank");
        });

        it("should take the forwardUrl from the searchType", function () {
            scope.search.searchType = {
                "id": "bahmni.clinical.patients.all",
                "extensionPointId": "org.bahmni.patient.search",
                "type": "config",
                "extensionParams": {
                    "display": "All patients",
                    "refreshTime": "10"
                },
                "forwardUrl": "#/patient/{{patientUuid}}/visit/{{visitUuid}}",
                "linkColumn": "action",
                "label": "All patients",
                "order": 1,
                "requiredPrivilege": "app:clinical"
            };

            scope.$apply();
            var patient = {identifier: 'GAN1234', name: 'Ram Singh', uuid: 'p-uuid-1', activeVisitUuid: 'v-uuid-1'};
            scope.forwardPatient(patient, "action");
            expect(getAppDescriptor.formatUrl).toHaveBeenCalledWith("#/patient/{{patientUuid}}/visit/{{visitUuid}}", jasmine.any(Object), true);
            expect(_window.open).toHaveBeenCalledWith("formattedUrl", "_self");
        });

        it("should take the forwardUrl from the query results, if one returned from the query", function () {
            scope.search.searchType = {
                "id": "bahmni.clinical.patients.all",
                "extensionPointId": "org.bahmni.patient.search",
                "type": "config",
                "extensionParams": {
                    "display": "All patients",
                    "refreshTime": "10"
                },
                "forwardUrl": "#/patient/{{patientUuid}}/visit/{{visitUuid}}",
                "linkColumn": "action",
                "label": "All patients",
                "order": 1,
                "requiredPrivilege": "app:clinical"
            };

            scope.$apply();
            var patient = {identifier: 'GAN1234', name: 'Ram Singh', uuid: 'p-uuid-1', activeVisitUuid: 'v-uuid-1', forwardUrl: "forwardUrl from the query"};
            scope.forwardPatient(patient, "action");
            expect(getAppDescriptor.formatUrl).toHaveBeenCalledWith("forwardUrl from the query", jasmine.any(Object), true);
            expect(_window.open).toHaveBeenCalledWith("formattedUrl", "_blank");
        });

        it("should take the forwardUrl from the query results and have extra linkColumns specified in the config", function () {
            scope.search.searchType = {
                "id": "bahmni.clinical.patients.all",
                "extensionPointId": "org.bahmni.patient.search",
                "type": "config",
                "extensionParams": {
                    "display": "All patients",
                    "refreshTime": "10"
                },
                "forwardUrl": "#/patient/{{patientUuid}}/visit/{{visitUuid}}",
                "linkColumn": "action",
                "links": [
                    {
                        "url": "#/programs/patient/{{patientUuid}}/consultationContext",
                        "linkColumn": "status"
                    },
                    {
                        "url": "#/bedManagement/patient/{{patientUuid}}/visit/{{visitUuid}}",
                        "linkColumn": "bedStatus",
                        "newTab": true
                    }
                ],
                "label": "All patients",
                "order": 1,
                "requiredPrivilege": "app:clinical"
            };

            scope.$apply();
            var patient = {identifier: 'GAN1234', name: 'Ram Singh', uuid: 'p-uuid-1', activeVisitUuid: 'v-uuid-1', forwardUrl: "forwardUrl from the query"};
            scope.forwardPatient(patient, "action");
            expect(getAppDescriptor.formatUrl).toHaveBeenCalledWith("forwardUrl from the query", jasmine.any(Object), true);
            expect(_window.open).toHaveBeenCalledWith("formattedUrl", "_blank");
            scope.forwardPatient(patient, "status");
            expect(getAppDescriptor.formatUrl).toHaveBeenCalledWith("#/programs/patient/{{patientUuid}}/consultationContext", jasmine.any(Object), true);
            expect(_window.open).toHaveBeenCalledWith("formattedUrl", "_self");
            scope.forwardPatient(patient, "bedStatus");
            expect(getAppDescriptor.formatUrl).toHaveBeenCalledWith("#/bedManagement/patient/{{patientUuid}}/visit/{{visitUuid}}", jasmine.any(Object), true);
            expect(_window.open).toHaveBeenCalledWith("formattedUrl", "_blank");
        });
    });
});