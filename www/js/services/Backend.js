/*
Here we wrap all HTTP requests, and provide some light data formatting and
  send the data off to be sed by the various OpenBadgeServices
*/

angular.module('ngOpenBadge.services')

.factory('OBSBackend', function($http, $q, OBSThisHub, OBPrivate, OBSMyProject, OBSStorage) {
  var BackendInterface = {};
  var baseURL = function() {
    return OBPrivate.BASE_URL;
  };

  var LOGGING = true;

  BackendInterface.longTermRefresh = function() {
    // Perform a full refresh of all data, both hub and project. Should be
    //  called perhaps once per session. Needs to be called whenever a hub
    //  changes project.

    var defer = $q.defer();

    $http.get(baseURL() + 'projects').then(
      function got_projects(response) {
        if (LOGGING) console.log("got project data:", response);

        OBSMyProject.create(response.data.project);

        OBSStorage.cacheProject(response.data.project);
        OBSStorage.cacheMemberUpdate(new Date() / 1000.0);

        defer.resolve();
      },
      function error_projects(response) {
        if (LOGGING) console.log("Ahh! Error getting long term data", response);

        var cachedProject = OBSStorage.retrieveProject();
        if (cachedProject) {
          if (LOGGING) console.log("attempting to fill project data from cache", cachedProject);
          OBSMyProject.create(cachedProject);
          defer.resolve();
        } else {
          defer.reject();
        }
      }
    );
    return defer.promise;
  };

  BackendInterface.shortTermRefresh = function() {
    // perform a partial refresh of just hub data, (SU status, new members)
    var defer = $q.defer();

    var lastMemberUpdate = OBSStorage.retrieveMemberUpdate();
    if (!lastMemberUpdate) lastMemberUpdate = 0;

    $http.get(baseURL() + OBSMyProject.key + '/hubs', {
      headers: {
        'X-LAST-UPDATE': lastMemberUpdate
      }
    }).then(
      function got_projects(response) {
        if (LOGGING) console.log("got hub data:", response);
        OBSThisHub.create(response.data);

        OBSStorage.cacheHub(response.data);
        OBSStorage.cacheMemberUpdate(new Date() / 1000.0);

        defer.resolve();
      },
      function error_projects(response) {
        if (LOGGING) console.log("Ahh! Error getting hub data", response);

        var cachedHub = OBSStorage.retrieveHub();
        if (cachedHub) {
          if (LOGGING) console.log("attempting to fill hub data from cache", cachedHub);
          OBSThisHub.create(cachedHub);
        }

        defer.reject();
      }
    );
    return defer.promise;
  };

  BackendInterface.configureHub = function(name, projectKey) {
    var defer = $q.defer();
    $http({
      url: baseURL() + '0/hubs',
      method: "PUT",
      headers: {
        'X-HUB-NAME': name,
        'X-PROJECT-KEY': projectKey.toUpperCase()
      }
    }).then(
      function put_hub(response) {
        if (LOGGING) console.log("put hub data:", response);
        defer.resolve();
      },
      function error_projects(response) {
        if (LOGGING) console.log("Ahh! Error putting data", response);
        defer.reject(response.status);

      }
    );
    return defer.promise;
  };

  BackendInterface.initMeeting = function(data) {

    return $http.put(baseURL() + OBSMyProject.key + "/meetings", {
      data: {
        meeting_init_data: data
      }
    });
  };

  BackendInterface.postEvents = function(events, meetingUUID) {
    if (LOGGING) console.log("posting", events, "from", meetingUUID);
    return $http.post(baseURL() + OBSMyProject.key + "/meetings", events, {
      headers: {
        'X-MEETING-UUID': meetingUUID
      }
    });
  };

  return BackendInterface;

});