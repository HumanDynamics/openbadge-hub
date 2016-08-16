angular.module('ngOpenBadge.services')

.factory('OBSThisHub', function() {
    var ThisHub = {
        name:"",
        last_updates:{},
        su:false
    }

    ThisHub.create = function(data) {
        ThisHub = JSON.parse(data)
    }

    return ThisHub
})
