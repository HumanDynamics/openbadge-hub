/*
All persistent storage should happen through this wrapper.

This includes localStorage and WebSQL and all that fun stuff.

Watch out becuase localStorage can't accept more than like 5MB or something.
*/

angular.module('ngOpenBadge.services')

.factory('OBSStorage', function($cordovaFile) {
  var StorageService = {};
  var projectKey = "projectKey";
  var hubKey = "hubKey";
  var lastMemberUpdateKey = "lastMemberUpdateKey";
  var toUploadKey = "toUploadKey";
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


  // StorageService.initializeLogFile = function(meeting) {
  //   window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {
  //
  //     console.log('file system open: ' + fs.name);
  //     fs.root.getFile(meeting.UUID + ".txt", { create: true, exclusive: false }, function (fileEntry) {
  //
  //         console.log("fileEntry is file?" + fileEntry.isFile.toString());
  //         // fileEntry.name == 'someFile.txt'
  //         // fileEntry.fullPath == '/someFile.txt'
  //         writeFile(fileEntry, null);
  //
  //
  //     }, null);
  //   }, null);
  // }

  // StorageService

  // store chunks to memory. right now this just puts them in
  //  local storage, in the future should store to WebSQL or something
  StorageService.saveChunks = function (chunks, meetingUUID) {
    var previous = storage.getItem(meetingUUID);
    previous = previous || '[]';
    previous = JSON.parse(previous);

    newChunksToUpload = previous.concat(chunks);
    storage.setItem(meetingUUID, JSON.stringify(newChunksToUpload));

    // save this meeting as one which needs to be later uploaded
    var toUpload = storage.getItem(toUploadKey);
    toUpload = toUpload || '{}';
    toUpload = JSON.parse(toUpload);

    toUpload[meetingUUID] = true;

    storage.setItem(toUploadKey, JSON.stringify(toUpload));
  };

  // append the given contents to a file in Cordova External Data Directory
  StorageService.writeToFile = function(name, contents) {
    return $cordovaFile.writeFile(cordova.file.externalDataDirectory, name, contents, true);
  }

  StorageService.readFile = function(name) {
    // returns a promise that resolves to the contents of the provided file
    return new Promise(function (outerResolve, outerReject) {
      new Promise(function (resolve, reject) {
        window.resolveLocalFileSystemURL(
                cordova.file.externalDataDirectory + name,
                resolve, 
                reject);
      }).then(function (file) {
        let reader = new FileReader();

        reader.onloadend = function (evt) {
          outerResolve(evt.target.results);
        }

        reader.readAsText(file);
      }).catch(outerReject);
    });
  }

  StorageService.listFiles = function() {
    return new Promise(function (outerResolve, outerReject) {
      new Promise(function (resolve, reject) {
        window.resolveLocalFileSystemURL(
                cordova.file.externalDataDirectory,
                resolve, 
                reject);
      }).then(function (dir) {
        let reader = dir.createReader();
        return new Promise(function (resolve, reject) {
          reader.readEntries(resolve, reject);
        });
      }).then(function (entries) {
        let fileList = [];
        for (var entry in entries) {
          fileList.push(entry.fullPath);
        };
        outerResolve(fileList);
      }).catch(outerReject);
    });
  }

  return StorageService;
});
