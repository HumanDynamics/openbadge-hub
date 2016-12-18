/*
Information about the Project this hub is a part of
*/

angular.module('ngOpenBadge.services')

.factory('OBSMyProject', function(OBSStorage) {
  var MyProject = {};

  var LOGGING = true;

  MyProject = {
    key: -1,
    members: {},
    badgeMap: {},
    id: -1,
    name: ""
  };

  MyProject.create = function(data) {
    if (LOGGING) console.log("giving my project data:", data);

    MyProject.key       = data.key;
    MyProject.members   = data.members;
    MyProject.badgeMap  = data.badge_map;
    MyProject.id        = data.project_id;
    MyProject.name      = data.name;
  };

  MyProject.update = function(members) {
    for (var address in members) {
      if (members.hasOwnProperty(address)) {
        if (LOGGING) console.log("adding member", member);
        MyProject.members[address] = members[address];
      }
    }

    OBSStorage.cacheProject({
      key: MyProject.key,
      members: MyProject.members,
      badgeMap: MyProject.badgeMap,
      id: MyProject.id,
      name: MyProject.name
    });

  };

  return MyProject;
});