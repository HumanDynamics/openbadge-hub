/*
Methods for the Hub... like uploading stale logs. or something like that.
*/

angular.module('ngOpenBadge.services')

.factory('OBSThisHub', function() {
  var ThisHub = {
    name: "",
    lastLogUpdates: {},
    su: false
  };

  var LOGGING = true;

  ThisHub.create = function(data) {
    if (LOGGING) console.log("giving my hub data:", data);

    ThisHub.name = data.name;
    ThisHub.lastLogUpdates = data.last_log_updates;
    ThisHub.su = data.su;
  };

  return ThisHub;
});