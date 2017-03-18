// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('ngOpenBadge', ['chart.js', 'ionic', 'ngCordova', 'ngOpenBadge.contollers', 'ngOpenBadge.services', 'ngOpenBadge.private'])

.run(function($ionicPlatform, $cordovaDevice, OBSBluetooth, OBPrivate, $http) {

  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs

    var uuid = "browser";
    try {
      uuid = $cordovaDevice.getUUID();
    } catch (ex) {
      console.log(ex);
    }

    console.log("settinge device uuid to:", uuid);
    OBPrivate.injectUUID(uuid);
    $http.defaults.headers.common['X-APPKEY'] = OBPrivate.APP_KEY;
    $http.defaults.headers.common['X-HUB-UUID'] = OBPrivate.DEVICE_UUID;

    OBSBluetooth.init().then();

    if (window.cordova && window.cordova.plugins) {
      if (window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        cordova.plugins.Keyboard.disableScroll(true);
      }
    }

    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleLightContent();
    }

  });
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
  // setup an abstract state for the side menu directive
    .state('app', {
    url: '/app',
    abstract: true,
    templateUrl: 'views/side-view/side.template.html',
    controller: 'SideMenusCtrl'
  })

  // Each tab has its own nav history stack:
  .state('app.group', {
    url: '/group',
    views: {
      'menuContent': {
        templateUrl: 'views/main-view/main.template.html',
        controller: 'GroupViewCtrl'
      }
    }
  })

  .state('app.meeting', {
    url: '/meeting',
    views: {
      'menuContent': {
        templateUrl: 'views/meeting-view/meeting.template.html',
        controller: 'MeetingCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/group');

});
