angular.module('ngOpenBadge.services')

.factory('OBSBackend', function($http, $q, OBSThisHub, OBPrivate, OBSMyProject) {
    var BackendInterface = {}
    var baseURL = OBPrivate.BASE_URL;
    var projectURL = baseURL + OBSThisHub.key + "/"

    var LOGGING = true

    BackendInterface.longTermRefresh = function() {
        var defer = $q.defer()
        $http.get(baseURL + 'projects').then(
            function got_projects( response )
            {
                if (LOGGING) console.log("got long term data:", response)
                OBSThisHub.create(response.data.hub)
                OBSMyProject.create(response.data.project)
                defer.resolve()
            },
            function error_projects(response) {
                if (LOGGING) console.log("Ahh! Error getting long term data")
                if (response.status == 404) {
                    if (LOGGING) console.log("hub-uuid not found on server")
                    defer.reject('not found')
                } else {
                    console.log(response)
                    defer.reject('unknoen error')
                }

            }
        )
        return defer.promise
    }

    BackendInterface.configureHub = function(name, projectKey) {
      var defer = $q.defer()
      $http({
        url:baseURL + '0/hubs',
        method:"PUT",
        headers:{
          'X-HUB-NAME':name,
          'X-PROJECT-KEY':projectKey.toUpperCase()
        }
      }).then(
          function put_hub( response )
          {
              if (LOGGING) console.log("put hub data:", response)
              defer.resolve()
          },
          function error_projects(response) {
              if (LOGGING) console.log("Ahh! Error putting data", response)
              defer.reject(response.status)

          }
      )
      return defer.promise
    }

    BackendInterface.initMeeting = function(data) {
      return $http.put(projectURL + "hubs", {
        data:{meeting_init_data:data}
      })
    }

    return BackendInterface

})