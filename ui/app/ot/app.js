'use strict';

angular.module('ot', ['bahmni.common.patient', 'bahmni.common.patientSearch', 'bahmni.common.uiHelper', 'bahmni.common.conceptSet', 'authentication', 'bahmni.common.appFramework',
    'httpErrorInterceptor', 'bahmni.common.domain', 'bahmni.ot', 'bahmni.common.config', 'ui.router', 'bahmni.common.util', 'bahmni.common.routeErrorHandler', 'bahmni.common.i18n',
    'bahmni.common.displaycontrol.dashboard', 'bahmni.common.displaycontrol.observation', 'bahmni.common.displaycontrol.disposition', 'bahmni.common.displaycontrol.admissiondetails', 'bahmni.common.displaycontrol.custom',
    'bahmni.common.obs', 'bahmni.common.displaycontrol.patientprofile', 'bahmni.common.displaycontrol.diagnosis', 'RecursionHelper', 'ngSanitize', 'bahmni.common.uiHelper', 'bahmni.common.displaycontrol.navigationlinks', 'pascalprecht.translate',
    'bahmni.common.displaycontrol.dashboard', 'ngCookies', 'ngDialog', 'angularFileUpload', 'bahmni.common.offline']);
angular.module('ot').config(['$stateProvider', '$httpProvider', '$urlRouterProvider', '$bahmniTranslateProvider', '$compileProvider',
    function ($stateProvider, $httpProvider, $urlRouterProvider, $bahmniTranslateProvider, $compileProvider) {
        $urlRouterProvider.otherwise('/home');

        // @if DEBUG='production'
        $compileProvider.debugInfoEnabled(false);
        // @endif

        // @if DEBUG='development'
        $compileProvider.debugInfoEnabled(true);
        // @endif

        $stateProvider
            .state('home', {
                url: '/home',
                views: {
                    'content': {
                        templateUrl: 'views/home.html',
                        controller: function ($scope) {
                            console.log("yayyy");
                        }
                    },
                    'additional-header': {
                        templateUrl: ' views/header.html',
                        controller: 'HeaderController'
                    }
                },
                resolve: {
                    initialization:"initialization"
                }
            });

        $bahmniTranslateProvider.init({app: 'ot', shouldMerge: true});
    }]);