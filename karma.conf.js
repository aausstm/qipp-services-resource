;(function () {
  'use strict'

  module.exports = function (config) {
    config.set({
      autoWatch: false,
      basePath: '',
      browsers: ['PhantomJS'],
      colors: true,
      concurrency: Infinity,
      coverageReporter: {
        dir: 'report',
        subdir: '.',
        type: 'html'
      },
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
        'node_modules/qipp-services-uuid/qipp-services-uuid.js',
        'qipp-services-resource.js',
        'test/spec.js'
      ],
      frameworks: ['jasmine'],
      logLevel: config.LOG_INFO,
      plugins: [
        'karma-coverage',
        'karma-jasmine',
        'karma-phantomjs-launcher'
      ],
      port: 1337,
      preprocessors: {
        'qipp-services-resource.js': ['coverage']
      },
      reporters: [
        'coverage',
        'progress'
      ],
      singleRun: true
    })
  }
}())
