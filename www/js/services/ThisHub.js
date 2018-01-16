/*
Methods for the Hub... like uploading stale logs. or something like that.
*/

angular.module('ngOpenBadge.services')

.factory('OBSThisHub', function() {
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

    for (var key in data.meetings) {
      var received = data.meetings[key]
      ThisHub.meetings[received.uuid] = {
        isComplete: received.is_complete,
        lastLogSerial: received.last_log_serial,
        lastLogTimestamp: received.last_log_timestamp
      }
    }
  };

  return ThisHub;
});
