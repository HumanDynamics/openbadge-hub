/*
Here we wrap all HTTP requests, provide some light data formatting, and
  send the data off to be sed by the various OpenBadgeServices.

We also interface with OBSStorage in order to fill requests when disconnected form internet
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

        defer.resolve(200);
      },
      function error_projects(response) {
        if (LOGGING) console.log("Ahh! Error getting long term data", response);
        if (response.status == 404) {
          BackendInterface.configureHub('new hub');
          defer.reject(404);
        }
        var cachedProject = OBSStorage.retrieveProject();
        if (cachedProject) {
          if (LOGGING) console.log("attempting to fill project data from cache", cachedProject);
          OBSMyProject.create(cachedProject);
          defer.resolve(300);
        } else {
          defer.reject(400);
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
        OBSMyProject.update(response.data.member_updates);

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

  // tell the server about this hub's uuid. add to OB-DEFAULT
  BackendInterface.configureHub = function(name) {
    var defer = $q.defer();
    $http({
      url: baseURL() + '0/hubs',
      method: "PUT",
      headers: {
        'X-HUB-NAME': name,
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

  // create the empty meeting object
  BackendInterface.initMeeting = function(meetingUUID) {
    return $http({
      url: baseURL() + OBSMyProject.key + "/meetings",
      method: 'PUT',
      headers: {
        'X-MEETING-UUID': meetingUUID,
        'X-LOG-VERSION': '2.1'
      }
    });
  };

  // add events to an existing meeting
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