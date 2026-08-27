'use strict';

angular.module('bahmni.common.displaycontrol.forms')
    .controller('versionedFormController', ['$scope', 'formService', 'appService', '$q', '$state', '$rootScope',
        function ($scope, formService, appService, $q, $state, $rootScope) {
            var MAX_SEARCH_QUERY_LENGTH = 80;
            var section = $scope.section || {};
            $scope.shouldPromptBrowserReload = true;
            $scope.showFormsDate = appService.getAppDescriptor().getConfigValue("showFormsDate");
            $scope.enableFormSearch = !!section.enableFormSearch;
            $scope.formSearchSortOrder = String(section.formSearchSortOrder || "asc").toLowerCase() === "desc" ? "desc" : "asc";
            $scope.formSearch = {text: sanitizeSearchText(section.formSearchText)};
            var formSearchIndex = [];

            function sanitizeSearchText (value) {
                return String(value || "").slice(0, MAX_SEARCH_QUERY_LENGTH);
            }

            var buildSearchIndex = function () {
                formSearchIndex = _.map($scope.formData || [], function (data) {
                    return {
                        data: data,
                        displayName: String($scope.getDisplayName(data) || "").toLowerCase(),
                        sortDate: new Date(data.encounterDateTime || 0).getTime()
                    };
                });
            };

            var getScoredSearchResults = function (query) {
                if (!query) {
                    return [];
                }
                return _.chain(formSearchIndex)
                    .filter(function (entry) {
                        return entry.displayName.indexOf(query) >= 0;
                    })
                    .sortBy(function (entry) {
                        return $scope.formSearchSortOrder === "desc" ? -entry.sortDate : entry.sortDate;
                    })
                    .value();
            };

            $scope.filteredFormData = function () {
                if (!$scope.enableFormSearch) {
                    return $scope.formData || [];
                }
                var query = sanitizeSearchText($scope.formSearch.text).toLowerCase();
                if (!query) {
                    return $scope.formData || [];
                }
                return _.map(getScoredSearchResults(query), function (entry) {
                    return entry.data;
                });
            };

            $scope.updateFormSearch = function () {
                if (!$scope.enableFormSearch) {
                    return;
                }
                $scope.formSearch.text = sanitizeSearchText($scope.formSearch.text);
            };

            const getUniqueForms = function (formData) {
                const uniqueForms = [];
                _.each(formData, function (item) {
                    const foundElement = _.find(uniqueForms, function (filteredItem) {
                        return item.formName === filteredItem.formName;
                    });
                    if (foundElement === undefined) {
                        uniqueForms.push(item);
                    }
                });
                return uniqueForms;
            };
            const sortFormDataByLatestDate = function (formData) {
                return _.sortBy(formData, "encounterDateTime").reverse();
            };

            function filterForms (formData) {
                const filteredForms = [];
                _.each(formData, function (item) {
                    if ($scope.section.formGroup.length == 0) {
                        filteredForms.push(item);
                    } else {
                        const foundElement = _.includes($scope.section.formGroup, item.formName);
                        if (foundElement) {
                            filteredForms.push(item);
                        }
                    }
                });
                return filteredForms;
            }

            var latestPublishedForms = function () {
                return formService.getFormList();
            };

            var init = function () {
                $scope.formsNotFound = false;
                var privileges = [];
                return $q.all([formService.getAllPatientForms($scope.patient.uuid, $scope.section.dashboardConfig.maximumNoOfVisits, $state.params.enrollment), latestPublishedForms()]).then(function (results) {
                    if (!(results[0] && results[0].data.length)) {
                        $scope.formsNotFound = true;
                        $scope.$emit("no-data-present-event");
                    } else {
                        var formListFromObsTab = results[0] && results[0].data;
                        var attachedFormList = [];
                        var latestForms = results[1] && results[1].data;
                        var privileges = 'privileges';

                        if (latestForms) {
                            $scope.formsWithNameTranslations = latestForms.map(function (latestForm) {
                                _.each(formListFromObsTab, function (item) {
                                    if (item.formName === latestForm.name) {
                                        item['privileges'] = latestForm.privileges;
                                        attachedFormList.push(item);
                                    }
                                });
                                return {
                                    formName: latestForm.name,
                                    formNameTranslations: latestForm.nameTranslation ? JSON.parse(latestForm.nameTranslation) : []
                                };
                            });
                        }
                        if (attachedFormList.length == 0) {
                            attachedFormList = formListFromObsTab;
                        }
                        var sortedFormDataByDate = sortFormDataByLatestDate(filterForms(attachedFormList));
                        if ($scope.isOnDashboard) {
                            sortedFormDataByDate = getUniqueForms(sortedFormDataByDate);
                        }

                        $scope.formData = sortedFormDataByDate;
                    }
                });
            };
            $scope.doesUserHaveAccessToTheForm = function (data, action) {
                if ((typeof data.privileges != 'undefined') && (data.privileges != null) && (data.privileges.length > 0)) {
                    var editable = [];
                    var viewable = [];
                    data.privileges.forEach(function (formPrivilege) {
                        _.find($rootScope.currentUser.privileges, function (privilege) {
                            if (formPrivilege.privilegeName === privilege.name) {
                                if (action === 'edit') {
                                    editable.push(formPrivilege.editable);
                                } else {
                                    viewable.push(formPrivilege.viewable);
                                }
                            }
                        });
                    });
                    if (action === 'edit') {
                        if (editable.includes(true)) {
                            return true;
                        }
                    } else {
                        if (viewable.includes(true)) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                } else { return true; }
            };

            $scope.getDisplayName = function (data) {
                if ($scope.formsWithNameTranslations && $scope.formsWithNameTranslations.length > 0) {
                    var formWithNameTranslation = $scope.formsWithNameTranslations.find(function (formWithNameTranslation) {
                        return formWithNameTranslation.formName === data.formName;
                    });
                    var locale = localStorage.getItem("NG_TRANSLATE_LANG_KEY") || "en";
                    var currentLabel = formWithNameTranslation && formWithNameTranslation.formNameTranslations
                           .find(function (formNameTranslation) {
                               return formNameTranslation.locale === locale;
                           });
                    if (currentLabel) {
                        return currentLabel.display;
                    }
                }

                return data.formName;
            };

            $scope.initialization = init();

            $scope.$watch("formData", function () {
                buildSearchIndex();
                $scope.updateFormSearch();
            });

            $scope.$watch("section.formSearchText", function (newValue, oldValue) {
                if (!$scope.enableFormSearch || newValue === oldValue) {
                    return;
                }
                var sanitized = sanitizeSearchText(newValue);
                if ($scope.section && sanitized !== newValue) {
                    $scope.section.formSearchText = sanitized;
                    return;
                }
                $scope.formSearch.text = sanitized;
                $scope.updateFormSearch();
            });

            $scope.shouldPromptBeforeClose = true;

            $scope.dialogData = {
                "patient": $scope.patient,
                "section": $scope.section
            };

            $scope.getConfigToFetchDataAndShow = function (data) {
                return {
                    patient: $scope.patient,
                    config: {
                        formName: data.formName,
                        showGroupDateTime: false,
                        encounterUuid: data.encounterUuid,
                        observationUuid: data.uuid,
                        formType: $scope.section.type,
                        formDisplayName: $scope.getDisplayName(data)
                    }
                };
            };

            $scope.getEditObsData = function (observation) {
                return {
                    observation: observation,
                    conceptSetName: $scope.getDisplayName(observation),
                    conceptDisplayName: $scope.getDisplayName(observation)
                };
            };
        }]);
