angular.module('ngOpenBadge.contollers', ['ngOpenBadge.services'])

// .controller('GroupViewCtrl', function($scope, $stateParams, $ionicModal, $ionicSideMenuDelegate,
//         OBSBackend, OBSThisMeeting, OBSMyProject, OBSThisHub) {
//
//     $scope.localMembers   = {}
//     $scope.activeMeetings = []
//     $scope.projectName    = ""
//     $scope.hubName        = ""
//     $scope.projectKey     = ""
//
//     $scope.configOptions  = {
//       hubName: "",
//       projectKey: "",
//       projectName: "",
//     }
//
//     // With the new view caching in Ionic, Controllers are only called
//     // when they are recreated or on app start, instead of every page change.
//     // To listen for when this page is active (for example, to refresh data),
//     // listen for the $ionicView.enter event:
//     //
//     $scope.$on('$ionicView.enter', function(e) {
//         $scope.longTermRefresh()
//     });
//
//     $scope.longTermRefresh = function() {
//         OBSBackend.longTermRefresh().then(function () {
//             $scope.localMembers   = OBSThisMeeting.localMembers
//             $scope.activeMeetings = OBSMyProject.activeMeetings
//             $scope.projectName    = OBSMyProject.name
//             $scope.hubName        = OBSThisHub.name
//             $scope.projectKey     = OBSMyProject.key
//
//             $scope.configOptions.hubName     = $scope.hubName.slice(0)
//             $scope.configOptions.projectKey  = $scope.projectKey.slice(0)
//             $scope.configOptions.projectName = $scope.projectName.slice(0)
//         }, function (error) {
//           if (error == "not found") {
//             $scope.openModal()
//           } else {
//             //cant contact for some reason?
//             //TODO: load old data from local storage.
//           }
//         })
//     }
//
//
//     $scope.noLocalMembers = function() {
//         return Object.keys($scope.localMembers).length === 0
//     }
//
//     $scope.noActiveMeetings = function() {
//         return $scope.activeMeetings.length === 0
//     }
//
//
//     $ionicModal.fromTemplateUrl('configure-hub.html', {
//       scope: $scope,
//       animation: 'slide-in-up'
//     }).then(function(modal) {
//       $scope.modal = modal;
//     });
//     $scope.openModal = function() {
//       $scope.modal.show();
//     };
//     $scope.closeModal = function() {
//       $scope.modal.hide();
//
//       $scope.configOptions.hubName     = $scope.hubName.slice(0)
//       $scope.configOptions.projectKey  = $scope.projectKey.slice(0)
//       $scope.configOptions.projectName = $scope.projectName.slice(0)
//       $scope.configOptions.invalidKey  = false
//
//     };
//     $scope.configureHub = function() {
//       OBSBackend.configureHub($scope.configOptions.hubName,
//                               $scope.configOptions.projectKey).then(
//         function () {
//           $scope.configOptions.invalidKey = false
//           $scope.longTermRefresh()
//           $scope.closeModal()
//           $ionicSideMenuDelegate.toggleLeft()
//         },
//         function () {
//           $scope.configOptions.invalidKey = true
//         }
//       )
//     }
//
//     // Cleanup the modal when we're done with it!
//     $scope.$on('$destroy', function() {
//       $scope.modal.remove();
//     });
// })
//
// .controller('SideMenusCtrl', function($scope, $timeout, $interval,
//                                       $ionicSideMenuDelegate,
//                                       OBSBluetooth, OBSBackend, OBSThisMeeting) {
//
//     $scope.foundBadgesIndex = {}
//     $scope.foundBadges = []
//     $scope.isScanning = true
//
//     // monitor our side menus and trigger events like scanning when theyre opened
//     $scope.$watch(function () {
//       return $ionicSideMenuDelegate.getOpenRatio();
//     }, function (ratio) {
//         if (ratio === 0 ) {
//             // we're in the middle
//
//             // should we clear foundBadges here? Possibly.
//             //   currently we dont because the pull to refresh will
//             $scope.resetTimer(0);
//         }
//         else if ( ratio === 1 ) {
//             $scope.startScan()
//             // the left menu is open
//         }
//
//     });
//
//     $scope.resetScan = function() {
//         $scope.foundBadgesIndex = {}
//         $scope.foundBadges = []
//         $scope.startScan()
//     }
//
//     $scope.startScan = function() {
//
//         // if we dont have a badge in first 10 sec, give up.
//         // TODO: Should also notify that we cant find anything.
//         $scope.resetTimer(10000)
//         $scope.$broadcast('scroll.refreshComplete');
//         OBSBluetooth.startScan().then(null,
//             function startscan_error(message) {
//                 console.log(message)
//             },
//             function startscan_notify(badge) {
//                 // we found a badge, lets add it to our list
//
//                 console.log("found a badge!", badge)
//
//                 if (badge.address in $scope.foundBadgesIndex) {
//                     var localBadge = $scope.foundBadges[$scope.foundBadgesIndex[badge.address]]
//
//                     localBadge.strength = badge.strength
//                     localBadge.battery  = badge.battery
//                     //localBadge.rssi  = badge.rssi
//                     // maybe not update rssi to keep order ~constant
//
//                 } else {
//                     $scope.foundBadgesIndex[badge.address] = $scope.foundBadges.length
//                     $scope.foundBadges.push(badge)
//                     // give ourselves a little more time
//                     $scope.resetTimer(10000)
//                 }
//             })
//     }
//
//     // extend the time until we close our scan
//     // NOTE: this will *not* do anything if the scan is already closed
//     $scope.resetTimer = function(ms, callback) {
//         $scope.isScanning = true
//         if ($scope.stopScanTimer)
//             $timeout.cancel($scope.stopScanTimer)
//
//         $scope.stopScanTimer =  $timeout(
//             function scan_timeout() {
//                 OBSBluetooth.stopScan();
//                 $scope.isScanning = false
//
//                 if (typeof callback === 'function')
//                     callback()
//             }, ms)
//     }
//
//     $scope.badgeIsInGroup = function (badge) {
//         return (badge.address in OBSThisMeeting.localMembers)
//     }
//
//     $scope.toggleMember = function (badge) {
//         var localBadge = JSON.stringify(badge)
//         if ($scope.badgeIsInGroup(badge)) {
//             console.log("removing " + localBadge + " from group");
//             OBSThisMeeting.removeLocalBadge(localBadge)
//         }
//         else {
//             console.log("adding " + localBadge + " to group");
//             OBSThisMeeting.addLocalBadge(localBadge)
//         }
//     }
// })
//
// // .controller('MeetingDetailsCtl', function($scope, $stateParams) {
// //
// // })
//
// .controller('MeetingCtrl', function($scope, OBSBluetooth, OBSBackend, OBSFileSystem, OBSThisMeeting) {})
//
