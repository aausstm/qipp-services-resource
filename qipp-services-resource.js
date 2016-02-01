;(function () {
  'use strict'

  angular
    .module('qipp-services-resource', [
      'qipp-services-helper',
      'qipp-services-io',
      'qipp-services-pubsub',
      'qipp-services-relay',
      'qipp-services-user'
    ])

    .provider('resource', function () {
      var $config = {
        // Set clientID, see qipp-services-auth.
        clientId: undefined,
        host: '',
        prefix: '',
        suffix: '',
        actions: {
          get: 'GET',
          create: 'POST',
          update: 'PATCH',
          replace: 'PUT',
          destroy: 'DELETE'
        },
        params: {},
        headers: {},
        handleRequest: angular.noop,
        handleResponse: function (resource, response) {
          resource.$setData(response.data)
        }
      }
      this.defaults = $config
      this.$get = [
        '$http',
        '$parse',
        '$q',
        'helper',
        'io',
        'pubsub',
        'relay',
        function (
          $http,
          $parse,
          $q,
          helper,
          io,
          pubsub,
          relay
        ) {
          var convertResourceParams = function (params, resource) {
            // This method replaces parameter values starting with an "@" with
            // their respective resource properties: params: {id: '@id', name: '@name'}.
            angular.forEach(params, function (value, key) {
              if (value && value.charAt && value.charAt(0) === '@') {
                params[key] = $parse(value.substr(1))(resource)
              }
            })
          }
          var Resource = function (url, options) {
            var self = this
            var deferred = $q.defer()
            deferred.resolve()
            this.$promise = deferred.promise
            pubsub(this)
            this.data = (options && options.data) || {}
            this.options = helper.deepExtend(
              { url: url },
              $config,
              options
            )
            // Grab the access token from the io service.
            this.accessToken = io.get('accessToken')
            angular.forEach(this.options.actions, function (method, action) {
              self['$' + action] = function (opts, returnOpts) {
                return self.$request(action, opts, returnOpts)
              }
            })
          }
          var resourceFactory
          Resource.prototype.$getData = function () {
            return this.data
          }
          Resource.prototype.$setData = function (data) {
            if (data) this.data = data
          }
          Resource.prototype.$getAccessToken = function () {
            return this.accessToken
          }
          Resource.prototype.$request = function (action, opts, returnOpts) {
            var self = this
            var requestDeferred = $q.defer()
            var eventEmitter = function () {
              self.$emit(self.action + self.state, arguments)
            }
            var settings = this.options
            var params = angular.extend({}, settings.params.common, settings.params[action])
            // Any non public request to the API needs the bearer to be in the authorization header.
            var oauthTokenHeaders = {
              Authorization: 'Bearer ' + this.$getAccessToken()
            }
            var headers = angular.extend({}, settings.headers.common, settings.headers[action])
            var options
            var promise = requestDeferred.promise
            // Check if the access token is available.
            if (this.$getAccessToken()) {
              // Add bearer.
              angular.extend(headers, oauthTokenHeaders)
            } else {
              // Add the clientID property in the params.
              params.clientID = $config.clientId
            }
            options = helper.deepExtend({
              method: settings.actions[action],
              data: angular.extend({}, this.$getData()),
              params: params,
              headers: headers,
              withCredentials: settings.withCredentials
            }, opts)
            options.method = angular.uppercase(options.method)
            // Only send body data for POST/PUT/PATCH requests.
            if (options.method === 'DELETE') {
              // If data is undefined, angular strips the Content-Type header
              // and some browsers send DELETE requests by default as
              // "application/xml", so we simply set it to an empty string.
              options.data = ''
            } else if (
              options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'PATCH'
            ) {
              delete options.data
            }
            convertResourceParams(options.params, this)
            options.url = helper.url(
              settings.host + settings.prefix + settings.url + settings.suffix,
              options.params
            )
            delete options.params
            // If the returnOpts argument is true, simply return the options object.
            if (returnOpts) return options
            this.action = action
            this.state = 'pending'
            settings.handleRequest(self, options)
            eventEmitter(options)
            // Create success and error states, same as the http method.
            promise.success = function (cb) {
              promise.then(cb)
              return promise
            }
            promise.error = function (cb) {
              promise.then(null, cb)
              return promise
            }
            this.$promise = promise
            $http(options).then(
              function (response) {
                self.state = 'success'
                settings.handleResponse(self, response)
                requestDeferred.resolve(response.data)
              },
              function (response) {
                // Shortcut method.
                function handle () {
                  settings.handleResponse(self, response)
                }
                // Look after an unauthorized authentication, i.e. the access
                // token is expired or invalid. Also handle IE10 bug that
                // maps 401 to status code 0:
                // https://connect.microsoft.com/IE/feedback/details/785990/ie-10-on-win8-does-not-assign-the-correct-status-to-xmlhttprequest-when-the-result-is-401
                if (response.status === 401 || response.status === 0) {
                  // Use auth through the relay service in order to avoid a circular
                  // dependency as auth is already using authResource.
                  relay.exec([
                    'auth',
                    function (service) {
                      // Provide the request and the response as arguments.
                      service.getNewAccessToken(self, response).then(
                        function (data) {
                          response = data
                          self.state = 'success'
                          handle()
                          requestDeferred.resolve(data)
                        },
                        function (data) {
                          self.state = 'error'
                          handle()
                          requestDeferred.reject(data)
                        }
                      )
                    }
                  ])
                } else {
                  self.state = 'error'
                  handle()
                  requestDeferred.reject(response.data)
                }
              }
            )
            return promise.success(eventEmitter).error(eventEmitter)
          }
          resourceFactory = function (url, options) {
            return new Resource(url, options)
          }
          resourceFactory.defaults = $config
          return resourceFactory
        }
      ]
    })

    .provider('apiResource', function () {
      var $config = {
        host: undefined,
        prefix: '/',
        // Set the number of items to be displayed per page.
        itemsPerPage: 10
      }
      this.defaults = $config
      this.$get = [
        'resource',
        'helper',
        'user',
        function (
          resource,
          helper,
          user
        ) {
          return function (url, options, ignorePaging) {
            var rs
            var regex = {
              // Match '/api/v[0-∞]'
              api: /^\/api\/v\d+\//,
              // Match 'limit=[0-∞]'
              limit: /limit=\d+/
            }
            var prefix = $config.prefix
            // The ignorePaging boolean is used by the authResource in order to bypass
            // the paging parameter. We also don't want to add another limit parameter.
            if (!ignorePaging && !url.match(regex.limit)) {
              options = helper.deepExtend({
                params: { common: { limit: $config.itemsPerPage } }
              }, options)
            }
            // Remove the api prefix if one is already provided in the url. This could
            // be the case with the paging service, with the links coming from the API,
            // or if reaching a different API version is required.
            if (url.match(regex.api)) prefix = ''
            rs = resource(url, helper.deepExtend({
              host: $config.host,
              prefix: prefix,
              handleRequest: function (resource, request) {
                if (resource.form) {
                  // Only send parameters that are defined as input fields of the
                  // form tied to the resource.
                  angular.forEach(request.data, function (value, key) {
                    var prop
                    if (angular.isObject(value)) {
                      // Check nested fields, which are stored in flat form in
                      // the resource.form object.
                      for (prop in value) {
                        var isDefined = angular.isDefined(resource.form[key + '.' + prop])
                        if (value.hasOwnProperty(prop) && isDefined) return
                      }
                    }
                    if (angular.isUndefined(resource.form[key])) delete request.data[key]
                  })
                }
              },
              handleResponse: function (resource, response) {
                // Either this method is called after a 401, or directly from
                // the resource. As a consequence, the response data could be
                // injected differently. Also, after a 204 (e.g. DELETE), no
                // content is provided, thus response.data is set to be an empty
                // string.
                var data
                if (response.data) data = response.data
                if (response.id || response._embedded) data = response
                // Only process if data is set.
                if (data) {
                  // Populate the resource with the data directly
                  // or either with the embedded items (collection).
                  resource.data = data.hasOwnProperty('total') ? data._embedded.items : data
                  // Store the links for further use.
                  resource.links = data._links
                  // Push the indexes as an enum property for paging.
                  // These indexes will be populated only for collections.
                  resource.enum = {
                    items: data.total,
                    limit: data.limit,
                    page: data.page,
                    pages: data.pages
                  }
                }
                resource.errors = response.data && response.data.errors
                if (!resource.errors && resource.state === 'error') {
                  resource.errors = {status: [response.status]}
                }
              }
            }, options))
            // Push the user inside the resource.
            rs.user = user
            return rs
          }
        }]
    })

    .provider('authResource', function () {
      var $config = {
        host: undefined,
        prefix: '/'
      }
      this.defaults = $config
      this.$get = [
        'apiResource',
        function (
          apiResource
        ) {
          return function (url, options) {
            return apiResource(
              url,
              angular.merge({
                host: $config.host,
                prefix: $config.prefix,
                withCredentials: true,
                params: { common: { clientID: $config.clientId } }
              }, options),
              true // Set to ignore paging.
            )
          }
        }
      ]
    })
}())
