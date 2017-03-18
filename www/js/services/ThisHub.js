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

    for (var uuid in data.meetings) {
      var recieved = data.meetings[uuid]
      ThisHub.meetings[uuid] = {
        isComplete: recieved.is_complete,
        lastLogSerial: recieved.last_log_serial,
        lastLogTimestamp: recieved.last_log_timestamp
      }
    }
  };

  return ThisHub;
});
