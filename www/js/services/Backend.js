angular.module('ngOpenBadge.services')

.factory('OBSBackend', function($http, $q, OBSThisHub, OBPrivate, OBSMyProject) {
    var BackendInterface = {}
    var base_url = OBPrivate.BASE_URL;

    BackendInterface.longTermRefresh = function() {
        return $http.get(base_url + 'projects').then(
            function got_projects( response )
            {
                OBSThisHub.create(data.hub)

                return "success"
            },
            function error_projects(response) {
                if (response.status == 404) {
                    return "not found"
                } else {
                    console.log(response)
                    return "error"
                }

            }
        )
    }

    BackendInterface.getForeignHubs = function(foreignHubs) {
        $http.get("http://api.randomuser.me/?results=8").then(
            function set_badge_info(response) {
                var results = response.data.results
                for (var i = 0; i < results.length; i++ ) {
                    foreignHubs.push({
                        location:results[i].location,
                        number:Math.floor(Math.random() * (6 - 2)) + 2,
                        device: Math.random() > 0.5 ? 'ion-social-apple' : 'ion-social-android'
                    })
                }
                console.log("Retrieved foreignHubs info: " + JSON.stringify(foreignHubs))
            }, function error(response) {
                console.log(JSON.stringify(response))
            })
    }

    BackendInterface.fillNameForBadge = function (badge) {
        $http.get("http://api.randomuser.me/?seed="+badge.address+"?inc=name,").then(
            function set_badge_info(response) {
                //console.log(JSON.stringify(response.data.results[0]))
                badge.owner = response.data.results[0].name.first + " " + response.data.results[0].name.last
                console.log("Retrieved badge info: " + JSON.stringify(badge))
            }, function error(response) {
                console.log(JSON.stringify(response))
                BackendInterface.fillNameForBadge(badge)
            })
    }

    BackendInterface.inviteEmailToMeeting = function(userJSON) {
        var user = JSON.parse(userJSON)
        console.log("Inviting " + user.name +
                    " at " + user.email);
    }

    return BackendInterface

})