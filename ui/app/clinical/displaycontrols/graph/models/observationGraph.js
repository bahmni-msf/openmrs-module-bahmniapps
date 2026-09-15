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

    var parseToLocalDate = function (rawDateValue) {
        if (!rawDateValue) return null;
        if (rawDateValue instanceof Date) return rawDateValue;

        if (angular.isString(rawDateValue)) {
            var isoMatch = rawDateValue.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
            if (isoMatch) {
                var year = parseInt(isoMatch[1], 10);
                var month = parseInt(isoMatch[2], 10) - 1;
                var day = parseInt(isoMatch[3], 10);
                var hours = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
                var minutes = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
                var seconds = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
                return new Date(year, month, day, hours, minutes, seconds);
            }

            var ddmmyyyyMatch = rawDateValue.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
            if (ddmmyyyyMatch) {
                var day = parseInt(ddmmyyyyMatch[1], 10);
                var month = parseInt(ddmmyyyyMatch[2], 10) - 1;
                var year = parseInt(ddmmyyyyMatch[3], 10);
                var hours = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4], 10) : 0;
                var minutes = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5], 10) : 0;
                var seconds = ddmmyyyyMatch[6] ? parseInt(ddmmyyyyMatch[6], 10) : 0;
                return new Date(year, month, day, hours, minutes, seconds);
            }
        }

        if (Bahmni.Common && Bahmni.Common.Util && Bahmni.Common.Util.DateUtil) {
            var bDate = Bahmni.Common.Util.DateUtil.parseDatetime(rawDateValue);
            if (bDate && bDate.isValid && bDate.isValid()) {
                return bDate.toDate();
            }
        }
        var d = new Date(rawDateValue);
        return !isNaN(d.getTime()) ? d : null;
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

            // 1. Explicit default system observationDateTime ("observationDateTime")
            if (config.displayForObservationDateTime && config.displayForObservationDateTime() && config.xAxisConcept && config.xAxisConcept.toLowerCase() === 'observationdatetime') {
                config.type = "timeseries";
                xValue = parseToLocalDate(yAxisObs.observationDateTime);
            }
            // 2. Standard age ("age")
            else if (config.displayForAge && config.displayForAge()) {
                xValue = Bahmni.Common.Util.AgeUtil.differenceInMonths(person.birthdate, yAxisObs.observationDateTime);
            }
            // 3. Custom X-axis concept (e.g., "CS, Time recorded" or numeric indexed concepts)
            else {
                var matchingObservation = findMatchingXObs(yAxisObs, xAxisObservations);
                if (matchingObservation) {
                    var rawDateValue = extractRawDateValue(matchingObservation);

                    var isExplicitDate = !!matchingObservation.valueDatetime;
                    var isStringDate = rawDateValue && angular.isString(rawDateValue) && isNaN(Number(rawDateValue));

                    if (isExplicitDate || isStringDate) {
                        var parsedDate = parseToLocalDate(rawDateValue);
                        if (parsedDate) {
                            config.type = "timeseries";
                            xValue = parsedDate;
                        }
                    }

                    if (xValue === undefined) {
                        config.type = "indexed";
                        xValue = matchingObservation.value;
                    }
                }
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

