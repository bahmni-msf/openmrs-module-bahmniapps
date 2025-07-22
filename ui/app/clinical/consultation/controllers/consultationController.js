'use strict';

angular.module('bahmni.clinical').controller('ConsultationController',
    ['$scope', '$rootScope', '$state', '$location', '$translate', 'clinicalAppConfigService', 'diagnosisService', 'urlHelper', 'contextChangeHandler',
        'spinner', 'encounterService', 'messagingService', 'sessionService', 'retrospectiveEntryService', 'patientContext', '$q',
        'patientVisitHistoryService', '$stateParams', '$window', 'visitHistory', 'clinicalDashboardConfig', 'appService',
        'ngDialog', '$filter', 'configurations', 'visitConfig', 'conditionsService', 'configurationService', 'auditLogService', 'confirmBox',
        'virtualConsultService', 'adhocTeleconsultationService',
        function ($scope, $rootScope, $state, $location, $translate, clinicalAppConfigService, diagnosisService, urlHelper, contextChangeHandler,
                  spinner, encounterService, messagingService, sessionService, retrospectiveEntryService, patientContext, $q,
                  patientVisitHistoryService, $stateParams, $window, visitHistory, clinicalDashboardConfig, appService,
                  ngDialog, $filter, configurations, visitConfig, conditionsService, configurationService, auditLogService, confirmBox,
                  virtualConsultService, adhocTeleconsultationService) {
            var ERROR = 1;
            var DateUtil = Bahmni.Common.Util.DateUtil;
            var getPreviousActiveCondition = Bahmni.Common.Domain.Conditions.getPreviousActiveCondition;
            $scope.togglePrintList = false;
            $scope.patient = patientContext.patient;
            $scope.showDashboardMenu = false;
            $scope.showMobileMenu = false;
            $scope.stateChange = function () {
                return $state.current.name === 'patient.dashboard.show';
            };
            $scope.showComment = true;
            $scope.showSaveAndContinueButton = true;

            $scope.visitHistory = visitHistory;
            $scope.consultationBoardLink = clinicalAppConfigService.getConsultationBoardLink();
            $scope.showControlPanel = false;
            $scope.clinicalDashboardConfig = clinicalDashboardConfig;
            $scope.lastvisited = null;

            $scope.openConsultationInNewTab = function () {
                $window.open('#' + $scope.consultationBoardLink, '_blank');
            };

            $scope.toggleMobileMenu = function () {
                $scope.showMobileMenu = !$scope.showMobileMenu;
            };

            $scope.toggleDashboardMenu = function () {
                $scope.showDashboardMenu = !$scope.showDashboardMenu;
            };

            $scope.showDashboard = function (dashboard) {
                if (!clinicalDashboardConfig.isCurrentTab(dashboard)) {
                    $scope.$parent.$broadcast("event:switchDashboard", dashboard);
                }
                $scope.showDashboardMenu = false;
            };

            var setPrintAction = function (event, tab) {
                tab.print = function () {
                    $rootScope.$broadcast(event, tab);
                };
            };
            var setDashboardPrintAction = _.partial(setPrintAction, "event:printDashboard", _);
            var setVisitTabPrintAction = function (tab) {
                tab.print = function () {
                    var url = $state.href('patient.dashboard.visitPrint', {
                        visitUuid: visitHistory.activeVisit.uuid,
                        tab: tab.title,
                        print: 'print'
                    });
                    window.open(url, '_blank');
                };
            };

            clinicalDashboardConfig.allowAdhocTeleConsultation = appService.getAppDescriptor().getConfigValue('allowAdhocTeleConsultation');

            $scope.startAdhocTeleconsultationLink = function () {
                adhocTeleconsultationService.generateAdhocTeleconsultationLink(
                    {
                        patientUuid: $scope.patient.uuid,
                        provider: $rootScope.currentUser.username
                    }).then(function (data) {
                        if (!(data && data.data)) {
                            messagingService.showMessage('error', "{{'TELECON_ERROR_KEY' | translate }}");
                        }
                        virtualConsultService.launchMeeting(data.data.uuid, data.data.link);
                        if (data.data.notificationResults && data.data.notificationResults.length > 0) {
                            var message = data.data.notificationResults[0].message;
                            var status = data.data.notificationResults[0].status;
                            if (status === ERROR) {
                                messagingService.showMessage('error', message);
                            } else {
                                messagingService.showMessage('info', message);
                            }
                        }
                    });
            };

            _.each(visitConfig.tabs, setVisitTabPrintAction);
            _.each(clinicalDashboardConfig.tabs, setDashboardPrintAction);
            $scope.printList = _.concat(clinicalDashboardConfig.tabs, visitConfig.tabs);

            clinicalDashboardConfig.quickPrints = appService.getAppDescriptor().getConfigValue('quickPrints');
            $scope.printDashboard = function (tab) {
                if (tab) {
                    tab.print();
                } else {
                    clinicalDashboardConfig.currentTab.print();
                }
            };

            $scope.allowConsultation = function () {
                return appService.getAppDescriptor().getConfigValue('allowConsultationWhenNoOpenVisit');
            };

            $scope.closeDashboard = function (dashboard) {
                clinicalDashboardConfig.closeTab(dashboard);
                $scope.$parent.$parent.$broadcast("event:switchDashboard", clinicalDashboardConfig.currentTab);
            };

            $scope.closeAllDialogs = function () {
                ngDialog.closeAll();
            };

            $scope.availableBoards = [];
            $scope.configName = $stateParams.configName;

            $scope.getTitle = function (board) {
                return $filter('titleTranslate')(board);
            };

            $scope.showBoard = function (boardIndex) {
                $rootScope.collapseControlPanel();
                return buttonClickAction($scope.availableBoards[boardIndex]);
            };

            $scope.gotoPatientDashboard = function () {
                if (!isFormValid()) {
                    $scope.$parent.$parent.$broadcast("event:errorsOnForm");
                    return $q.when({});
                }
                if (contextChangeHandler.execute()["allow"]) {
                    var params = {
                        configName: $scope.configName,
                        patientUuid: patientContext.patient.uuid,
                        encounterUuid: undefined
                    };
                    if ($scope.dashboardDirty) {
                        params['dashboardCachebuster'] = Math.random();
                    }
                    $state.go("patient.dashboard.show", params);
                }
            };

            var isLongerName = function (value) {
                return value ? value.length > 18 : false;
            };

            $scope.getShorterName = function (value) {
                return isLongerName(value) ? value.substring(0, 15) + "..." : value;
            };

            $scope.isInEditEncounterMode = function () {
                return $stateParams.encounterUuid !== undefined && $stateParams.encounterUuid !== 'active';
            };

            $scope.enablePatientSearch = function () {
                return appService.getAppDescriptor().getConfigValue('allowPatientSwitchOnConsultation') === true;
            };

            var setCurrentBoardBasedOnPath = function () {
                var currentPath = $location.url();
                var board = _.find($scope.availableBoards, function (board) {
                    if (board.url === "treatment") {
                        return _.includes(currentPath, board.extensionParams ? board.extensionParams.tabConfigName : board.url);
                    }
                    return _.includes(currentPath, board.url);
                });
                if (board) {
                    _.map($scope.availableBoards, function (availableBoard) {
                        availableBoard.isSelectedTab = false;
                    });
                    $scope.currentBoard = board;
                    $scope.currentBoard.isSelectedTab = true;
                }
            };

            var initialize = function () {
                var appExtensions = clinicalAppConfigService.getAllConsultationBoards();
                $scope.adtNavigationConfig = {forwardUrl: Bahmni.Clinical.Constants.adtForwardUrl, title: $translate.instant("CLINICAL_GO_TO_DASHBOARD_LABEL"), privilege: Bahmni.Clinical.Constants.adtPrivilege };
                $scope.availableBoards = $scope.availableBoards.concat(appExtensions);
                $scope.showSaveConfirmDialogConfig = appService.getAppDescriptor().getConfigValue('showSaveConfirmDialog');
                var adtNavigationConfig = appService.getAppDescriptor().getConfigValue('adtNavigationConfig');
                Object.assign($scope.adtNavigationConfig, adtNavigationConfig);
                setCurrentBoardBasedOnPath();
            };

            $scope.shouldDisplaySaveConfirmDialogForStateChange = function (toState, toParams, fromState, fromParams) {
                if (toState.name.match(/patient.dashboard.show.*/)) {
                    return fromParams.patientUuid != toParams.patientUuid;
                }
                return true;
            };

            var cleanUpListenerStateChangeStart = $scope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
                if ($scope.showSaveConfirmDialogConfig) {
                    if ($rootScope.hasVisitedConsultation && $scope.shouldDisplaySaveConfirmDialogForStateChange(toState, toParams, fromState, fromParams)) {
                        if ($scope.showConfirmationPopUp) {
                            event.preventDefault();
                            spinner.hide(toState.spinnerToken);
                            ngDialog.close();
                            $scope.toStateConfig = {toState: toState, toParams: toParams};
                            $scope.displayConfirmationDialog();
                        }
                    }
                }
                setCurrentBoardBasedOnPath();
            });

            $scope.adtNavigationURL = function (visitUuid) {
                return appService.getAppDescriptor().formatUrl($scope.adtNavigationConfig.forwardUrl, {'patientUuid': $scope.patient.uuid, 'visitUuid': visitUuid});
            };

            var cleanUpListenerErrorsOnForm = $scope.$on("event:errorsOnForm", function () {
                $scope.showConfirmationPopUp = true;
            });

            $scope.displayConfirmationDialog = function (event) {
                if ($rootScope.hasVisitedConsultation && $scope.showSaveConfirmDialogConfig) {
                    if (event) {
                        event.preventDefault();
                        $scope.targetUrl = event.currentTarget.getAttribute('href');
                    }
                    ngDialog.openConfirm({template: '../common/ui-helper/views/saveConfirmation.html', scope: $scope});
                }
                if ($scope.showTeleConsultationWindow) {
                    var childScope = {};
                    childScope.message = 'Please end teleconsultation before moving out of this window';
                    childScope.ok = okEvent;
                    if (event) {
                        event.preventDefault();
                        confirmBox({
                            scope: childScope,
                            actions: [{name: 'ok', display: 'Ok'}],
                            className: "ngdialog-theme-default delete-program-popup"
                        });
                    }
                }
            };

            var okEvent = function (closeDialog) {
                closeDialog();
            };

            var cleanUpListenerStateChangeSuccess = $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState) {
                if (toState.name.match(/patient.dashboard.show.+/)) {
                    $rootScope.hasVisitedConsultation = true;
                    $scope.showConfirmationPopUp = true;
                    if ($scope.showSaveConfirmDialogConfig) {
                        $rootScope.$broadcast("event:pageUnload");
                    }
                }
                if ((toState.name === fromState.name) && (fromState.name === "patient.dashboard.show")) {
                    $rootScope.hasVisitedConsultation = false;
                }
            });

            $scope.$on("$destroy", function () {
                cleanUpListenerStateChangeSuccess();
                cleanUpListenerErrorsOnForm();
                cleanUpListenerStateChangeStart();
            });

            $scope.cancelTransition = function () {
                $scope.showConfirmationPopUp = true;
                ngDialog.close();
                delete $scope.targetUrl;
            };

            $scope.saveAndContinue = function () {
                $scope.showConfirmationPopUp = false;
                $scope.save($scope.toStateConfig);
                $window.onbeforeunload = null;
                ngDialog.close();
            };

            $scope.continueWithoutSaving = function () {
                $scope.showConfirmationPopUp = false;
                if ($scope.targetUrl) {
                    $window.open($scope.targetUrl, "_self");
                }
                $window.onbeforeunload = null;
                if ($scope.toStateConfig) {
                    $state.go($scope.toStateConfig.toState, $scope.toStateConfig.toParams);
                }
                ngDialog.close();
            };

            var getUrl = function (board) {
                var urlPrefix = urlHelper.getPatientUrl();
                var url = "/" + $stateParams.configName + (board.url ? urlPrefix + "/" + board.url : urlPrefix);
                var queryParams = [];
                if ($state.params.encounterUuid) {
                    queryParams.push("encounterUuid=" + $state.params.encounterUuid);
                }
                if ($state.params.programUuid) {
                    queryParams.push("programUuid=" + $state.params.programUuid);
                }

                if ($state.params.enrollment) {
                    queryParams.push("enrollment=" + $state.params.enrollment);
                }

                if ($state.params.dateEnrolled) {
                    queryParams.push("dateEnrolled=" + $state.params.dateEnrolled);
                }

                if ($state.params.dateCompleted) {
                    queryParams.push("dateCompleted=" + $state.params.dateCompleted);
                }

                var extensionParams = board.extensionParams;
                angular.forEach(extensionParams, function (extensionParamValue, extensionParamKey) {
                    queryParams.push(extensionParamKey + "=" + extensionParamValue);
                });

                if (!_.isEmpty(queryParams)) {
                    url = url + "?" + queryParams.join("&");
                }

                $scope.lastConsultationTabUrl.url = url;
                return $location.url(url);
            };

            $scope.openConsultation = function () {
                if ($scope.showSaveConfirmDialogConfig) {
                    $rootScope.$broadcast("event:pageUnload");
                }
                $scope.closeAllDialogs();
                $scope.collapseControlPanel();
                $rootScope.hasVisitedConsultation = true;
                switchToConsultationTab();
            };

            var switchToConsultationTab = function () {
                if ($scope.lastConsultationTabUrl.url) {
                    $location.url($scope.lastConsultationTabUrl.url);
                } else {
                    // Default tab
                    getUrl($scope.availableBoards[0]);
                }
            };

            var contextChange = function () {
                return contextChangeHandler.execute();
            };

            var buttonClickAction = function (board) {
                if ($scope.currentBoard === board) {
                    return;
                }
                if (!isFormValid()) {
                    $scope.$parent.$broadcast("event:errorsOnForm");
                    return;
                }

                contextChangeHandler.reset();
                _.map($scope.availableBoards, function (availableBoard) {
                    availableBoard.isSelectedTab = false;
                });

                $scope.currentBoard = board;
                $scope.currentBoard.isSelectedTab = true;
                return getUrl(board);
            };

            var preSaveEvents = function () {
                var observationForms = $scope.consultation.observationForms;
                var addedObservationForms = _.filter(observationForms, function (form) {
                    return form.isAdded;
                });
                _.each(addedObservationForms, function (form) {
                    if (form.component && form.events && form.events.onFormSave) {
                        try {
                            form.component.state.data = runEventScript(form.component.state.data,
                                form.events.onFormSave, form.component.props && form.component.props.patient);
                        } catch (error) {
                            throw error;
                        }
                    }
                });
            };

            var preSavePromise = function () {
                var deferred = $q.defer();
                var observationFilter = new Bahmni.Common.Domain.ObservationFilter();
                $scope.consultation.preSaveHandler.fire();
                $scope.lastvisited = $scope.consultation.lastvisited;
                var selectedObsTemplate = $scope.consultation.selectedObsTemplate;
                var tempConsultation = angular.copy($scope.consultation);
                tempConsultation.observations = observationFilter.filter(tempConsultation.observations);
                tempConsultation.consultationNote = observationFilter.filter([tempConsultation.consultationNote])[0];
                tempConsultation.labOrderNote = observationFilter.filter([tempConsultation.labOrderNote])[0];

                addFormObservations(tempConsultation);
                storeTemplatePreference(selectedObsTemplate);
                var visitTypeForRetrospectiveEntries = clinicalAppConfigService.getVisitTypeForRetrospectiveEntries();
                var defaultVisitType = clinicalAppConfigService.getDefaultVisitType();
                var encounterData = new Bahmni.Clinical.EncounterTransactionMapper().map(tempConsultation, $scope.patient, sessionService.getLoginLocationUuid(), retrospectiveEntryService.getRetrospectiveEntry(),
                    visitTypeForRetrospectiveEntries, defaultVisitType, $scope.isInEditEncounterMode(), $state.params.enrollment);
                deferred.resolve(encounterData);
                return deferred.promise;
            };

            var saveConditions = function () {
                return conditionsService.save($scope.consultation.conditions, $scope.patient.uuid)
                    .then(function () {
                        return conditionsService.getConditions($scope.patient.uuid);
                    }).then(function (savedConditions) {
                        return savedConditions;
                    });
            };

            var storeTemplatePreference = function (selectedObsTemplate) {
                var templates = [];
                _.each(selectedObsTemplate, function (template) {
                    var templateName = template.formName || template.conceptName;
                    var isTemplateAlreadyPresent = _.find(templates, function (template) {
                        return template === templateName;
                    });
                    if (_.isUndefined(isTemplateAlreadyPresent)) {
                        templates.push(templateName);
                    }
                });

                var data = {
                    "patientUuid": $scope.patient.uuid,
                    "providerUuid": $rootScope.currentProvider.uuid,
                    "templates": templates
                };

                if (!_.isEmpty(templates)) {
                    localStorage.setItem("templatePreference", JSON.stringify(data));
                }
            };

            var discontinuedDrugOrderValidation = function (removableDrugs) {
                var discontinuedDrugOrderValidationMessage;
                _.find(removableDrugs, function (drugOrder) {
                    if (!drugOrder.dateStopped) {
                        if (drugOrder._effectiveStartDate < moment()) {
                            discontinuedDrugOrderValidationMessage = "Please make sure that " + drugOrder.concept.name + " has a stop date between " + DateUtil.getDateWithoutTime(drugOrder._effectiveStartDate) + " and " + DateUtil.getDateWithoutTime(DateUtil.now());
                            return true;
                        } else {
                            discontinuedDrugOrderValidationMessage = drugOrder.concept.name + " should have stop date as today's date since it is a future drug order";
                            return true;
                        }
                    }
                });
                return discontinuedDrugOrderValidationMessage;
            };

            var addFormObservations = function (tempConsultation) {
                if (tempConsultation.observationForms) {
                    _.remove(tempConsultation.observations, function (observation) {
                        return observation.formNamespace;
                    });
                    _.each($scope.consultation.observationForms, function (observationForm) {
                        if (observationForm.component && observationForm.isAdded) {
                            var formObservations = observationForm.component.getValue();
                            _.each(formObservations.observations, function (obs) {
                                tempConsultation.observations.push(obs);
                            });
                        }
                    });
                }
            };

            var isObservationFormValid = function () {
                var valid = true;
                _.each($scope.consultation.observationForms, function (observationForm) {
                    if (valid && observationForm.component && observationForm.isAdded) {
                        var value = observationForm.component.getValue();

                        // Check for explicit errors returned by the component
                        if (value.errors && value.errors.length > 0) {
                            messagingService.showMessage('error', "{{'CLINICAL_FORM_ERRORS_MESSAGE_KEY' | translate }}");
                            valid = false;
                            return;
                        }

                        // Validate React form components
                        if (!validateReactFormComponent(observationForm, value)) {
                            valid = false;
                            return;
                        }

                        // Validate DOM-based form elements
                        if (!validateFormDOM(observationForm)) {
                            valid = false;
                            return;
                        }

                        // Fallback: Traditional observation validation
                        if (!validateTraditionalObservations(value)) {
                            valid = false;
                            return;
                        }
                    }
                });
                return valid;
            };

            // React Component Validation - Single Responsibility
            var validateReactFormComponent = function (observationForm, value) {
                if (!observationForm.component.state || !observationForm.component.state.data) {
                    return true;
                }

                try {
                    // Force validateForm to true if it's false
                    if (observationForm.component.props && observationForm.component.props.validateForm === false) {
                        observationForm.component.props.validateForm = true;
                    }

                    // Validate mandatory fields in metadata
                    if (!validateMandatoryFields(observationForm, value)) {
                        return false;
                    }

                    // Check component validation methods
                    return checkComponentValidationMethods(observationForm);
                } catch (error) {
                    return true; // Continue if React validation fails
                }
            };

            // Mandatory Fields Validation - Single Responsibility
            var validateMandatoryFields = function (observationForm, value) {
                var metadata = observationForm.component.props && observationForm.component.props.metadata;
                if (!metadata || !metadata.controls) {
                    return true;
                }

                var mandatoryViolations = [];
                _.each(metadata.controls, function (control) {
                    if (isMandatoryControl(control) && isFieldVisible(observationForm, control)) {
                        if (!hasObservationValue(value, control)) {
                            mandatoryViolations.push(control);
                        }
                    }
                });

                if (mandatoryViolations.length > 0) {
                    messagingService.showMessage('error', "{{'CLINICAL_FORM_ERRORS_MESSAGE_KEY' | translate }}");
                    return false;
                }
                return true;
            };

            // Field Visibility Check - Single Responsibility
            var isFieldVisible = function (observationForm, control) {
                // Check via form component method
                try {
                    if (observationForm.component.get) {
                        var fieldInForm = observationForm.component.get(control.concept.name);
                        if (fieldInForm && fieldInForm.isHidden) {
                            return !fieldInForm.isHidden();
                        }
                    }
                } catch (error) {
                    // Continue to DOM check
                }

                // Check via DOM visibility
                return isDOMFieldVisible(control);
            };

            // DOM Visibility Check - Single Responsibility
            var isDOMFieldVisible = function (control) {
                var fieldElements = document.querySelectorAll(
                    '[data-concept-name="' + control.concept.name + '"], [data-concept-uuid="' + control.concept.uuid + '"]'
                );

                if (fieldElements.length === 0) {
                    var labelTexts = Array.from(document.querySelectorAll('label, .field-label, .concept-name'));
                    return _.some(labelTexts, function (label) {
                        return label.textContent &&
                               label.textContent.includes(control.concept.name.split(',')[0]) &&
                               label.offsetParent !== null;
                    });
                }

                return _.some(fieldElements, function (element) {
                    return element.offsetParent !== null;
                });
            };

            // Component Validation Methods - Single Responsibility
            var checkComponentValidationMethods = function (observationForm) {
                var component = observationForm.component;

                // Check validate method
                if (component.validate && typeof component.validate === 'function') {
                    var componentValidation = component.validate();
                    if (componentValidation === false || (componentValidation && componentValidation.errors && componentValidation.errors.length > 0)) {
                        messagingService.showMessage('error', "{{'CLINICAL_FORM_ERRORS_MESSAGE_KEY' | translate }}");
                        return false;
                    }
                }

                // Check isValid method
                if (component.isValid && typeof component.isValid === 'function') {
                    if (component.isValid() === false) {
                        messagingService.showMessage('error', "{{'CLINICAL_FORM_ERRORS_MESSAGE_KEY' | translate }}");
                        return false;
                    }
                }

                // Force re-validation via setState
                if (component.setState && typeof component.setState === 'function') {
                    component.setState({validateForm: true}, function () {
                        var revalidationResult = component.getValue();
                        if (revalidationResult.errors && revalidationResult.errors.length > 0) {
                            return false;
                        }
                    });
                }

                return true;
            };

            // DOM Form Validation - Single Responsibility
            var validateFormDOM = function (observationForm) {
                var formContainer = document.getElementById(observationForm.formUuid);
                if (!formContainer) {
                    return true;
                }

                // Check for React validation errors
                var reactValidationErrors = formContainer.querySelectorAll(
                    '.error, .invalid, .required-error, .validation-error, ' +
                    '[class*="error"], [class*="invalid"], [class*="Error"], ' +
                    '.field-error, .input-error, .form-error'
                );

                if (reactValidationErrors.length > 0) {
                    messagingService.showMessage('error', "{{'CLINICAL_FORM_ERRORS_MESSAGE_KEY' | translate }}");
                    return false;
                }

                // Check for empty required fields
                return validateRequiredFields(formContainer);
            };

            // Required Fields Validation - Single Responsibility
            var validateRequiredFields = function (formContainer) {
                var requiredFields = formContainer.querySelectorAll(
                    'input[required], select[required], textarea[required], ' +
                    '.required input, .required select, .required textarea, ' +
                    '.mandatory input, .mandatory select, .mandatory textarea, ' +
                    '[data-required="true"] input, [data-required="true"] select, [data-required="true"] textarea'
                );

                var emptyRequiredFields = 0;
                _.each(requiredFields, function (field) {
                    if (field.offsetParent !== null && isFieldEmpty(field)) {
                        emptyRequiredFields++;
                    }
                });

                if (emptyRequiredFields > 0) {
                    messagingService.showMessage('error', "{{'CLINICAL_FORM_ERRORS_MESSAGE_KEY' | translate }}");
                    return false;
                }

                return true;
            };

            // Traditional Observations Validation - Single Responsibility
            var validateTraditionalObservations = function (value) {
                if (!value.observations) {
                    return true;
                }

                var hasInvalidVisibleFields = _.some(value.observations, function (obs) {
                    return !validateObservationRecursively(obs, true, true);
                });

                if (hasInvalidVisibleFields) {
                    messagingService.showMessage('error', "{{'CLINICAL_FORM_ERRORS_MESSAGE_KEY' | translate }}");
                    return false;
                }

                return true;
            };

            // Utility Functions
            var isMandatoryControl = function (control) {
                return control.properties && control.properties.mandatory === true;
            };

            var hasObservationValue = function (value, control) {
                return value.observations && _.some(value.observations, function (obs) {
                    return obs.concept && obs.concept.uuid === control.concept.uuid;
                });
            };

            var isFieldEmpty = function (field) {
                if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
                    return !field.value || field.value.trim() === '';
                }
                if (field.tagName === 'SELECT') {
                    return !field.value || field.selectedIndex === 0;
                }
                return field.querySelectorAll('.active, [aria-pressed="true"], :checked').length === 0;
            };

            // Enhanced helper function to recursively validate observations
            var validateObservationRecursively = function (obs, checkRequiredFields, conceptSetRequired) {
                if (!obs) return true;

                try {
                    // Use observation's isValid method if available
                    if (typeof obs.isValid === 'function') {
                        return obs.isValid(checkRequiredFields, conceptSetRequired);
                    }

                    // For grouped observations, validate all group members
                    if (obs.groupMembers && obs.groupMembers.length > 0) {
                        return _.every(obs.groupMembers, function (member) {
                            return validateObservationRecursively(member, checkRequiredFields, conceptSetRequired);
                        });
                    }

                    // Basic validation for observations without isValid method
                    if (checkRequiredFields && obs.conceptUIConfig && obs.conceptUIConfig.required) {
                        // Skip validation only if truly hidden (not just due to skip logic)
                        if (obs.hidden && !(obs.conceptUIConfig.controlEvent || obs.hasControlEvents)) {
                            return true;
                        }

                        // Check if the observation has a value
                        return obs.value !== undefined && obs.value !== null && obs.value !== '' || obs.value === false;
                    }

                    return true;
                } catch (error) {
                    return false; // Treat validation errors as invalid
                }
            };

            var isFormValid = function () {
                var contxChange = contextChange();
                var shouldAllow = contxChange["allow"];
                var discontinuedDrugOrderValidationMessage = discontinuedDrugOrderValidation($scope.consultation.discontinuedDrugs);
                if (!shouldAllow) {
                    var errorMessage = contxChange["errorMessage"] ? contxChange["errorMessage"] : "{{'CLINICAL_FORM_ERRORS_MESSAGE_KEY' | translate }}";
                    messagingService.showMessage('error', errorMessage);
                } else if (discontinuedDrugOrderValidationMessage) {
                    var errorMessage = discontinuedDrugOrderValidationMessage;
                    messagingService.showMessage('error', errorMessage);
                }
                return shouldAllow && !discontinuedDrugOrderValidationMessage && isObservationFormValid();
            };

            var copyConsultationToScope = function (consultationWithDiagnosis) {
                consultationWithDiagnosis.preSaveHandler = $scope.consultation.preSaveHandler;
                consultationWithDiagnosis.postSaveHandler = $scope.consultation.postSaveHandler;
                $scope.$parent.consultation = consultationWithDiagnosis;
                $scope.$parent.consultation.postSaveHandler.fire();
                $scope.dashboardDirty = true;
            };

            var encounterTypeUuid = configurations.encounterConfig().getPatientDocumentEncounterTypeUuid();
            $scope.patientDocumentsPromise = encounterService.getEncountersForEncounterType($scope.patient.uuid, encounterTypeUuid).then(function (response) {
                return new Bahmni.Clinical.PatientFileObservationsMapper().map(response.data.results);
            });

            $scope.save = function (toStateConfig) {
                if (!isFormValid()) {
                    $scope.$parent.$parent.$broadcast("event:errorsOnForm");
                    return $q.when({});
                }

                // Final validation check for any remaining validation errors
                var hasValidationErrors = document.querySelectorAll('.illegalValue, .ng-invalid-required').length > 0;
                if (hasValidationErrors) {
                    messagingService.showMessage('error', "{{'CLINICAL_FORM_ERRORS_MESSAGE_KEY' | translate }}");
                    $scope.$parent.$parent.$broadcast("event:errorsOnForm");
                    return $q.when({});
                }

                return proceedWithActualSave(toStateConfig);
            };

            // Extract the actual save logic into a separate function
            var proceedWithActualSave = function (toStateConfig) {
                try {
                    preSaveEvents();
                    return spinner.forPromise($q.all([preSavePromise(),
                        encounterService.getEncounterType($state.params.programUuid, sessionService.getLoginLocationUuid())]).then(function (results) {
                            var encounterData = results[0];
                            encounterData.encounterTypeUuid = results[1].uuid;
                            var params = angular.copy($state.params);
                            params.cachebuster = Math.random();
                            return encounterService.create(encounterData)
                            .then(function (saveResponse) {
                                var messageParams = {
                                    encounterUuid: saveResponse.data.encounterUuid,
                                    encounterType: saveResponse.data.encounterType
                                };
                                auditLogService.log($scope.patient.uuid, "EDIT_ENCOUNTER", messageParams, "MODULE_LABEL_CLINICAL_KEY");
                                var consultationMapper = new Bahmni.ConsultationMapper(configurations.dosageFrequencyConfig(), configurations.dosageInstructionConfig(),
                                    configurations.consultationNoteConcept(), configurations.labOrderNotesConcept(), $scope.followUpConditionConcept);
                                var consultation = consultationMapper.map(saveResponse.data);
                                consultation.lastvisited = $scope.lastvisited;
                                return consultation;
                            }).then(function (savedConsultation) {
                                return spinner.forPromise(diagnosisService.populateDiagnosisInformation($scope.patient.uuid, savedConsultation)
                                    .then(function (consultationWithDiagnosis) {
                                        return saveConditions().then(function (savedConditions) {
                                            consultationWithDiagnosis.conditions = savedConditions;
                                            messagingService.showMessage('info', "{{'CLINICAL_SAVE_SUCCESS_MESSAGE_KEY' | translate}}");
                                        }, function () {
                                            consultationWithDiagnosis.conditions = $scope.consultation.conditions;
                                        }).then(function () {
                                            copyConsultationToScope(consultationWithDiagnosis);
                                            if ($scope.targetUrl) {
                                                return $window.open($scope.targetUrl, "_self");
                                            }
                                            return $state.transitionTo(toStateConfig ? toStateConfig.toState : $state.current, toStateConfig ? toStateConfig.toParams : params, {
                                                inherit: false,
                                                notify: true,
                                                reload: (toStateConfig !== undefined)
                                            });
                                        });
                                    }));
                            }).catch(function (error) {
                                var message = Bahmni.Clinical.Error.translate(error) || "{{'CLINICAL_SAVE_FAILURE_MESSAGE_KEY' | translate}}";
                                messagingService.showMessage('error', message);
                            });
                        }));
                } catch (error) {
                    var displayErrors = function (error) {
                        if (angular.isArray(error)) {
                            _.each(error, function (errorObj) {
                                messagingService.showMessage('error', errorObj.message || '[ERROR]');
                            });
                        } else {
                            messagingService.showMessage('error', error.message || '[ERROR]');
                        }
                    };
                    return spinner.forPromise(Promise.resolve(displayErrors(error)));
                }
            };

            $scope.$on("patientContext:goToPatientDashboard", function () {
                $scope.gotoPatientDashboard();
            });

            initialize();
        }]);
