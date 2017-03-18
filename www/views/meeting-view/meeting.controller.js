angular.module('ngOpenBadge.contollers').controller('MeetingCtrl', function($scope, $interval, OBSBluetooth, OBSBackend, OBSCurrentMeeting) {

  $scope.$on('$ionicView.enter', function(e) {
    OBSCurrentMeeting.start();

    OBSCurrentMeeting.onDataUpdate = function (member) {
      $scope.data[member.name] = [[]]
      $scope.labels[member.name] = []

      for (time in member.samples) {
        $scope.data[member.name][0].push(member.samples[time])
        $scope.labels[member.name].push(time*1000)
      }
    }
  });

  $scope.leaveMeeting = function() {
    $interval.cancel($scope.dataCollectionInterval);
    OBSCurrentMeeting.leave("manual");
  };

  $scope.labels = {};
  $scope.data = {};

  $scope.datasetOverride = [];
  $scope.options = {
    animation: false,
    scales: {
      xAxes: [
        {
          id: 'x-axis-1',
          type: 'time',
          display: false
        }
      ],
      yAxes: [
        {
          type: 'linear',
          display: false,
          position: 'left',
          ticks: {
            beginAtZero: true,
            max: 128,
          }
        }
      ]
    }
  };

});
