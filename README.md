# qipp-services-resource [![Build Status](https://travis-ci.org/qipp/qipp-services-resource.svg?branch=master)](https://travis-ci.org/qipp/qipp-services-resource) [![npm version](https://img.shields.io/npm/v/qipp-services-resource.svg?style=flat)](https://www.npmjs.com/package/qipp-services-resource)

## General

> The resource module is composed of one core resource provider, and two
> top-level providers in order to interact with the API and the auth servers.

## Install

```bash
npm i qipp-services-resource
```

## Angular usage

### resource provider

This provider should not be used directly as it is the underlaying backbone of
the apiResource and the authResource. It is based upon the $http method, which
is a promise.

Please note that this provider directly takes care of the authorization with the
API server, by providing an access token in the headers.

Moreover, the renewal of this access token is made internally, in case of requests
giving a 401 (expired or invalid access token). That means that a failing request
is made again in that case.

The pubsub service is attached on the resource, allowing the use of event listeners
(see apiResource).

### apiResource provider

Use this provider to make any API request. Some default parameters must be set in
the config phase of your angular application:

```javascript
// Mandatory property.
apiResourceProvider.defaults.host = 'https://core.qipp.com'
// Prefix and itemsPerPage have both default values.
apiResourceProvider.defaults.prefix = '/'
apiResourceProvider.defaults.itemsPerPage = 10
```

Note that the itemsPerPage property is used for the page size of the API response,
in the case of collections.

#### Requests

##### General

The first argument of the **apiResource()** method must be the API endpoint you are requesting.

You can provide parameters to requests as properties of *params.common*, a second argument
of the apiResource method:

```javascript
$scope.thingId = 123
$scope.resource = apiResource('things/:id', {
    params: {common: {id: thingId}}
})
```

##### Filtering

Some API endpoints accept filtering properties, please refer to the [API documentation](http://docs.qippcore.apiary.io):

```javascript
$scope.thingId = 123
$scope.resource = apiResource('things/:id/files', {
    params: {
        common: {
            id: thingId,
            'filter[category]': 'manual'
        }
    }
})
```

The filtering property could also be an array:

```javascript
$scope.thingId = 123
$scope.resource = apiResource('things/:id/files', {
    params: {
        common: {
            id: thingId
            'filter[category][0]': 'manual',
            'filter[category][1]': 'technical-data'
        }
    }
})
```

##### Disabling the limit

You can get raw collections, overpassing the limit setting this parameter to minus one:

```javascript
$scope.userId = 123
$scope.resource = apiResource('users/:id/things', {
    params: {
        common: {
            id: userId,
            'limit': -1
        }
    }
})
```

#### Responses

##### Paging

For collections, you get back the all the paging information as the *enum* property
in the resource:

```javascript
$scope.userId = 123
$scope.resource = apiResource('users/:id/things', {
    params: {common: {id: userId}}
})
$scope.resource
    .$get()
    .then(function () {
        console.log($scope.resource.enum)
        /*
        Enum is an object:
        {
            items: 6, // here we have a total of 6 items for this collection.
            limit: 5, // the limit has been set to 5 items per page.
            page: 1,  // we are on page one.
            pages: 2  // two pages are available.
        }
        */
    })
```

You can also get it in the direct response from the backend:

```javascript
$scope.resource
    .$get()
    .then(function (response) {
        console.log(response)
        /*
        The raw response is an object:
        {
            _embedded: {...}, // here are the embedded items of the collection.
            _links: {...},    // see the links section.
            limit: 5,
            page: 1,
            pages: 2,
            total: 6
        }
        */
    })
```

##### Links

For every request, the API response includes a **links** section (could be **_links**
or **links**, depending if you ar looking at the resource or the response).

Using the last request, you get **links** as an object:

```javascript
{
    first: { href: '/api/v1/users/123/things?page=1&limit=5' },
    last: { href: '/api/v1/users/123/things?page=2&limit=5' },
    next: { href: '/api/v1/users/123/things?page=2&limit=5' },
    self: { href: '/api/v1/users/123/things?page=1&limit=5' }
}
```

You can notice that the **links** make the API crawable, in this case with a clear focus
on the paging of the given collection. But the **links** could also be a way to get other
endpoints:

```javascript
$scope.userId = 123
$scope.resource = apiResource('users/:id', {
    params: {common: {id: userId}}
})
$scope.resource
    .$get()
    .then(function (response) {
        console.log(response._links)
        /*
        {
            collections: {
                href: '/api/v1/users/123/collections'
            },
            self: {
                href: '/api/v1/users/123'
            },
            things: {
                href: '/api/v1/users/123/things'
            }
        }
        */
    })
```

##### Promise callbacks

The **apiResource()** method is a promise, as the $http one, with **.success** and
**.error** callbacks:

```javascript
$scope.thingId = 123
$scope.resource = apiResource('things/:id', {
    params: {common: {id: thingId}}
})
$scope.resource
    .$get()
    .success(function () {
        // Do something.
    })
    .error(function () {
        // Do something else.
    })
```

##### CRUD methods

To interact with the API endpoints, the **apiResource()** could be queried with the
following REST methods:

```javascript
// GET
$scope.resource.$get()
// POST
$scope.resource.$create()
// PATCH
$scope.resource.$update()
// DELETE
$scope.resource.$destroy()
```

##### Using the event listeners (with pubsub)

You can attach listeners to you resource, matching the CRUD method names plus
the **error** or **success** word, for example:

```javascript
// Create success listener.
$scope.resource
    .$on('createsuccess', callback)
// Delete error listener.
$scope.resource
    .$on('deleteerror', callback)
```

Please refer to the **qipp-services-pubsub** documentation for further explanation.

### authResource provider

Use this provider to make any auth request, such as login or register.
Some default parameters must be set in the config phase of your angular application:

```javascript
// Mandatory property.
authResourceProvider.defaults.host = 'https://auth.qipp.com'
// Prefix has a default value.
authResourceProvider.defaults.prefix = '/'
// Set the auth client id in the authResource.
authResourceProvider.defaults.clientId = 'YOUR_CLIENT_ID'
```
Note that the **authResource()** method is based upon the **apiResource()** one, which
means that the documentation of the latter apply to the former.

## Tools

### Linting with StandardJS

Please refer to the [JavaScript Standard Style](http://standardjs.com/) for general rules.

```bash
npm run lint
```

### Unit testing with Karma

```bash
npm test
```

## Requirements

### Angular

* [angular](https://angularjs.org/) 1.4.3

### Qipp modules

* [qipp-services-helper](https://github.com/qipp/qipp-services-helper)
* [qipp-services-io](https://github.com/qipp/qipp-services-io)
* [qipp-services-pubsub](https://github.com/qipp/qipp-services-pubsub)
* [qipp-services-relay](https://github.com/qipp/qipp-services-relay)
* [qipp-services-user](https://github.com/qipp/qipp-services-user)

## Licence

Released under the [MIT license](https://opensource.org/licenses/MIT) by [qipp](https://www.qipp.com/).
