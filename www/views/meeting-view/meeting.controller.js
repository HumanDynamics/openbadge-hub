angular.module('ngOpenBadge.contollers')

.controller('MeetingCtrl', function($scope, $interval, OBSBluetooth, OBSBackend, OBSCurrentMeeting) {

  $scope.$on('$ionicView.enter', function(e) {
    OBSCurrentMeeting.startDataCollection();
    //$scope.dataCollectionInterval = $interval( OBSThisMeeting.startDataCollection, 5000);
  });

  $scope.leaveMeeting = function() {
    $interval.cancel($scope.dataCollectionInterval);
    OBSCurrentMeeting.leave("manual");
  };

});