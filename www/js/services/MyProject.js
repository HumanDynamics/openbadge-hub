angular.module('ngOpenBadge.services')

.factory('OBSMyProject', function() {
    var MyProject = {
        active_meetings:[],
        key:"",
        badge_map:{},
        members:{},
        name:""
    }

    MyProject.create = function(data) {
        MyProject = JSON.parse(data)
    }

    return MyProject
})
