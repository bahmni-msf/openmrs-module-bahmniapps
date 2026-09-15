'use strict';

(function () {
    Bahmni = Bahmni || {};
    Bahmni.Clinical = Bahmni.Clinical || {};
    Bahmni.Clinical.ObservationGraph = function (model) {
        angular.extend(this, model);
    };

    var fixCaseMismatchIssues = function (config, observations) {
        var conceptNamesFromConfig = config.yAxisConcepts.slice(0);
        conceptNamesFromConfig.push(config.xAxisConcept);
        _.each(observations, function (obs) {
            if (obs && obs.concept && obs.concept.name) {
                var matchedName = _.find(conceptNamesFromConfig, function (configConceptName) {
                    return configConceptName && configConceptName.toLowerCase().trim() === obs.concept.name.toLowerCase().trim();
                });
                if (matchedName) {
                    obs.concept.name = matchedName;
                }
            }
        });
    };

    var createObservationPoint = function (config, obs, xAxisValues) {
        var observation = {};
        observation[config.xAxisConcept] = xAxisValues;
        observation[obs.concept.name] = obs.value;
        return observation;
    };

    var findMatchingLine = function (lines, obs) {
        return _(lines).find(function (line) {
            return line.name === obs.concept.name;
        });
    };

    var getEncounterUuid = function (obs) {
        if (!obs) return null;
        return obs.encounterUuid || (obs.encounter && obs.encounter.uuid) || obs.encounterId || null;
    };

    var getGroupUuid = function (obs) {
        if (!obs) return null;
        return obs.obsGroupUuid || (obs.parentObs && obs.parentObs.uuid) || obs.groupId || null;
    };

    var extractRawDateValue = function (obs) {
        if (!obs) return null;
        if (obs.valueDatetime) return obs.valueDatetime;
        if (obs.value) {
            if (typeof obs.value === 'object') {
                return obs.value.value || obs.value.display || obs.value.name || null;
            }
            return obs.value;
        }
        return null;
    };

    var findMatchingXObs = function (yObs, xObsList) {
        if (!xObsList || xObsList.length === 0) return null;

        var yGroup = getGroupUuid(yObs);
        if (yGroup) {
            var groupMatch = _.find(xObsList, function (x) {
                return getGroupUuid(x) === yGroup;
            });
            if (groupMatch) return groupMatch;
        }

        var yEnc = getEncounterUuid(yObs);
        if (yEnc) {
            var encMatches = _.filter(xObsList, function (x) {
                return getEncounterUuid(x) === yEnc;
            });
            if (encMatches.length === 1) return encMatches[0];
            if (encMatches.length > 1) {
                var yTime = yObs.observationDateTime ? new Date(yObs.observationDateTime).getTime() : 0;
                return _.minBy(encMatches, function (x) {
                    var xTime = x.observationDateTime ? new Date(x.observationDateTime).getTime() : 0;
                    return Math.abs(yTime - xTime);
                });
            }
        }

        if (yObs.observationDateTime) {
            var yTime = new Date(yObs.observationDateTime).getTime();
            return _.minBy(xObsList, function (x) {
                var xTime = x.observationDateTime ? new Date(x.observationDateTime).getTime() : 0;
                return Math.abs(yTime - xTime);
            });
        }

        return xObsList[0];
    };

    Bahmni.Clinical.ObservationGraph.create = function (allObservations, person, config, referenceLines) {
        fixCaseMismatchIssues(config, allObservations);

        var yAxisObservations = _.filter(allObservations, function (obs) {
            return obs.concept && obs.concept.name !== config.xAxisConcept;
        });

        var xAxisObservations = _.filter(allObservations, function (obs) {
            return obs.concept && obs.concept.name === config.xAxisConcept;
        });

        var lines = _(yAxisObservations).uniqBy(function (item) {
            return item.concept.name + item.concept.units;
        }).map(function (item) {
            return new Bahmni.Clinical.ObservationGraphLine({
                name: item.concept.name,
                units: item.concept.units,
                values: []
            });
        }).value();

        _.forEach(yAxisObservations, function (yAxisObs) {
            var xValue;
            var matchingObservation = findMatchingXObs(yAxisObs, xAxisObservations);

            if (matchingObservation) {
                var rawDateValue = extractRawDateValue(matchingObservation);

                if (rawDateValue) {
                    var parsedDate = null;
                    if (Bahmni.Common && Bahmni.Common.Util && Bahmni.Common.Util.DateUtil) {
                        var bDate = Bahmni.Common.Util.DateUtil.parseDatetime(rawDateValue);
                        if (bDate && bDate.isValid && bDate.isValid()) {
                            parsedDate = bDate.toDate();
                        }
                    }
                    if (!parsedDate) {
                        var d = new Date(rawDateValue);
                        if (!isNaN(d.getTime())) {
                            parsedDate = d;
                        }
                    }

                    if (parsedDate) {
                        config.type = "timeseries";
                        config.displayForObservationDateTime = function () { return true; };
                        xValue = parsedDate;
                    }
                }
            }

            if (!xValue && yAxisObs.observationDateTime) {
                config.type = "timeseries";
                config.displayForObservationDateTime = function () { return true; };
                xValue = Bahmni.Common.Util.DateUtil.parseDatetime(yAxisObs.observationDateTime).toDate();
            }

            if (xValue !== undefined) {
                var line = findMatchingLine(lines, yAxisObs);
                var observationPoint = createObservationPoint(config, yAxisObs, xValue);
                line.addPoint(observationPoint);
            }
        });

        if (referenceLines !== undefined) {
            lines = lines.concat(referenceLines);
            var referenceLinesYAxisConcepts = _.map(referenceLines, 'name');
            config.yAxisConcepts = config.yAxisConcepts.concat(referenceLinesYAxisConcepts);
        }

        return new Bahmni.Clinical.ObservationGraph(lines);
    };
})();

