angular.module('ngOpenBadge.contollers')

.controller('MeetingCtrl', function($scope, $interval, OBSBluetooth, OBSBackend, OBSThisMeeting) {

  $scope.$on('$ionicView.enter', function(e) {
    OBSThisMeeting.startDataCollection();
    //$scope.dataCollectionInterval = $interval( OBSThisMeeting.startDataCollection, 5000);
  });

  $scope.leaveMeeting = function() {
    $interval.cancel($scope.dataCollectionInterval);
    OBSThisMeeting.leave("manual");
  };

});