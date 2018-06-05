/*
Data about our current meeting, including methods to stire data to the meeting,
  interact with the badges of the meeting, and persist meeting data
  */

angular.module('ngOpenBadge.services').factory('OBSCurrentMeeting', function(OBSBackend, OBSMyProject, OBSBluetooth,
                                                                             OBSStorage, OBSThisHub, OBPrivate,
                                                                             OBSAnalysis, $q, $timeout, $interval) {
  var CurrentMeeting = {};

  CurrentMeeting.events = [];

  CurrentMeeting.data = {};

  CurrentMeeting.badgesInMeeting = {};
  CurrentMeeting.logIndex = 0;

  CurrentMeeting.lastUpdate = function() {
    return OBSThisHub.meetings[CurrentMeeting.uuid].lastLogSerial
  };

  CurrentMeeting.writeLog = function() {
    var logText = ""
    for (var log in CurrentMeeting.events) {
      logText += JSON.stringify(CurrentMeeting.events[log]) + "\n";
    }
    // var logText = JSON.stringify(CurrentMeeting.events);
    console.log("Writing out to log file");
    return OBSStorage.writeToFile(CurrentMeeting.uuid + ".txt", logText);
  };

  CurrentMeeting.chunkLogger = function(chunk, type) {
    var newChunk = {
      type: type,
      log_timestamp: new Date() / 1000.0,
      log_index: CurrentMeeting.logIndex++,
      hub: OBPrivate.DEVICE_UUID,
      data: chunk
    };

    CurrentMeeting.events.push(newChunk);

    var getObjectVals = function(obj) {
      var vals = [];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          vals.push(obj[key]);
        }
      }
      return vals;
    }
    var end = new Date().getTime();
    var start = end - 1000 * 60 * 5;
    intervals = new OBSAnalysis.GroupDataAnalyzer(getObjectVals(CurrentMeeting.badgesInMeeting), start, end);
    console.log("Got intervals: ", intervals);
    CurrentMeeting.intervals = intervals;

    if (type === "audio recieved") {
      var avgBySecond = {};
      var innerChunkDivisions = 2
      var chunksize = 114 / innerChunkDivisions
      for (var i = 0; i < 114; i += chunksize) {
        var sum = 0;
        for (var j = i; j < i + chunksize; j++) {
          sum += chunk.samples[j]
        }
        avgBySecond[chunk.timestamp + i * 0.05] = sum / chunksize
      }
      for (time in avgBySecond) {
        CurrentMeeting.data[chunk.badge_address].samples[time] = avgBySecond[time]
      }
      if (CurrentMeeting.onDataUpdate) {
        CurrentMeeting.onDataUpdate(CurrentMeeting.data[chunk.badge_address])
      }
    }
  };

  CurrentMeeting.addLocalBadge = function(badge) {
    badge.dataAnalyzer = new OBSAnalysis.DataAnalyzer();

    CurrentMeeting.badgesInMeeting[badge.mac] = badge;
    CurrentMeeting.data[badge.mac] = {
      name: badge.owner,
      samples: {} // Map timestamp to second-average'd volume
    }
  };

  CurrentMeeting.removeLocalBadge = function(badge) {
    badge.dataAnalyzer.clearData();
    CurrentMeeting.data[badge.mac] = null;
    if (badge.mac in CurrentMeeting.badgesInMeeting)
      delete CurrentMeeting.badgesInMeeting[badge.mac];
    };

  // add events for all the member/hub joins, tell our badges to start recodring,
  //   start logging event data to server.
  CurrentMeeting.start = function() {
    var now = Math.floor((new Date() / 1000.0));
    CurrentMeeting.uuid = OBPrivate.DEVICE_UUID + "_" + now.toString();
    CurrentMeeting.logIndex = 0;

    CurrentMeeting.events = [
      {
        type: "meeting started",
        log_timestamp: now,
        hub: OBPrivate.DEVICE_UUID,
        log_index: CurrentMeeting.logIndex++,
        data: {
          log_version: "2.1",
          uuid: CurrentMeeting.uuid,
          start_time: new Date() / 1000
        }
      }
    ];

    var split = new Date().toString().split(" ");
    var timeZoneFormatted = split[split.length - 2] + " " + split[split.length - 1];

    CurrentMeeting.events.push({
      type: "hub joined",
      log_timestamp: new Date() / 1000,
      hub: OBPrivate.DEVICE_UUID,
      log_index: CurrentMeeting.logIndex++,
      data: {
        hub_locale: timeZoneFormatted
      }
    });

    for (var member in CurrentMeeting.badgesInMeeting) {
      member = CurrentMeeting.badgesInMeeting[member];
      CurrentMeeting.initNewMember(member);
    }

    CurrentMeeting.writeLog().then(function() {
      OBSBackend.initMeeting(CurrentMeeting.uuid);
    }).then(function() {
      CurrentMeeting.postInterval = $interval(function() {
        CurrentMeeting.writeLog().then(OBSBackend.shortTermRefresh).then(CurrentMeeting.postEvents);
      }, 10000);
    });
  };


  CurrentMeeting.initNewMember = function(member) {
    var chunkLogger = function(badge) {
      return function(chunk, type) {
        chunk.member = badge.key;
        chunk.badge_address = badge.mac;
        badge.dataAnalyzer.addChunk(chunk);
        console.log("Logged a <<", type, ">> from time:", chunk.timestamp, "from", chunk.badge_address);
        CurrentMeeting.chunkLogger(chunk, type);
      };
    };

    // member = CurrentMeeting.badgesInMeeting[member];

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

  // uplaod a final chunk telling the server that we're done. stop the uploads.
  CurrentMeeting.leave = function(reason) {
    $interval.cancel(CurrentMeeting.postInterval);

    for (var member in CurrentMeeting.badgesInMeeting) {
      _member = CurrentMeeting.badgesInMeeting[member];
      OBSBluetooth.endConnection(_member);
      console.log("Ended connection to", _member);
      delete CurrentMeeting.badgesInMeeting[member];
    }

    //TODO make sure we've got all data from badges?

    CurrentMeeting.events.push({
      type: "meeting ended",
      log_timestamp: new Date() / 1000,
      log_index: CurrentMeeting.logIndex++,
      data: {
        reason: reason
      }
    });
    
    CurrentMeeting.writeLog().then(function() { 
      CurrentMeeting.putEndMeeting(reason);
    });
  };

  CurrentMeeting.putEndMeeting = function (reason) {
    var defer = $q.defer();
    console.log("Now putting meeting file to end");
    OBSBackend.endMeeting(CurrentMeeting.uuid, reason).then(function(success) {
      console.log("Success", success);
      defer.resolve();
    }, function(error) {
      console.error(error);
      defer.reject(error);
    });

  }
  CurrentMeeting.postEvents = function() {
    var defer = $q.defer();
    var toUpload = CurrentMeeting.events.slice(CurrentMeeting.lastUpdate() + 1);
    if (toUpload.length === 0) {
      defer.resolve();
      return defer.promise;
    }
    console.log("Now uploading", toUpload);
    OBSBackend.postEvents(toUpload, CurrentMeeting.uuid).then(function(success) {
      console.log("Success", success);
      defer.resolve();
    }, function(error) {
      console.error(error);
      OBSStorage.saveChunks(toUpload, CurrentMeeting.uuid);
      defer.reject(error);
    });

    return defer.promise;
  };

  return CurrentMeeting;

});
