'use strict';

angular.module('bahmni.common.uiHelper')
    .service('confirmBox', ['$rootScope', 'ngDialog', function ($rootScope, ngDialog) {
        var dialog;
        var confirmBox = function (config) {
            var confirmBoxScope = $rootScope.$new();
            confirmBoxScope.close = function () {
                ngDialog.close(dialog.id);
                confirmBoxScope.$destroy();
            };
            confirmBoxScope.scope = config.scope;
            confirmBoxScope.isRecurringAppointment = config.scope.yes_all !== undefined && config.scope.yes_all !== '';
            confirmBoxScope.actions = config.actions;
            dialog = ngDialog.open({
                template: '../common/ui-helper/views/confirmBox.html',
                scope: confirmBoxScope,
                className: config.className || 'ngdialog-theme-default'
            });
        };
        return confirmBox;
    }]);
