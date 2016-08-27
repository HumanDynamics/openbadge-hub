angular.module('ngOpenBadge.services')

.factory('OBSCurrentMeeting', function(OBSBackend, OBSMyProject, OBSBluetooth,
                                    $q, $timeout, $interval) {
    var CurrentMeeting = {};

    CurrentMeeting.events = [];
    CurrentMeeting.localMembers = {};
    CurrentMeeting.logIndex = 0;
    CurrentMeeting.lastUpdate = -1;

    CurrentMeeting.addLocalBadge = function(badgeJSON) {
        var badge = JSON.parse(badgeJSON);
        CurrentMeeting.localMembers[badge.address] = badge;
    };

    CurrentMeeting.removeLocalBadge = function(badgeJSON) {
        var badge = JSON.parse(badgeJSON);

        if (badge.address in CurrentMeeting.localMembers)
            delete CurrentMeeting.localMembers[badge.address];
    };

    CurrentMeeting.init = function () {
      var now = (new Date()/1000.0);
      CurrentMeeting.uuid = OBSMyProject.name + "|" + now.toString();
      CurrentMeeting.logIndex = 0;
      CurrentMeeting.events = [
        {
          type: "meeting started",
          log_timestamp: now,
          log_index: CurrentMeeting.logIndex++,
          data: {
            log_version: "2.1",
            uuid: CurrentMeeting.uuid
          }
        }
      ];

      CurrentMeeting.postInterval = $interval(function () {
        console.log("Posting events");
        CurrentMeeting.postEvents();
      }, 10000);

      return OBSBackend.initMeeting(CurrentMeeting.events[0]).then(
        function () {
          CurrentMeeting.lastUpdate = 0;
          return CurrentMeeting.join();
        }
      );
    };


    CurrentMeeting.join = function() {

      var split = new Date().toString().split(" ");
      var timeZoneFormatted = split[split.length - 2] + " " + split[split.length - 1];

      CurrentMeeting.events.push(
        {
          type:"hub joined",
          log_timestamp:new Date()/1000,
          log_index: CurrentMeeting.logIndex++,
          data: {
            hub_locale: timeZoneFormatted
          }
        }
      );

      for (var member in CurrentMeeting.localMembers) {
        member = CurrentMeeting.localMembers[member];
        CurrentMeeting.events.push({
          type:"member joined",
          log_timestamp:new Date()/1000,
          log_index: CurrentMeeting.logIndex++,
          data: {
            badge_address: member.address,
            key: member.key
          }
        });

        CurrentMeeting.initializeMemberBluetooth(member);
      }

      CurrentMeeting.postEvents();

    };

    CurrentMeeting.leave = function(reason) {

      $interval.cancel(CurrentMeeting.postInterval);

      CurrentMeeting.events.push(
        {
          type:"hub left",
          log_timestamp:new Date()/1000,
          log_index: CurrentMeeting.logIndex++,
          data: {
            reason: reason
          }
        }
      );
      return CurrentMeeting.postEvents();
    };

    CurrentMeeting.initializeMemberBluetooth = function(member) {
      return OBSBluetooth.connect(member)
      .then(null, null, function () {
        return OBSBluetooth.sendStartRecordingRequest(member);
      })
      .then(function () {
        return OBSBluetooth.collectData(member);
      })
      .then(null, null, function (chunks) {
        for (var i = 0; i < chunks.length; i++) {
          CurrentMeeting.events.push({
            type:"audio recieved",
            log_timestamp:new Date()/1000,
            log_index: CurrentMeeting.logIndex++,
            data: {
              member: member.key,
              samples: chunks[i].samples
            }
          });
        }
      });
    };

    CurrentMeeting.startDataCollection = function() {
      for (var member in CurrentMeeting.localMembers) {
        if (CurrentMeeting.localMembers.hasOwnProperty(member)) {
          member = CurrentMeeting.localMembers[member];
          OBSBluetooth.collectData(member);
        }
      }
    };

    CurrentMeeting.postEvents = function () {
      var defer = $q.defer();
      var toUpload = CurrentMeeting.events.slice(CurrentMeeting.lastUpdate+1);
      if (toUpload.length === 0) {
        defer.resolve();
        return defer.promise;
      }
      console.log("Now uploading", toUpload);
      OBSBackend.postEvents( toUpload,
            CurrentMeeting.uuid ).then(
        function (success)
        {
          CurrentMeeting.lastUpdate = success.data.last_update_index;
          console.log("Added chunks up until", CurrentMeeting.lastUpdate);
          defer.resolve();
        },
        function (error) {
          console.error(error);
          defer.reject(error);
        }
      );

      return defer.promise;
    };

    return CurrentMeeting;
});
