/*
Methods for the Hub... like uploading stale logs. or something like that.
*/

angular.module('ngOpenBadge.services')

.factory('OBSThisHub', function(OBSBackend, OBSStorage, $q) {
  var ThisHub = {
    name: "",
    meetings: {},
    is_god: false,
    activeMeeting: null
  };

  var LOGGING = true;

  ThisHub.create = function(data) {
    if (LOGGING) console.log("giving my hub data:", data);

    ThisHub.name = data.name;
    ThisHub.su = data.is_god;

    ThisHub.scanMeetings().then(function () {

      for (var key in data.meetings) {
        var received = data.meetings[key]
        console.log("Checking uuid", received.uuid)
        console.log(ThisHub.meetings[received.uuid])
        if (!(received.uuid in ThisHub.meetings)) {
          // an old meeting that has already been uploaded and cleared from cache
          continue;
        } else if (!received.is_complete && ThisHub.meetings[received.uuid].is_complete) {
          // there is inconsistency b/w local data and server data - sync
          ThisHub.syncMeeting(received.uuid, "sync");
        }
      }
    }).catch(function(err) {
      console.log("Err scan!", err);
    });

  };

  ThisHub.updateServerLogSerial = function (data) {
    for (var key in data.meetings) {
      var received = data.meetings[key]
      if (!(received.uuid in ThisHub.meetings)) {
        // an old meeting that has already been uploaded and cleared from cache
        continue;
      } else {
        ThisHub.meetings[received.uuid]["serverLogSerial"] = received.last_log_serial;
      }
    }
  }


  ThisHub.endMeeting = function(uuid, reason) {
    if (uuid in ThisHub.meetings) {
      ThisHub.meetings[uuid].is_complete = true;
      return ThisHub.writeEndLog(uuid, reason).then(function() {
        ThisHub.syncMeeting(uuid, reason);
      });
    }
  }

  ThisHub.writeEndLog = function (uuid, reason) {
    console.log("writing endlog to", uuid);
    let endLog = JSON.stringify({
      type: "meeting ended",
      log_timestamp: new Date() / 1000,
      log_index: ++ThisHub.meetings[uuid]["lastLogSerial"],
      data: {
        reason: reason
      }
    });
    let fileName = uuid + '.txt';
    // cordovaFile doesn't support appending??????????
    // it replaces entire file on write
    // so we have to get contents, add final line, and then write
    return OBSStorage.readFile(fileName).then(function (fileContents) {
      return OBSStorage.writeToFile(uuid + '.txt', fileContents + endLog + "\n");
    });
  }

  ThisHub.syncMeeting = function(uuid, reason) {
    console.log("uploading mtg", uuid);
    OBSBackend.uploadEndedMeeting(uuid, reason).then(function(success) {
      console.log("Success", success);
    }, function(error) {
      console.log(error);
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
        for (let i = 0; i < filesAsText.length; i++) {
          let rawData = filesAsText[i].trim();
          if (rawData.length < 1) {
            // our data is bad - this should always be true
            // however, we can't reject because we want to continue processing
            // the good files.
            console.log("Encountered malformed data file - empty");
            continue;
          }
          let lines = rawData.split("\n");
          let firstLog = JSON.parse(lines[0]);
          if (firstLog["type"] !== "meeting started") {
            // our data is bad - this should always be true
            // however, we can't reject because we want to continue processing
            // the good files.
            console.log("Encountered malformed data file - first line type other than meeting started");
            continue;
          }
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
          if (meetingUUID !== ThisHub.activeMeeting && !isMeetingEnded) {
            ThisHub.endMeeting(meetingUUID, "sync");
          }
        }
        resolve();
      }

      OBSStorage.listFiles().then(function (files) {
        let promises = files.map(file => OBSStorage.readFile(file))
        $q.all(promises).then(loadMeetings).catch(reject);
      });
    });
  }

  return ThisHub;
});
