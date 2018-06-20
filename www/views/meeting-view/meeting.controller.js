angular.module('ngOpenBadge.contollers').controller('MeetingCtrl', function($scope, $state, $ionicHistory, $interval, OBSBluetooth, OBSBackend, OBSCurrentMeeting) {

  $scope.historyLength = 2 * 60;

  $scope.$on('$ionicView.enter', function(e) {
    window.plugins.insomnia.keepAwake()
    OBSCurrentMeeting.start();

    $scope.memberKeys = []
    $scope.memberNames = []

    var getObjectVals = function(obj) {
      var vals = [];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          vals.push(obj[key]);
        }
      }
      return vals;
    }

    var allbadges = getObjectVals(OBSCurrentMeeting.badgesInMeeting);

    for (var i= 0; i< allbadges.length; i++){
      $scope.memberKeys.push(allbadges[i].key)
      $scope.memberNames.push(allbadges[i].owner)
    }

    var $mmVis = $("#meeting-mediator");
    $mmVis.empty();
    $scope.mm = null;
    $scope.mm = new MM({
            participants: $scope.memberKeys,
            names: $scope.memberNames,
            // transitions: 0,
            turns: []
        },
        $scope.memberKeys[0],
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

    $scope.chartRedrawInterval = $interval( function () {
      var getObjectVals = function(obj) {
        var vals = [];
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            vals.push(obj[key]);
          }
        }
        return vals;
      }

      var allbadges = getObjectVals(OBSCurrentMeeting.badgesInMeeting);

      // this.displayVoltageLevels();

      var turns = [];
      var totalIntervals = 0;

      // calculate intervals
      var intervals = OBSCurrentMeeting.intervals;

      // update the chart
      $.each(allbadges, function(index, member) {
          // update cutoff and threshold
          member.dataAnalyzer.updateCutoff();
          member.dataAnalyzer.updateMean();
          //member.dataAnalyzer.updateSpeakThreshold();

          turns.push({participant:member.key, turns:intervals[index].length});
          totalIntervals += intervals[index].length;

      }.bind(this));


      $.each(turns, function(index, turn) {
          turn.turns = turn.turns / totalIntervals;
      });

      if ($scope.mm) {
          $scope.mm.updateData({
              participants: $scope.memberKeys,
              names: $scope.memberNames,
              transitions: 0,
              turns: turns
          });
      }
    }, 1000)

    OBSCurrentMeeting.onDataUpdate = function(member) {
      $scope.data[member.name] = [
        []
      ]
      $scope.labels[member.name] = []

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

  function onLeaveConfirm(buttonIndex) {
    // buttonIndex: 1 = OK, 2 = CANCEL
    if (buttonIndex === 1) {
      $interval.cancel($scope.shiftInterval);
      $interval.cancel($scope.chartRedrawInterval);
      OBSCurrentMeeting.leave("manual");
      console.log("left meeting");

      $ionicHistory.nextViewOptions({
        disableBack: true
      });
      $state.go('app.group');
    } else {
      // nothing to see here
      return;
    }
  }

  $scope.leaveMeetingConfirm = function() {
    navigator.notification.confirm(
      "Are you sure you want to end the meeting?",
      onLeaveConfirm,
      "End Meeting");
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
