;(function () {
  'use strict'

  describe('qipp-services-resource', function () {
    var clientId = '123456789'
    var authHost = 'https://auth.qipp.com'
    var host = 'https://api.qipp.com'

    beforeEach(function () {
      module(
        'qipp-services-resource',
        // Add the auth service as it's injected through the relay service.
        'qipp-services-auth'
      )
    })

    beforeEach(function () {
      module(function ($provide) {
        $provide.constant('config', {
          urls: {
            'de_DE': {
              'localeUrl': '/localized/path'
            },
            'specialUrl': '/special/path',
            'paramUrl': '/path/with/:param'
          },
          templates: {
            'specialTemplate': '/special/template.html'
          },
          controllers: {
            'special': 'ExtraSpecialController'
          },
          routePrefix: '/',
          apiPrefix: 'api/v1/',
          templatePrefix: '/templates/',
          templateSuffix: '.html'
        })
      })

      module(function (
        $provide,
        apiResourceProvider,
        authProvider,
        authResourceProvider,
        helperProvider,
        ioProvider,
        resourceProvider,
        userProvider
      ) {
        // Configure the apiResource service.
        apiResourceProvider.defaults.host = host

        // Confdigure the auth service.
        authProvider.defaults.host = 'https://auth.qipp.com'
        authProvider.defaults.prefix = '/prefix/'
        authProvider.defaults.clientId = '123'

        // Configure the authResource service.
        authResourceProvider.defaults.host = authHost

        // Set the clientID of the resource service.
        resourceProvider.defaults.clientId = clientId

        // Configure the helper service.
        helperProvider.defaults.module = 'config'

        // Create a fake session service.
        $provide.factory('session', function () {
          return {
            // We only need this method.
            destroy: function () {
              return true
            }
          }
        })

        // Create a fake storage service.
        $provide.factory('fakeStorage', function () {
          var data = {}
          function get (item) {
            return data[item]
          }
          function set (item, value) {
            data[item] = value
          }
          function clear () {
            data = {}
          }
          return {
            get: get,
            set: set,
            clear: clear
          }
        })

        // Provide some user defaults.
        angular.extend(userProvider.defaults, { id: 123, locale: 'de_DE' })

        // Configure the io service.
        angular.extend(
          ioProvider.defaults,
          {
            provider: 'fakeStorage',
            getMethod: 'get',
            setMethod: 'set',
            clearMethod: 'clear'
          }
        )
      })
    })

    describe('resource', function () {
      var $httpBackend

      beforeEach(inject(function (_$httpBackend_) {
        $httpBackend = _$httpBackend_
      }))

      it('Should always provide a data object.', inject(
        function (resource) {
          expect(resource().data).toBeDefined()
        }
      ))

      it('Should provide default actions.', inject(
        function (resource) {
          var rs = resource()
          expect(rs.$get).toBeDefined()
          expect(rs.$create).toBeDefined()
          expect(rs.$update).toBeDefined()
          expect(rs.$replace).toBeDefined()
          expect(rs.$destroy).toBeDefined()
        }
      ))

      it('Should allow overriding prefix and suffix via defaults.', function () {
        inject(function (resource) {
          resource.defaults.prefix = 'prefix/'
          resource.defaults.suffix = '.json'
          var rs = resource('test')
          $httpBackend.expectGET('/prefix/test.json?clientID=' + clientId).respond(200)
          rs.$get()
          $httpBackend.flush()
        })
      })

      it('Should allow overriding actions via defaults.', function () {
        inject(function (resource) {
          resource.defaults.actions = {query: 'GET'}
          var rs = resource()
          expect(rs.$get).toBeUndefined()
          expect(rs.$query).toBeDefined()
        })
      })

      it('Should allow overriding params via defaults.', function () {
        inject(function (resource) {
          resource.defaults.params.get = {param: 123}
          var rs = resource('test')
          $httpBackend.expectGET('/test?param=123&clientID=' + clientId).respond(200)
          rs.$get()
          $httpBackend.flush()
        })
      })

      it('Should allow overriding headers via defaults.', inject(
        function (resource) {
          resource.defaults.headers.get = {'X-TEST': 'TEST'}
          var rs = resource('test')
          $httpBackend.expect('GET', '/test?clientID=' + clientId, undefined, function (headers) {
            return headers['X-TEST'] === 'TEST'
          }).respond(200)
          rs.$get()
          $httpBackend.flush()
        }
      ))

      it('Should allow overriding the handleRequest method via defaults.', inject(
        function (resource) {
          resource.defaults.handleRequest = function (resource, request) {
            request.data.test = 123
          }
          var rs = resource('test')
          $httpBackend.expectPOST('/test?clientID=' + clientId, {test: 123}).respond(201)
          rs.$create()
          $httpBackend.flush()
        }
      ))

      it('Should allow overriding the handleRequest method via defaults.', inject(
        function (resource) {
          resource.defaults.handleResponse = function (resource) {
            resource.data.test = 123
          }
          var rs = resource('test')
          $httpBackend.expectGET('/test?clientID=' + clientId).respond(200)
          rs.$get()
          $httpBackend.flush()
          expect(rs.data.test).toEqual(123)
        }
      ))

      it('Should expose the resource options object.', function () {
        inject(function (resource) {
          var rs = resource('test')
          rs.options.params.get = {param: 123}
          $httpBackend.expectGET('/test?param=123&clientID=' + clientId).respond(200)
          rs.$get()
          $httpBackend.flush()
        })
      })

      it('Should return a $http promise object when calling a resource action.', inject(
        function (resource) {
          var rs = resource('test')
          var promise
          $httpBackend.expectGET('/test?clientID=' + clientId).respond(200)
          promise = rs.$get()
          $httpBackend.flush()
          expect(promise.then).toBeDefined()
          expect(promise.success).toBeDefined()
          expect(promise.error).toBeDefined()
        }
      ))

      it('Should set the $http promise object as resource.$promise property.', inject(
        function (resource) {
          var rs = resource('test')
          var promise
          $httpBackend.expectGET('/test?clientID=' + clientId).respond(200)
          promise = rs.$get()
          $httpBackend.flush()
          expect(rs.$promise).toBe(promise)
        }
      ))

      it('Should set the response data as resource data.', inject(
        function (resource) {
          var rs = resource('test')
          $httpBackend.expectGET('/test?clientID=' + clientId).respond(200, {test: 123})
          rs.$get()
          $httpBackend.flush()
          expect(rs.data).toEqual({test: 123})
        }
      ))

      it('Should use the resource data as request data.', inject(
        function (resource) {
          var rs = resource('test')
          rs.data.test = 123
          $httpBackend.expectPOST('/test?clientID=' + clientId, {test: 123}).respond(201)
          rs.$create()
          $httpBackend.flush()
          expect(rs.state).toEqual('success')
        }
      ))

      it('Should convert resource params.', inject(
        function (resource) {
          var rs = resource('test', {params: {get: {id: '@data.id'}}})
          rs.data.id = 123
          $httpBackend.expectGET('/test?id=123&clientID=' + clientId).respond(200)
          rs.$get()
          $httpBackend.flush()
          expect(rs.data.id).toEqual(123)
        }
      ))

      it('Should use resource prefix and suffix for the url.', inject(
        function (resource) {
          var rs = resource('test', {prefix: 'api/', suffix: '.json'})
          $httpBackend.expectGET('/api/test.json?clientID=' + clientId).respond(200)
          rs.$get()
          $httpBackend.flush()
        }
      ))

      it('Should replace url params.', inject(
        function (resource) {
          var rs = resource('test/:id', {params: {get: {id: 123}}})
          $httpBackend.expectGET('/test/123?clientID=' + clientId).respond(200)
          rs.$get()
          $httpBackend.flush()
        }
      ))

      it('Should set the current resource action.', inject(
        function (resource) {
          var rs = resource('test')
          $httpBackend.expectDELETE('/test?clientID=' + clientId).respond(200)
          rs.$destroy()
          $httpBackend.flush()
          expect(rs.action).toEqual('destroy')
        }
      ))

      it('Should set the state to pending for running requests.', inject(
        function (resource) {
          var rs = resource('test')
          $httpBackend.expectPATCH('/test?clientID=' + clientId).respond(200)
          rs.$update()
          expect(rs.state).toEqual('pending')
          $httpBackend.flush()
        }
      ))

      it('Should set the state to success for successful requests.', inject(
        function (resource) {
          var rs = resource('test')
          $httpBackend.expectPATCH('/test?clientID=' + clientId).respond(200)
          rs.$update()
          expect(rs.state).toEqual('pending')
          $httpBackend.flush()
          expect(rs.state).toEqual('success')
        }
      ))

      it('Should set the state to error for failed requests.', inject(
        function (resource) {
          var rs = resource('test')
          $httpBackend.expectPATCH('/test?clientID=' + clientId).respond(400)
          rs.$update()
          expect(rs.state).toEqual('pending')
          $httpBackend.flush()
          expect(rs.state).toEqual('error')
        }
      ))

      it('Should allow passing additional resource actions as resource options.', inject(
        function (resource) {
          var rs = resource('test', {actions: {slurp: 'POST'}})
          expect(rs.$get).toBeDefined()
          expect(rs.$create).toBeDefined()
          expect(rs.$update).toBeDefined()
          expect(rs.$replace).toBeDefined()
          expect(rs.$destroy).toBeDefined()
          expect(rs.$slurp).toBeDefined()
          $httpBackend.expectPOST('/test?clientID=' + clientId).respond(200)
          rs.$slurp()
          $httpBackend.flush()
          expect(rs.state).toEqual('success')
        }
      ))

      it('Should allow passing additional params as resource options.', inject(
        function (resource) {
          var rs = resource('test', {params: {common: {'param': 123}}})
          $httpBackend.expectGET('/test?param=123&clientID=' + clientId).respond(200)
          rs.$get()
          $httpBackend.flush()
          $httpBackend.expectDELETE('/test?param=123&clientID=' + clientId).respond(200)
          rs.$destroy()
          $httpBackend.flush()
        }
      ))

      it('Should allow passing additional headers as resource options.', inject(
        function (resource) {
          var rs = resource('test', {headers: {get: {'X-TEST': 'TEST'}}})
          $httpBackend.expect('GET', '/test?clientID=' + clientId, undefined, function (headers) {
            return headers['X-TEST'] === 'TEST'
          }).respond(200)
          rs.$get()
          $httpBackend.flush()
        }
      ))

      it('Should allow overriding the handleRequest method.', inject(
        function (resource) {
          var rs = resource('test', {handleRequest: function (resource, request) {
            request.data.test = 123
          }})
          $httpBackend.expectPOST('/test?clientID=' + clientId, {test: 123}).respond(200)
          rs.$create()
          $httpBackend.flush()
        }
      ))

      it('Should allow overriding the handleResponse method.', inject(
        function (resource) {
          var rs = resource('test', {handleResponse: function (resource) {
            resource.test = 123
          }})
          expect(rs.test).toBeUndefined()
          $httpBackend.expectGET('/test?clientID=' + clientId).respond(200)
          rs.$get()
          $httpBackend.flush()
          expect(rs.test).toEqual(123)
        }
      ))

      it('Should allow extending any http option.', inject(
        function (resource) {
          var rs = resource('test', {params: {create: {value1: 888}}})
          rs.data.test1 = 999
          $httpBackend.expectPOST(
            '/test?value1=888&clientID=' + clientId + '&value2=456',
            {test1: 999, test2: 123}
          ).respond(200)
          rs.$create({data: {test2: 123}, params: {value2: 456}})
          $httpBackend.flush()
        }
      ))

      it('Should provide trigger, on and off methods on the resource object.', inject(
        function (resource) {
          var rs = resource()
          expect(rs.$emit).toBeDefined()
          expect(rs.$on).toBeDefined()
          expect(rs.$off).toBeDefined()
        }
      ))

      it('Should trigger subscribed callbacks for action events', inject(
        function (resource) {
          var triggered
          var rs =
                resource('test')
                .$on('getpending', function () { triggered = 'pending' })
                .$on('getsuccess', function () { triggered = 'success' })
                .$on('geterror', function () { triggered = 'error' })
          expect(triggered).toBeUndefined()
          $httpBackend.expectGET('/test?clientID=' + clientId).respond(200)
          rs.$get()
          expect(triggered).toEqual('pending')
          $httpBackend.flush()
          expect(triggered).toEqual('success')
          $httpBackend.expectGET('/test?clientID=' + clientId).respond(400)
          rs.$get()
          expect(triggered).toEqual('pending')
          $httpBackend.flush()
          expect(triggered).toEqual('error')
        }
      ))

      it('Should return the http options when calling action(opts, true).', inject(
        function (resource) {
          var rs = resource('test')
          var getOptions = rs.$get(null, true)
          expect(getOptions.method).toEqual('GET')
          expect(getOptions.url).toEqual('/test?clientID=' + clientId)
        }
      ))

      it('Should use the relay service to get a new access token after a 401.', inject(
        function (auth, resource, semaphore) {
          // Create a resource semaphore.
          semaphore.init('resource')
          var accessTokenRequest = [
            auth.defaults.host,
            auth.defaults.prefix,
            'access-token?client_id=',
            auth.defaults.clientId
          ].join('')
          $httpBackend.expectGET('/test?clientID=' + clientId).respond(401)
          $httpBackend.expectGET(accessTokenRequest).respond(200, { access_token: '123' })
          resource('test').$get()
          $httpBackend.expectGET('/test?clientID=' + clientId).respond(200, {})
          $httpBackend.flush()
        }
      ))

      it('Should use the relay service to get a new access token after a 0 - IE bug.', inject(
        function (auth, resource, semaphore) {
          // Create a resource semaphore.
          semaphore.init('resource')
          var accessTokenRequest = [
            auth.defaults.host,
            auth.defaults.prefix,
            'access-token?client_id=',
            auth.defaults.clientId
          ].join('')
          $httpBackend.expectGET('/test?clientID=' + clientId).respond(401)
          $httpBackend.expectGET(accessTokenRequest).respond(200, { access_token: '123' })
          resource('test').$get()
          $httpBackend.expectGET('/test?clientID=' + clientId).respond(200, {})
          $httpBackend.flush()
        }
      ))
    })

    describe('apiResource', function () {
      var $httpBackend
      var path = '/test?limit=10'

      beforeEach(inject(function (_$httpBackend_) {
        $httpBackend = _$httpBackend_
      }))

      it('Should set resource.user to the application user object.', inject(
        function (apiResource, user) {
          var rs = apiResource('test')
          expect(rs.user).toEqual(user)
        }
      ))

      it('Should use the api URL prefix.', inject(
        function (apiResource) {
          var rs = apiResource('test')
          $httpBackend.expectGET(host + path + '&clientID=' + clientId).respond(200)
          rs.$get()
          $httpBackend.flush()
        }
      ))

      it('Should unwrap the response data property.', inject(
        function (apiResource) {
          var rs = apiResource('test')
          var links = { first: {} }
          var indexes = {
            limit: undefined,
            items: 30,
            page: 1,
            pages: 3
          }
          $httpBackend.expectGET(host + path + '&clientID=' + clientId).respond(200, {
            _embedded: {
              items: {
                test: 123
              }
            },
            _links: links,
            page: 1,
            pages: 3,
            total: 30
          })
          rs.$get()
          $httpBackend.flush()
          expect(rs.data.test).toEqual(123)
          expect(rs.links).toEqual(links)
          expect(rs.enum).toEqual(indexes)
        }
      ))

      it('Should unwrap the response data property after a 401.', inject(
        function (auth, apiResource, semaphore) {
          // Create a resource semaphore.
          semaphore.init('resource')
          var accessTokenRequest = [
            auth.defaults.host,
            auth.defaults.prefix,
            'access-token?client_id=',
            auth.defaults.clientId
          ].join('')
          var rs = apiResource('test')
          var links = {
            first: {}
          }
          var indexes = {
            items: 30,
            limit: 10,
            page: 1,
            pages: 3
          }
          $httpBackend.expectGET(host + '/test?limit=10&clientID=' + clientId).respond(401)
          $httpBackend.expectGET(accessTokenRequest).respond(200, { access_token: '123' })
          rs.$get()
          $httpBackend.expectGET(host + '/test?limit=10&clientID=' + clientId).respond(200, {
            _embedded: {
              items: {
                test: 123
              }
            },
            _links: links,
            limit: 10,
            page: 1,
            pages: 3,
            total: 30
          })
          $httpBackend.flush()
          expect(rs.data.test).toEqual(123)
          expect(rs.links).toEqual(links)
          expect(rs.enum).toEqual(indexes)
        }
      ))

      it('Should reset the prefix if an API version is already provided in the url.', inject(
        function (apiResource) {
          var url = '/api/v1337/test'
          var rs = apiResource(url)
          $httpBackend.expectGET(host + url + '?limit=10' + '&clientID=' + clientId).respond(200)
          rs.$get()
          $httpBackend.flush()
        }
      ))

      it('Should unwrap the response errors property.', inject(
        function (apiResource) {
          var rs = apiResource('test')
          $httpBackend.expectGET(host + path + '&clientID=' + clientId).respond(400, {
            errors: {
              test: ['invalid']
            }
          })
          rs.$get()
          $httpBackend.flush()
          expect(rs.errors).toBeDefined()
          expect(rs.errors.test).toBeDefined()
          expect(rs.errors.test[0]).toEqual('invalid')
        }
      ))

      it('Should use the HTTP status on error if no errors are returned.', inject(
        function (apiResource) {
          var rs = apiResource('test')
          $httpBackend.expectGET(host + path + '&clientID=' + clientId).respond(400)
          rs.$get()
          $httpBackend.flush()
          expect(rs.errors).toBeDefined()
          expect(rs.errors.status).toBeDefined()
          expect(rs.errors.status[0]).toEqual(400)
        }
      ))

      it('Should unset the errors object on success.', inject(
        function (apiResource) {
          var rs = apiResource('test')
          rs.errors = {test: ['invalid']}
          $httpBackend.expectGET(host + path + '&clientID=' + clientId).respond(200)
          rs.$get()
          $httpBackend.flush()
          expect(rs.errors).toBeUndefined()
        }
      ))

      it('Should only send parameters defined as form fields.', inject(
        function (apiResource) {
          var rs = apiResource('test')
          $httpBackend.expectPOST(
            host + path + '&clientID=' + clientId,
            {
              test: 123,
              test3: {
                key: 'value'
              }
            }).respond(200)
          rs.data.test = 123
          rs.data.test2 = 456
          rs.data.test3 = { key: 'value' }
          rs.data.test4 = { key: 'value' }
          rs.form = {test: true, 'test3.key': true}
          rs.$create()
          $httpBackend.flush()
        }
      ))
    })

    describe('authResource', function () {
      var $httpBackend

      beforeEach(inject(function (_$httpBackend_) {
        $httpBackend = _$httpBackend_
      }))

      it('Should provide an authResource provider.', inject(
        function (authResource) {
          expect(authResource).toBeDefined()
        }
      ))

      it('Should provide an authResource provider on top of the apiResource one.', inject(
        function (authResource) {
          var rs = authResource('test')
          $httpBackend.expectGET(authHost + '/test?clientID=' + clientId).respond(200, {
            _embedded: {
              items: {
                test: 123
              }
            }
          })
          rs.$get()
          $httpBackend.flush()
          expect(rs.data._embedded.items.test).toEqual(123)
        }
      ))
    })
  })
}())
