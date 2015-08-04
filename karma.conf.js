/* global module */

(function () {
    'use strict';

    module.exports = function(config) {
        config.set({
            basePath: '',
            frameworks: ['jasmine'],
            files: [
                'node_modules/angular/angular.js',
                'node_modules/angular-mocks/angular-mocks.js',
                'node_modules/qipp-services-auth/qipp-services-auth.js',
                'node_modules/qipp-services-helper/qipp-services-helper.js',
                'node_modules/qipp-services-io/qipp-services-io.js',
                'node_modules/qipp-services-locale/qipp-services-locale.js',
                'node_modules/qipp-services-pubsub/qipp-services-pubsub.js',
                'node_modules/qipp-services-relay/qipp-services-relay.js',
                'node_modules/qipp-services-semaphore/qipp-services-semaphore.js',
                'node_modules/qipp-services-user/qipp-services-user.js',
                'node_modules/qipp-services-utils/qipp-services-utils.js',
                'qipp-services-resource.js',
                'test/spec.js'
            ],
            exclude: [],
            plugins: [
                'karma-chrome-launcher',
                'karma-coverage',
                'karma-firefox-launcher',
                'karma-jasmine'
            ],
            preprocessors: {
                'qipp-services-resource.js': ['coverage']
            },
            reporters: [
                'coverage',
                'dots'
            ],
            coverageReporter: {
                type: 'html',
                dir: 'coverage'
            },
            port: 1337,
            colors: true,
            logLevel: config.LOG_INFO,
            autoWatch: false,
            browsers: [
                'Chrome',
                'Firefox'
            ],
            singleRun: true
        });
    };

}());
