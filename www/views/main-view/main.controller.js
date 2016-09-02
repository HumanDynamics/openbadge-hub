angular.module('ngOpenBadge.contollers')

.controller('GroupViewCtrl', function($scope, $state, $timeout, $q,
  OBSBluetooth, OBSBackend, OBSCurrentMeeting, OBSMyProject, OBSThisHub) {

  $scope.localMembers = {};
  $scope.projectName = "";
  $scope.hubName = "";
  $scope.projectKey = "";

  $scope.$on('$ionicView.enter', function(e) {
    $scope.longTermRefresh().then($scope.startScan);
  });

  $scope.longTermRefresh = function() {
    $scope.startScan();

    return OBSBackend.longTermRefresh()
      .then(OBSBackend.shortTermRefresh)
      .then(function() {

        $scope.localMembers = OBSCurrentMeeting.localMembers;
        $scope.projectName = OBSMyProject.name;
        $scope.hubName = OBSThisHub.name;
        $scope.projectKey = OBSMyProject.key;

        $scope.$broadcast('scroll.refreshComplete');
      });
  };

  $scope.noLocalMembers = function() {
    return Object.keys($scope.localMembers).length === 0;
  };

  $scope.initMeeting = function() {
    OBSCurrentMeeting.init().then(
      function(succ) {
        console.log(succ);
      },
      function(error) {
        console.log(error);
      });
    $state.go('app.meeting');
  };


  $scope.resetAll = function() {
    $scope.foundBadgesIndex = {};
    $scope.foundBadges = [];

    for (var member in OBSCurrentMeeting.localMembers) {
      if (OBSCurrentMeeting.localMembers.hasOwnProperty(member)) {
        OBSCurrentMeeting.removeLocalBadge(member);
      }
    }
  };

  $scope.startScan = function() {

    // if we dont have a badge in first 10 sec, give up.
    // TODO: Should also notify that we cant find anything.
    var timer = $scope.resetTimer(10000);

    OBSBluetooth.startScan().then(null,
      function startscan_error(message) {
        console.log(message);
      },
      function startscan_notify(badge) {
        // we found a badge, lets add it to our list

        if (badge.address in $scope.foundBadgesIndex) {
          var localBadge = $scope.foundBadges[$scope.foundBadgesIndex[badge.address]];

          localBadge.strength = badge.strength;
          localBadge.battery = badge.battery;
          //localBadge.rssi  = badge.rssi
          // maybe not update rssi to keep order ~constant

        } else {
          $scope.foundBadgesIndex[badge.address] = $scope.foundBadges.length;
          $scope.foundBadges.push(badge);
          console.log("found new badge:", badge);
          // give ourselves a little more time
          $scope.resetTimer(10000);
        }
      }
    );
    return timer;
  };

  // extend the time until we close our scan
  // NOTE: this will *not* start the scan if the scan is already closed
  $scope.resetTimer = function(ms) {

    var defer = $q.defer();

    $scope.isScanning = true;
    if ($scope.stopScanTimer)
      $timeout.cancel($scope.stopScanTimer);

    $scope.stopScanTimer = $timeout(
      function scan_timeout() {
        OBSBluetooth.stopScan();
        $scope.isScanning = false;
        defer.resolve();

      }, ms);

    return defer.promise;
  };

  $scope.badgeIsInGroup = function(badge) {
    return (badge.address in OBSCurrentMeeting.localMembers);
  };

  $scope.toggleMember = function(badge) {
    var localBadge = JSON.stringify(badge);
    if ($scope.badgeIsInGroup(badge)) {
      OBSCurrentMeeting.removeLocalBadge(localBadge);
    } else {
      OBSCurrentMeeting.addLocalBadge(localBadge);
    }
  };
});