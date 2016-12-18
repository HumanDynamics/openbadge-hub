/*
Data about our current meeting, including methods to stire data to the meeting,
  interact with the badges of the meeting, and persist meeting data
  */


angular.module('ngOpenBadge.services')

.factory('OBSCurrentMeeting', function(OBSBackend, OBSMyProject, OBSBluetooth, OBSStorage, OBPrivate,
  $q, $timeout, $interval, $cordovaFile) {
  var CurrentMeeting = {};

  CurrentMeeting.events = [];

  CurrentMeeting.badgesInMeeting = {};
  CurrentMeeting.logIndex = 0;
  CurrentMeeting.lastUpdate = -1;

  CurrentMeeting.writeLog = function() {
    var logText = JSON.stringify(CurrentMeeting.events);
    // WRITE
    console.log("Writing to log file:", logText);
    return $cordovaFile.writeFile(cordova.file.dataDirectory, CurrentMeeting.uuid + ".txt", logText, true);
  };

  CurrentMeeting.chunkLogger = function (chunk, type) {
    var newChunk = {
      type:type,
      log_timestamp: new Date() / 1000.0,
      log_index: CurrentMeeting.logIndex++,
      hub: OBPrivate.DEVICE_UUID,
      data: chunk
    };
    //console.log(newChunk);
    CurrentMeeting.events.push(newChunk);
  };

  CurrentMeeting.addLocalBadge = function(badge) {
    CurrentMeeting.badgesInMeeting[badge.mac] = badge;
  };

  CurrentMeeting.removeLocalBadge = function(badge) {
    if (badge.mac in CurrentMeeting.badgesInMeeting)
      delete CurrentMeeting.badgesInMeeting[badge.mac];
  };

  // add events for all the member/hub joins, tell our badges to start recodring,
  //   start logging event data to server.
  CurrentMeeting.start = function() {
    var now = (new Date() / 1000.0);
    CurrentMeeting.uuid = OBSMyProject.key + "|" + now.toString();
    CurrentMeeting.logIndex = 0;

    CurrentMeeting.events = [{
      type: "meeting started",
      log_timestamp: now,
      log_index: CurrentMeeting.logIndex++,
      data: {
        log_version: "2.1",
        uuid: CurrentMeeting.uuid
      }
    }];

    var split = new Date().toString().split(" ");
    var timeZoneFormatted = split[split.length - 2] + " " + split[split.length - 1];

    CurrentMeeting.events.push({
      type: "hub joined",
      log_timestamp: new Date() / 1000,
      log_index: CurrentMeeting.logIndex++,
      data: {
        hub_locale: timeZoneFormatted
      }
    });

    var chunkLogger = function(badge) {
      return function (chunk, type) {
        chunk.member = badge.key;
        chunk.badge_address = badge.mac;

        console.log(type, "at time:", chunk.timestamp, "from", chunk.badge_address);
        CurrentMeeting.chunkLogger(chunk, type);
      };
    };

    for (var member in CurrentMeeting.badgesInMeeting) {
      member = CurrentMeeting.badgesInMeeting[member];

      member.onChunkCompleted = chunkLogger(member);

      CurrentMeeting.events.push({
        type: "member joined",
        log_timestamp: new Date() / 1000,
        log_index: CurrentMeeting.logIndex++,
        data: {
          badge_address: member.address,
          key: member.key
        }
      });

      OBSBluetooth.initializeBadgeBluetooth(member);
    }

    CurrentMeeting.writeLog()
    .then(OBSBackend.initMeeting)
    .then(function () {
      CurrentMeeting.postInterval = $interval(function() {
        CurrentMeeting.writeLog();
        console.log("Posting events");
        CurrentMeeting.postEvents();
      }, 10000);
    });
  };

  // uplaod a final chunk telling the server that we're done. stop the uploads.
  CurrentMeeting.leave = function(reason) {
    $interval.cancel(CurrentMeeting.postInterval);

    CurrentMeeting.events.push({
      type: "hub left",
      log_timestamp: new Date() / 1000,
      log_index: CurrentMeeting.logIndex++,
      data: {
        reason: reason
      }
    });
    return CurrentMeeting.postEvents();
  };

  CurrentMeeting.postEvents = function() {
    var defer = $q.defer();
    var toUpload = CurrentMeeting.events.slice(CurrentMeeting.lastUpdate + 1);
    if (toUpload.length === 0) {
      defer.resolve();
      return defer.promise;
    }
    console.log("Now uploading", toUpload);
    OBSBackend.postEvents(toUpload,
      CurrentMeeting.uuid).then(
      function(success) {
        CurrentMeeting.lastUpdate = success.data.last_update_index;
        console.log("Added chunks up until", CurrentMeeting.lastUpdate);
        defer.resolve();
      },
      function(error) {
        console.error(error);
        OBSStorage.saveChunks(toUpload, CurrentMeeting.uuid);
        defer.reject(error);
      }
    );

    return defer.promise;
  };

  return CurrentMeeting;

});