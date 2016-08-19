angular.module('ngOpenBadge.services')

.factory('OBSMyProject', function() {
    var MyProject = {}

    var LOGGING = true

    MyProject = {
        activeMeetings:[],
        key:"",
        badgeMap:{},
        members:{},
        name:""
    }

    MyProject.create = function(data) {
        if (LOGGING) console.log("giving my project data:", data)

        MyProject.activeMeetings = data.active_meetings
        MyProject.key            = data.key
        MyProject.badgeMap       = data.badgeMap
        MyProject.members        = data.members
        MyProject.name           = data.name
    }

    return MyProject
})
