'use strict';

angular.module('bahmni.common.displaycontrol.forms')
    .directive('formsTable', ['conceptSetService', 'spinner', '$q', 'visitFormService', 'appService', '$state', '$rootScope',
        function (conceptSetService, spinner, $q, visitFormService, appService, $state, $rootScope) {
            var defaultController = function ($scope) {
                var MAX_SEARCH_QUERY_LENGTH = 80;
                var section = $scope.section || {};
                $scope.shouldPromptBrowserReload = true;
                $scope.showFormsDate = appService.getAppDescriptor().getConfigValue("showFormsDate");
                $scope.selectShortNameForForms = appService.getAppDescriptor().getConfigValue("selectShortNameForForms");
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
                            sortDate: new Date(data.obsDatetime || data.encounterDateTime || 0).getTime()
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

                var getAllObservationTemplates = function () {
                    return conceptSetService.getConcept({
                        name: "All Observation Templates",
                        v: "custom:(setMembers:(display))"
                    });
                };
                var obsFormData = function () {
                    var maxVisits = (section.dashboardConfig || {}).maximumNoOfVisits;
                    return visitFormService.formData($scope.patient.uuid, maxVisits, section.formGroup, $state.params.enrollment);
                };

                var filterFormData = function (formData) {
                    var filterList = [];
                    _.each(formData, function (item) {
                        var foundElement = _.find(filterList, function (filteredItem) {
                            return item.concept.uuid == filteredItem.concept.uuid;
                        });
                        if (foundElement == undefined) {
                            filterList.push(item);
                        }
                    });
                    return filterList;
                };

                var sortedFormDataByLatestDate = function (formData) {
                    return _.sortBy(formData, "obsDatetime").reverse();
                };
                $scope.doesUserHaveAccessToTheForm = function (data, action) {
                    if ((data.privileges != null) && (typeof data.privileges != undefined) && (data.privileges > 0)) {
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
                            }
                        }
                    } else { return true; }
                };
                var init = function () {
                    $scope.formsNotFound = false;
                    return $q.all([getAllObservationTemplates(), obsFormData()]).then(function (results) {
                        $scope.observationTemplates = results[0].data.results[0].setMembers;
                        var sortedFormDataByDate = sortedFormDataByLatestDate(results[1].data.results);
                        if ($scope.isOnDashboard) {
                            $scope.formData = filterFormData(sortedFormDataByDate);
                        } else {
                            $scope.formData = sortedFormDataByDate;
                        }

                        if ($scope.formData.length === 0) {
                            $scope.formsNotFound = true;
                            $scope.$emit("no-data-present-event");
                        }
                    });
                };

                $scope.getDisplayName = function (data) {
                    var concept = data.concept;
                    var defaultLocale = $rootScope.currentUser.userProperties.defaultLocale;
                    var displayName;
                    if ($scope.selectShortNameForForms == true) {
                        displayName = getLocaleSpecificConceptName(concept, defaultLocale, "SHORT");
                    }
                    else {
                        displayName = getLocaleSpecificConceptName(concept, defaultLocale, "FULLY_SPECIFIED");
                    }
                    return displayName;
                };
                var getLocaleSpecificConceptName = function (concept, locale, conceptNameType) {
                    conceptNameType = conceptNameType ? conceptNameType : "SHORT";
                    var localeSpecificName = _.filter(concept.names, function (name) {
                        return ((name.locale === locale) && (name.conceptNameType === conceptNameType));
                    });
                    if (localeSpecificName && localeSpecificName[0]) {
                        return localeSpecificName[0].display;
                    }
                    return concept.name.name;
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

                $scope.getEditObsData = function (observation) {
                    return {
                        observation: observation,
                        conceptSetName: observation.concept.displayString,
                        conceptDisplayName: $scope.getDisplayName(observation)
                    };
                };
                $scope.shouldPromptBeforeClose = true;

                $scope.getConfigToFetchDataAndShow = function (data) {
                    return {
                        patient: $scope.patient,
                        config: {
                            conceptNames: [data.concept.displayString],
                            showGroupDateTime: false,
                            encounterUuid: data.encounterUuid,
                            observationUuid: data.uuid
                        },
                        section: {
                            title: data.concept.displayString
                        }
                    };
                };

                $scope.dialogData = {
                    "patient": $scope.patient,
                    "section": $scope.section
                };
            };

            var link = function ($scope, element) {
                spinner.forPromise($scope.initialization, element);
            };

            return {
                restrict: 'E',
                controller: function ($scope, $controller) {
                    if ($scope.section.type && $scope.section.type === Bahmni.Common.Constants.formBuilderDisplayControlType) {
                        return $controller("versionedFormController", {$scope: $scope});
                    }
                    return defaultController($scope);
                },
                link: link,
                templateUrl: "../common/displaycontrols/forms/views/formsTable.html",
                scope: {
                    section: "=",
                    patient: "=",
                    isOnDashboard: "="
                }
            };
        }
    ]);

