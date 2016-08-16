angular.module('ngOpenBadge.private', [])

.factory('OBPrivate', function() {
    PrivateVariables = {}
    PrivateVariables.APP_KEY = "secret!"
    PrivateVariables.BASE_URL = "http://openbadgedev2.media.mit.edu/"
    PrivateVariables.DEVICE_UUID = "browser-uuid"
    return PrivateVariables
})