'use strict';

angular.module('bahmni.clinical')
    .controller('DrugOrderHistoryController', ['$scope', '$filter', '$stateParams', 'activeDrugOrders',
        'treatmentConfig', 'treatmentService', 'appService', 'spinner', 'drugOrderHistoryHelper', 'visitHistory', '$translate', '$rootScope', '$q',
        function ($scope, $filter, $stateParams, activeDrugOrders, treatmentConfig, treatmentService, appService, spinner,
                   drugOrderHistoryHelper, visitHistory, $translate, $rootScope, $q) {
            var DrugOrderViewModel = Bahmni.Clinical.DrugOrderViewModel;
            var DateUtil = Bahmni.Common.Util.DateUtil;
            var currentVisit = visitHistory.activeVisit;
            var activeDrugOrdersList = [];
            var prescribedDrugOrders = [];
            $scope.dispensePrivilege = Bahmni.Clinical.Constants.dispensePrivilege;
            $scope.hideAdditionalInstructions = appService.getAppDescriptor().getConfigValue("hideAdditionalInstructions");
            var drugOrderHistoryConfig = treatmentConfig.drugOrderHistoryConfig || {};
            $scope.showStoppedByProvider = !!drugOrderHistoryConfig.showStoppedByProvider;
            var limitStopDateToEffectiveEnd = !!drugOrderHistoryConfig.limitStopDateToEffectiveEnd;
            $scope.scheduledDate = DateUtil.getDateWithoutTime(DateUtil.addDays(DateUtil.now(), 1));

            var createPrescriptionGroups = function (activeAndScheduledDrugOrders) {
                $scope.consultation.drugOrderGroups = [];
                createPrescribedDrugOrderGroups();
                createRecentDrugOrderGroup(activeAndScheduledDrugOrders);
            };

            var getPreviousVisitDrugOrders = function () {
                var currentVisitIndex = _.findIndex($scope.consultation.drugOrderGroups, function (group) {
                    return group.isCurrentVisit;
                });

                if ($scope.consultation.drugOrderGroups[currentVisitIndex + 1]) {
                    return $scope.consultation.drugOrderGroups[currentVisitIndex + 1].drugOrders;
                }
                return [];
            };

            var sortOrderSetDrugsFollowedByDrugOrders = function (drugOrders, showOnlyActive) {
                var orderSetOrdersAndDrugOrders = _.groupBy(drugOrders, function (drugOrder) {
                    if (drugOrder.orderGroupUuid) {
                        return 'orderSetOrders';
                    }
                    return 'drugOrders';
                });
                var refillableDrugOrders = drugOrderHistoryHelper.getRefillableDrugOrders(orderSetOrdersAndDrugOrders.drugOrders, getPreviousVisitDrugOrders(), showOnlyActive);
                return _(orderSetOrdersAndDrugOrders.orderSetOrders)
                    .concat(refillableDrugOrders)
                    .uniqBy('uuid')
                    .value();
            };

            var createRecentDrugOrderGroup = function (activeAndScheduledDrugOrders) {
                var showOnlyActive = treatmentConfig.drugOrderHistoryConfig.showOnlyActive;
                var refillableGroup = {
                    label: $translate.instant("MEDICATION_RECENT_TAB"),
                    selected: true,
                    drugOrders: sortOrderSetDrugsFollowedByDrugOrders(activeAndScheduledDrugOrders, showOnlyActive)
                };
                $scope.consultation.drugOrderGroups.unshift(refillableGroup);
                if (treatmentConfig.drugOrderHistoryConfig.numberOfVisits !== undefined && treatmentConfig.drugOrderHistoryConfig.numberOfVisits !== null && treatmentConfig.drugOrderHistoryConfig.numberOfVisits === 0) {
                    $scope.consultation.drugOrderGroups = [$scope.consultation.drugOrderGroups[0]];
                }
            };

            var createPrescribedDrugOrderGroups = function () {
                if (prescribedDrugOrders.length === 0) {
                    return [];
                }
                var drugOrderGroupedByDate = _.groupBy(prescribedDrugOrders, function (drugOrder) {
                    return DateUtil.parse(drugOrder.visit.startDateTime);
                });

                var createDrugOrder = function (drugOrder) {
                    return DrugOrderViewModel.createFromContract(drugOrder, treatmentConfig);
                };

                var drugOrderGroups = _.map(drugOrderGroupedByDate, function (drugOrders, visitStartDate) {
                    return {
                        label: $filter("bahmniDate")(visitStartDate),
                        visitStartDate: DateUtil.parse(visitStartDate),
                        drugOrders: drugOrders.map(createDrugOrder),
                        isCurrentVisit: currentVisit && DateUtil.isSameDateTime(visitStartDate, currentVisit.startDatetime)
                    };
                });
                $scope.consultation.drugOrderGroups = $scope.consultation.drugOrderGroups.concat(drugOrderGroups);
                $scope.consultation.drugOrderGroups = _.sortBy($scope.consultation.drugOrderGroups, 'visitStartDate').reverse();
            };

            $scope.stoppedOrderReasons = treatmentConfig.stoppedOrderReasonConcepts;

            var buildStoppedByLookup = function (rows) {
                var byUuid = _.keyBy(rows, "orderUuid");
                var byOrderNumber = _.keyBy(rows, "orderNumber");
                return function (drugOrder) {
                    if (!drugOrder || (drugOrder.stoppedByProvider && drugOrder.stoppedByProvider.name)) {
                        return;
                    }
                    var row = byUuid[drugOrder.uuid] || byUuid[drugOrder.previousOrderUuid]
                        || byOrderNumber[drugOrder.orderNumber];
                    if (row && row.stoppedBy) {
                        drugOrder.stoppedByProvider = {name: row.stoppedBy};
                    }
                };
            };

            var applyStoppedByProviders = function (rows) {
                if (_.isEmpty(rows)) {
                    return;
                }
                var applyToOrder = buildStoppedByLookup(rows);
                $scope.consultation.drugOrderGroups.forEach(function (group) {
                    group.drugOrders.forEach(applyToOrder);
                });
            };

            var init = function () {
                var numberOfVisits = treatmentConfig.drugOrderHistoryConfig.numberOfVisits ? treatmentConfig.drugOrderHistoryConfig.numberOfVisits : 3;
                var prescribedDrugOrdersPromise = treatmentService.getPrescribedDrugOrders(
                    $stateParams.patientUuid, true, numberOfVisits, $stateParams.dateEnrolled, $stateParams.dateCompleted);
                var loadPromise = $scope.showStoppedByProvider
                    ? $q.all([
                        prescribedDrugOrdersPromise,
                        treatmentService.getStoppedPrescriptionProviders($stateParams.patientUuid)
                    ]).then(function (results) {
                        prescribedDrugOrders = results[0];
                        createPrescriptionGroups($scope.consultation.activeAndScheduledDrugOrders);
                        applyStoppedByProviders(results[1]);
                    })
                    : prescribedDrugOrdersPromise.then(function (data) {
                        prescribedDrugOrders = data;
                        createPrescriptionGroups($scope.consultation.activeAndScheduledDrugOrders);
                    });
                spinner.forPromise(loadPromise);
            };
            $scope.getOrderReasonConcept = function (drugOrder) {
                if (drugOrder.orderReasonConcept) {
                    return drugOrder.orderReasonConcept.display || drugOrder.orderReasonConcept.name;
                }
            };

            $scope.toggleShowAdditionalInstructions = function (line) {
                line.showAdditionalInstructions = !line.showAdditionalInstructions;
            };

            $scope.drugOrderGroupsEmpty = function () {
                return _.isEmpty($scope.consultation.drugOrderGroups);
            };

            $scope.isDrugOrderGroupEmpty = function (drugOrders) {
                return _.isEmpty(drugOrders);
            };

            $scope.showEffectiveFromDate = function (visitStartDate, effectiveStartDate) {
                return $filter("bahmniDate")(effectiveStartDate) !== $filter("bahmniDate")(visitStartDate);
            };

            $scope.refill = function (drugOrder) {
                $rootScope.$broadcast("event:refillDrugOrder", drugOrder);
            };

            $scope.refillAll = function (drugOrders) {
                $rootScope.$broadcast("event:refillDrugOrders", drugOrders);
            };

            $scope.revise = function (drugOrder, drugOrders) {
                if ($scope.consultation.drugOrdersWithUpdatedOrderAttributes[drugOrder.uuid]) {
                    delete $scope.consultation.drugOrdersWithUpdatedOrderAttributes[drugOrder.uuid];
                    $scope.toggleDrugOrderAttribute(drugOrder.orderAttributes[0]);
                }

                if (drugOrder.isEditAllowed) {
                    $rootScope.$broadcast("event:reviseDrugOrder", drugOrder, drugOrders);
                }
            };

            $scope.updateFormConditions = function (drugOrder) {
                var formCondition = Bahmni.ConceptSet.FormConditions.rules ? Bahmni.ConceptSet.FormConditions.rules["Medication Stop Reason"] : undefined;
                if (formCondition) {
                    if (drugOrder.orderReasonConcept) {
                        if (!formCondition(drugOrder, drugOrder.orderReasonConcept.name.name)) {
                            disableAndClearReasonText(drugOrder);
                        }
                    } else {
                        disableAndClearReasonText(drugOrder);
                    }
                } else {
                    drugOrder.orderReasonNotesEnabled = true;
                }
            };

            var disableAndClearReasonText = function (drugOrder) {
                drugOrder.orderReasonText = null;
                drugOrder.orderReasonNotesEnabled = false;
            };

            $scope.discontinue = function (drugOrder) {
                if (drugOrder.isDiscontinuedAllowed) {
                    $rootScope.$broadcast("event:discontinueDrugOrder", drugOrder);
                    $scope.updateFormConditions(drugOrder);
                }
            };

            $scope.undoDiscontinue = function (drugOrder) {
                $rootScope.$broadcast("event:undoDiscontinueDrugOrder", drugOrder);
            };

            $scope.shouldBeDisabled = function (drugOrder, orderAttribute) {
                if (drugOrder.isBeingEdited) {
                    return true;
                }
                return !drugOrder.isActive() || orderAttribute.obsUuid;
            };

            $scope.updateOrderAttribute = function (drugOrder, orderAttribute, valueToSet) {
                if (!$scope.shouldBeDisabled(drugOrder, orderAttribute)) {
                    $scope.toggleDrugOrderAttribute(orderAttribute, valueToSet);
                    $scope.consultation.drugOrdersWithUpdatedOrderAttributes[drugOrder.uuid] = drugOrder;
                }
            };

            $scope.toggleDrugOrderAttribute = function (orderAttribute, valueToSet) {
                orderAttribute.value = valueToSet !== undefined ? valueToSet : !orderAttribute.value;
            };

            $scope.getOrderAttributes = function () {
                return treatmentConfig.orderAttributes;
            };

            $scope.updateAllOrderAttributesByName = function (orderAttribute, drugOrderGroup) {
                drugOrderGroup[orderAttribute.name] = drugOrderGroup[orderAttribute.name] || {};
                drugOrderGroup[orderAttribute.name].selected = drugOrderGroup[orderAttribute.name].selected ? false : true;

                drugOrderGroup.drugOrders.forEach(function (drugOrder) {
                    var selectedOrderAttribute = getAttribute(drugOrder, orderAttribute.name);
                    $scope.updateOrderAttribute(drugOrder, selectedOrderAttribute, drugOrderGroup[orderAttribute.name].selected);
                });
            };

            $scope.allOrderAttributesOfNameSet = function (drugOrderGroup, orderAttributeName) {
                var allAttributesSelected = true;
                drugOrderGroup.drugOrders.forEach(function (drugOrder) {
                    var orderAttributeOfName = getAttribute(drugOrder, orderAttributeName);
                    if (!$scope.shouldBeDisabled(drugOrder, orderAttributeOfName) && !orderAttributeOfName.value) {
                        allAttributesSelected = false;
                    }
                });
                drugOrderGroup[orderAttributeName] = drugOrderGroup[orderAttributeName] || {};
                drugOrderGroup[orderAttributeName].selected = allAttributesSelected;
            };

            $scope.canUpdateAtLeastOneOrderAttributeOfName = function (drugOrderGroup, orderAttributeName) {
                var canBeUpdated = false;
                drugOrderGroup.drugOrders.forEach(function (drugOrder) {
                    var orderAttributeOfName = getAttribute(drugOrder, orderAttributeName);
                    if (!$scope.shouldBeDisabled(drugOrder, orderAttributeOfName)) {
                        canBeUpdated = true;
                    }
                });
                return canBeUpdated;
            };

            var getMinStopDate = function (drugOrder) {
                var calendarToday = DateUtil.today();
                var start = DateUtil.getDate(drugOrder.effectiveStartDate);
                return DateUtil.isBeforeDate(start, calendarToday) ? start : calendarToday;
            };

            var getStopDateLowerBound = function (drugOrder) {
                // When the stop date is constrained, a stop is a "now" action and must not be
                // back-dated before the real current date, even during retrospective entry
                // (where the order's start date is in the past).
                return limitStopDateToEffectiveEnd ? DateUtil.today() : getMinStopDate(drugOrder);
            };

            $scope.getMinDateForDiscontinue = function (drugOrder) {
                return DateUtil.getDateWithoutTime(getStopDateLowerBound(drugOrder));
            };

            $scope.getMaxDateForDiscontinue = function (drugOrder) {
                if (!limitStopDateToEffectiveEnd) {
                    return $scope.scheduledDate;
                }
                var minDate = getStopDateLowerBound(drugOrder);
                var maxDate = drugOrder.effectiveStopDate
                    ? DateUtil.getDate(drugOrder.effectiveStopDate)
                    : DateUtil.today();
                if (DateUtil.isBeforeDate(maxDate, minDate)) {
                    maxDate = minDate;
                }
                return DateUtil.getDateWithoutTime(maxDate);
            };

            var getAttribute = function (drugOrder, attributeName) {
                return _.find(drugOrder.orderAttributes, {name: attributeName});
            };

            init();
        }]);
