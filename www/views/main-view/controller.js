angular.module('ngOpenBadge.contollers')

.controller('GroupViewCtrl', function($scope, $stateParams,
        $ionicModal, $ionicSideMenuDelegate, $timeout,
        OBSBackend, OBSThisMeeting, OBSMyProject, OBSThisHub) {

    $scope.localMembers   = {}
    $scope.activeMeetings = []
    $scope.projectName    = ""
    $scope.hubName        = ""
    $scope.projectKey     = ""

    $scope.configOptions  = {
      hubName: "",
      projectKey: "",
      projectName: "",
    }

    // With the new view caching in Ionic, Controllers are only called
    // when they are recreated or on app start, instead of every page change.
    // To listen for when this page is active (for example, to refresh data),
    // listen for the $ionicView.enter event:
    //
    $scope.$on('$ionicView.enter', function(e) {
        $scope.longTermRefresh()
    });

    $scope.longTermRefresh = function() {
        return OBSBackend.longTermRefresh().then(function () {
            $scope.localMembers   = OBSThisMeeting.localMembers
            $scope.activeMeetings = OBSMyProject.activeMeetings
            $scope.projectName    = OBSMyProject.name
            $scope.hubName        = OBSThisHub.name
            $scope.projectKey     = OBSMyProject.key

            $scope.configOptions.hubName     = $scope.hubName.slice(0)
            $scope.configOptions.projectKey  = $scope.projectKey.slice(0)
            $scope.configOptions.projectName = $scope.projectName.slice(0)
        }, function (error) {
          if (error == "not found") {
            $scope.openModal()
          } else {
            //cant contact for some reason?
            //TODO: load old data from local storage.
          }
        })
    }


    $scope.noLocalMembers = function() {
        return Object.keys($scope.localMembers).length === 0
    }

    $scope.noActiveMeetings = function() {
        return $scope.activeMeetings.length === 0
    }


    $ionicModal.fromTemplateUrl('configure-hub.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.modal = modal;
    });
    $scope.openModal = function() {
      $scope.modal.show();
    };
    $scope.closeModal = function() {
      $scope.modal.hide();

      $scope.configOptions.hubName     = $scope.hubName.slice(0)
      $scope.configOptions.projectKey  = $scope.projectKey.slice(0)
      $scope.configOptions.projectName = $scope.projectName.slice(0)
      $scope.configOptions.invalidKey  = false

    };
    $scope.configureHub = function() {
      OBSBackend.configureHub($scope.configOptions.hubName,
                              $scope.configOptions.projectKey).then(
        function () {
          $scope.configOptions.invalidKey = false
          $scope.longTermRefresh().then(
            $scope.closeModal
          )
        },
        function () {
          $scope.configOptions.invalidKey = true
        }
      )
    }

    // Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function() {
      $scope.modal.remove();
    });
})
