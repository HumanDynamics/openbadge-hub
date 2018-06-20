/*
Methods for the Hub... like uploading stale logs. or something like that.
*/

angular.module('ngOpenBadge.services')

.factory('OBSThisHub', function(OBSBackend, OBSCurrentMeeting) {
  var ThisHub = {
    name: "",
    meetings: {},
    is_god: false
  };

  var LOGGING = true;

  ThisHub.create = function(data) {
    if (LOGGING) console.log("giving my hub data:", data);

    ThisHub.name = data.name;
    ThisHub.su = data.is_god;

    ThisHub.scanMeetings().then(function () {

      for (var key in data.meetings) {
        var received = data.meetings[key]
        if (!received.uuid in ThisHub.meetings) {
          // an old meeting that has already been uploaded and cleared from cache
          continue;
        } else if (received.is_complete && !ThisHub.meetings[received.uuid].is_complete) {
          // there is inconsistency b/w local data and server data - sync
          ThisHub.syncMeeting(received.uuid);
        }
      }
    });
  };

  ThisHub.endMeeting = function(uuid, reason) {
    if (uuid in ThisHub.meetings) {
      ThisHub.meetings[uuid].is_complete = true;
      return ThisHub.wrteEndLog(uuid, reason).then(function() {
        ThisHub.syncMeeting(uuid, reason);
      }
    }
  }

  ThisHub.writeEndLog = function (uuid, reason) {
    let endLog = {
      type: "meeting ended",
      log_timestamp: new Date() / 1000,
      log_index: ++ThisHub.meetings["uuid"]["lastLogSerial"],
      data: {
        reason: reason
      }
    };
    return OBSStorage.writeToFile(uuid + '.txt', endLog);
  }
  
  ThisHub.syncMeeting = function(uuid) {
    OBSBackend.uploadEndedMeeting(uuid, reason).then(function(success) {
      console.log("Success", success);
    }, function(error) {
      console.error(error);
    });
  }

  ThisHub.scanMeetings = function() {
    return new Promise(function (resolve, reject) {
      // moderately worried about performance here
      // if phone has a large cache of long meetings this could be troublesome if ran often
      // maybe we run it once, when the app opens?
      // as far as i can tell there isn't a better / more performant way to do this
      // with cordova but I can't be sure
      function loadMeetings (filesAsText) {
        //TODO make sure we have data
        for (var rawData in filesAsText) {
          let lines = rawData.split("\n");
          let firstLog = JSON.parse(lines[0]);
          let meetingUUID = firstLog["data"]["uuid"];
          console.log("found meeting with uuid: " + meetingUUID);
          let lastLog = JSON.parse(lines[lines.length - 1]);
          let isMeetingEnded = lastLog["type"] === "meeting ended";

          ThisHub.meetings[meetingUUID] = {
            // using snake case here to match the api
            is_complete: isMeetingEnded,
            lastLogSerial: lastLog["log_index"],
            lastLogTimestamp: lastLog["log_timestamp"]
          };

          // if the uuid doesn't match the active meeting and it hasn't been ended,
          // that means the meeting wasn't properly ended by the user
          // likely either the app crashed or the user accidentally closed it
          // regardless, we should end the meeting & upload it to the server
          if (meetingUUID !== OBSCurrentMeeting.uuid && !isMeetingEnded) {
            ThisHub.endMeeting(meetingUUID, "sync");
          }
        }
        resolve();
      }

      OBSStorage.listFiles().then(function (files) {
        let promises = [];
        for (file in files) {
          promises.push(OBSStorage.readFile(file)); 
        }

        $q.all(promises).then(loadMeetings).catch(reject);
      }
  }

  return ThisHub;
});
