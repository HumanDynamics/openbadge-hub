/*
Information about the Project this hub is a part of
*/

angular.module('ngOpenBadge.services')

.factory('OBSMyProject', function(OBSStorage) {
  var MyProject = {};

  var LOGGING = true;

  MyProject = {
    activeMeetings: [],
    key: "",
    members: {},
    name: ""
  };

  MyProject.create = function(data) {
    if (LOGGING) console.log("giving my project data:", data);

    MyProject.activeMeetings = data.active_meetings;
    MyProject.key = data.key;
    MyProject.members = data.members;
    MyProject.name = data.name;
  };

  MyProject.update = function(members) {
    for (var address in members) {
      if (members.hasOwnProperty(address)) {
        if (LOGGING) console.log("adding member", member);
        MyProject.members[address] = members[address];
      }
    }

    OBSStorage.cacheProject({
      activeMeetings: MyProject.activeMeetings,
      key: MyProject.key,
      members: MyProject.members,
      name: MyProject.name
    });

  };

  return MyProject;
});