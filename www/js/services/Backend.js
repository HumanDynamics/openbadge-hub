/*
Here we wrap all HTTP requests, provide some light data formatting, and
  send the data off to be sed by the various OpenBadgeServices.

We also interface with OBSStorage in order to fill requests when disconnected from internet
*/

angular.module('ngOpenBadge.services')

.factory('OBSBackend', function($http, $q, OBSThisHub, OBPrivate, OBSMyProject, OBSStorage, $cordovaFile, $timeout) {
  var BackendInterface = {};
  var baseURL = function() {
    return OBPrivate.BASE_URL;
  };

  var LOGGING = true;

  BackendInterface.longTermRefresh = function() {
    // Perform a full refresh of all data, both hub and project. Should be
    //  called perhaps once per session. Needs to be called whenever a hub
    //  changes project.
    //
    //  TODO should we sync completed meetings here?
    //  maybe.

    var defer = $q.defer();
    console.log("starting longTermRefresh");
    $http.get(baseURL() + 'projects', {timeout:2000}).then(
      function got_projects(response) {
        if (LOGGING) {
          console.log("got project data:", response);
        }

        OBSMyProject.create(response.data);

        OBSStorage.cacheProject(response.data);
        OBSStorage.cacheMemberUpdate(new Date() / 1000.0);

        defer.resolve(200);
      },
      function error_projects(response) {
        if (LOGGING) {
          console.log("Ahh! Error getting long term data", response);
        }

        if (response.status == 404) {
          BackendInterface.configureHub('new hub');
          defer.reject(404);
        }

        var cachedProject = OBSStorage.retrieveProject();
        if (cachedProject) {
          if (LOGGING) {
            console.log("attempting to fill project data from cache", cachedProject);
          }
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
    console.log("starting shortTermRefresh");
    var lastMemberUpdate = OBSStorage.retrieveMemberUpdate();
    if (!lastMemberUpdate) {
      lastMemberUpdate = 0;
    }

    $http.get(baseURL() + OBSMyProject.key + '/hubs', {
      timeout: 2000,
      headers: {
        'X-LAST-UPDATE': lastMemberUpdate
      }
    }).then(
      function got_projects(response) {
        if (LOGGING) {
          console.log("got hub data:", response);
        }
        OBSThisHub.create(response.data);
        OBSMyProject.update(response.data.member_updates);

        OBSStorage.cacheHub(response.data);
        OBSStorage.cacheMemberUpdate(new Date() / 1000.0);

        defer.resolve();
      },
      function error_projects(response) {
        if (LOGGING) {
          console.log("Ahh! Error getting hub data", response);
        }

        var cachedHub = OBSStorage.retrieveHub();
        if (cachedHub) {
          if (LOGGING) {
            console.log("attempting to fill hub data from cache", cachedHub);
          }

          OBSThisHub.create(cachedHub);
        }

        defer.reject();
      }
    );
    return defer.promise;
  };

  BackendInterface.configureHub = function(name) {
    // tell the server about this hub's uuid. add to OB-DEFAULT

    var defer = $q.defer();
    $http({
      url: baseURL() + '0/hubs',
      method: "PUT",
      headers: {
        'X-HUB-NAME': name,
      }
    }).then(
      function put_hub(response) {
        if (LOGGING) {
          console.log("put hub data:", response);
        }
        defer.resolve();
      },
      function error_projects(response) {
        if (LOGGING) {
          console.log("Ahh! Error putting data", response);
        }
        defer.reject(response.status);
      }
    );
    return defer.promise;
  };

  function uploadFile(uuid, defer, params) {

    var win = function (r) {
        console.log("Code = " + r.responseCode);
        console.log("Response = " + r.response);
        console.log("Sent = " + r.bytesSent);
        defer.resolve()
    }

    var fail = function (error) {
        console.log("upload error source " + error.source);
        console.log("upload error target " + error.target);
        console.log(error);
        defer.reject();
    }

    var fileURL = cordova.file.externalDataDirectory + uuid + ".txt"

    var options = new FileUploadOptions();
    options.fileKey = "file";
    options.fileName = fileURL.substr(fileURL.lastIndexOf('/') + 1);
    options.mimeType = "text/plain";
    options.headers = {"X-APPKEY": OBPrivate.APP_KEY, "X-HUB-UUID": OBPrivate.DEVICE_UUID};
    options.httpMethod = "PUT";

    options.params = params;

    var ft = new FileTransfer();

    ft.upload(fileURL,
              encodeURI(OBPrivate.BASE_URL + OBSMyProject.key + "/meetings"),
              win,
              fail,
              options);

    return defer.promise;

  }

  // create the empty meeting object
  BackendInterface.initMeeting = function(uuid) {
    console.log("Attempting to init meeting obj for: " + uuid)
    var defer = $q.defer();

    var params = {is_complete: false};

    return uploadFile(uuid, defer, params);
  };
  
  // End the meeting
  BackendInterface.endMeeting = function(uuid, reason) {
    console.log("attempting to end meeting: " + uuid + " because: " + reason);
    var defer = $q.defer();

    var params = {
      is_complete: true,
      ending_method: "manual" };
    return uploadFile(uuid, defer, params);
  };

  // add events to an existing meeting
  BackendInterface.postEvents = function(events, meetingUUID) {
    if (LOGGING) console.log("posting", events, "from", meetingUUID);
    var toPost = {
      chunks: JSON.stringify(events.map(function (str) {
        return JSON.stringify(str) + '\n';
      })),
      uuid: meetingUUID
    }
    return $http.post(
      baseURL() + OBSMyProject.key + "/meetings",
      toPost,
      { headers: { 'X-MEETING-UUID': meetingUUID } }
    );
  };

  return BackendInterface;

});
