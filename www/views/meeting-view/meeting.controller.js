angular.module('ngOpenBadge.contollers').controller('MeetingCtrl', function($scope, $interval, OBSBluetooth, OBSBackend, OBSCurrentMeeting) {

  $scope.historyLength = 2 * 60;

  $scope.$on('$ionicView.enter', function(e) {
    OBSCurrentMeeting.start();


    var $mmVis = $("#meeting-mediator");
    $mmVis.empty();
    $scope.mm = null;
    $scope.mm = new MM({
            participants: app.meeting.memberKeys,
            names: app.meeting.memberInitials,
            transitions: 0,
            turns: []
        },
        app.meeting.moderator,
        $mmVis.width(),
        $mmVis.height());
    $scope.mm.render('#meeting-mediator');


    $scope.shiftInterval = $interval( function () {
      var members = Object.keys($scope.data);
      for(var i = 0; i < members.length; i++) {
        var memberName = members[i];
        var memberData = $scope.data[memberName][0]

        if (memberData[memberData.length - 1] === 0) {
          $scope.data[memberName][0].pop()
          $scope.labels[memberName].pop()
        }

        $scope.data[memberName][0].push(0)
        $scope.labels[memberName].push(new Date()/1)
      }
    }, 1000)

    OBSCurrentMeeting.onDataUpdate = function(member) {
      $scope.data[member.name] = [
        []
      ]
      $scope.labels[member.name] = []

      if ($scope.mm) {
          $scope.mm.updateData({
              participants: app.meeting.memberKeys,
              names: app.meeting.memberInitials,
              transitions: 0,
              turns: turns
          });
      }

      var maxTime = new Date() / 1000; //Math.max.apply(Object.keys(member.samples))
      var minTime = maxTime - $scope.historyLength;

      for (time in member.samples) {
        if (parseFloat(time) > minTime) {
          $scope.data[member.name][0].push(member.samples[time])
          $scope.labels[member.name].push(time * 1000);
        }
      }
      $scope.data[member.name][0].push(0)
      $scope.labels[member.name].push(maxTime * 1000)

    }
  });

  $scope.leaveMeeting = function() {
    $interval.cancel($scope.dataCollectionInterval);
    $interval.cancel($scope.shiftInterval);
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
            max: 200
          }
        }
      ]
    }
  };

});
