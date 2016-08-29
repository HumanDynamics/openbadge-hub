/*
All persistant storage should happen through this wrapper.

This includes localStorage and WebSQL and all that fun stuff.
*/

angular.module('ngOpenBadge.services')

.factory('OBSStorage', function() {
  var StorageService = {};
  var projectKey = "projectKey";
  var hubKey = "hubKey";
  var lastMemberUpdateKey = "lastMemberUpdateKey";
  var storage = window.localStorage;


  // PROJECT
  StorageService.cacheProject = function(data) {
    storage.setItem(projectKey, JSON.stringify(data));
  };

  StorageService.retrieveProject = function() {
    return JSON.parse(storage.getItem(projectKey));
  };

  // HUB
  StorageService.cacheHub = function(data) {
    storage.setItem(hubKey, JSON.stringify(data));
  };

  StorageService.retrieveHub = function() {
    return JSON.parse(storage.getItem(hubKey));
  };

  // LAST MEMBER UPDATE
  StorageService.cacheMemberUpdate = function(data) {
    storage.setItem(lastMemberUpdateKey, JSON.stringify(data));
  };

  StorageService.retrieveMemberUpdate = function() {
    return JSON.parse(storage.getItem(lastMemberUpdateKey));
  };

  return StorageService;
});