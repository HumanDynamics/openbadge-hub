angular.module('ngOpenBadge.services')

.factory('OBSThisMeeting', function() {
    var ThisMeeting = {};

    ThisMeeting.id = 0
    ThisMeeting.localMembers   =  {}
    ThisMeeting.activeMeetings =  {}

    ThisMeeting.create = function(newGroupJSON) {
        var newGroup = JSON.parse(newGroupJSON)

        ThisMeeting.localMembers = newGroup.localMembers
        ThisMeeting.foreignHubs  = newGroup.foreignHubs
        ThisMeeting.foreignSolo  = newGroup.foreignSolo

        ThisMeeting.name  = newGroup.name
        ThisMeeting.id    = newGroup.id
    }

    ThisMeeting.addLocalBadge = function(badgeJSON) {
        var badge = JSON.parse(badgeJSON)
        ThisMeeting.localMembers[badge.owner] = badge
    }

    ThisMeeting.removeLocalBadge = function(badgeJSON) {
        var badge = JSON.parse(badgeJSON)

        if (badge.owner in ThisMeeting.localMembers)
            delete ThisMeeting.localMembers[badge.owner]
    }

    ThisMeeting.addForeignHub = function(foreignHubJSON) {
        var hub = JSON.parse(foreignHubJSON)
        ThisMeeting.foreignHubs[JSON.stringify(hub.location)] = hub
    }

    ThisMeeting.removeForeignHub = function(foreignHubJSON) {
        var hub = JSON.parse(foreignHubJSON)

        if (JSON.stringify(hub.location) in ThisMeeting.foreignHubs)
            delete ThisMeeting.foreignHubs[JSON.stringify(hub.location)]
    }

    ThisMeeting.toJSON = function() {
        return JSON.stringify({name:ThisMeeting.name,
                               uuid:ThisMeeting.id,
                       localMembers:ThisMeeting.localMembers,
                        foreignHubs:ThisMeeting.foreignHubs})
    }

    return ThisMeeting
})
