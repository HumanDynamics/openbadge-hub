angular.module('ngOpenBadge.services')

.factory('OBSThisHub', function() {
    var ThisHub = {
        name:"",
        lastUpdates:{},
        su:false
    }

    var LOGGING = true

    ThisHub.create = function(data) {
        if (LOGGING) console.log("giving my hub data:", data)

        ThisHub.name        = data.name
        ThisHub.lastUpdates = data.last_updates
        ThisHub.su          = data.su
    }

    return ThisHub
})
