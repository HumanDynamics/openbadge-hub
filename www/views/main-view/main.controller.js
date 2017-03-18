angular.module('ngOpenBadge.contollers')

.controller('GroupViewCtrl', function($scope, $state, $timeout, $interval, $q,
  OBSBluetooth, OBSBackend, OBSCurrentMeeting, OBSMyProject, OBSThisHub,
  $ionicSideMenuDelegate) {

  $scope.badgesInMeeting = {};
  $scope.projectName = "";
  $scope.hubName = "";
  $scope.projectKey = "";

  $scope.discoveredBadges = {};

  $scope.noFoundBadges = function () {
    return Object.keys($scope.discoveredBadges).length === 0;
  }

  $scope.$on('$ionicView.afterEnter', function(event) {
    $ionicSideMenuDelegate.canDragContent(false);
  });

  //enable side menu drag before moving to next view
  $scope.$on('$ionicView.beforeLeave', function (event) {
    $ionicSideMenuDelegate.canDragContent(true);
  });

  $scope.$on('$ionicView.enter', function(e) {
    $timeout(function () {
      $scope.longTermRefresh().then($scope.startScan);
    }, 2000);
  });

  $scope.longTermRefresh = function() {

    console.log("Starting refresh");
    return OBSBackend.longTermRefresh()
      .then(OBSBackend.shortTermRefresh)
      .then(function() {

        $scope.badgesInMeeting = OBSCurrentMeeting.badgesInMeeting;
        $scope.projectName = OBSMyProject.name;
        $scope.hubName = OBSThisHub.name;
        $scope.projectKey = OBSMyProject.key;
 
        $scope.$broadcast('scroll.refreshComplete');
        });
  };

  $scope.pullRefresh = function() {
    $scope.longTermRefresh().then($scope.startScan);
  };

  $scope.nobadgesInMeeting = function() {
    return Object.keys($scope.badgesInMeeting).length === 0;
  };

  $scope.initMeeting = function() {
    $state.go('app.meeting');
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

        if (badge.mac in $scope.discoveredBadges) {
          var existingBadge = $scope.discoveredBadges[badge.mac];

          // update our previously discovered badge
          existingBadge.strength = badge.strength;
          existingBadge.battery  = badge.battery;

          //localBadge.rssi  = badge.rssi
          // maybe not update rssi to keep order ~constant

        } else {
          $scope.discoveredBadges[badge.mac] = badge;
          console.log("found new badge:", badge.address, badge);
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
    return (badge.mac in OBSCurrentMeeting.badgesInMeeting);
  };

  $scope.toggleMember = function(badge) {
    if ($scope.badgeIsInGroup(badge)) {
      OBSCurrentMeeting.removeLocalBadge(badge);
    } else {
      OBSCurrentMeeting.addLocalBadge(badge);
    }
  };
});
