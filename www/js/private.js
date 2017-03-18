angular.module('ngOpenBadge.private', [])

.factory('OBPrivate', function() {
    var PrivateData = {
        APP_KEY:"",
        BASE_URL:"http://openbadgedev.media.mit.edu/",
        DEVICE_UUID:"browser"
    }

    PrivateData.injectUUID = function(uuid) {
      PrivateData.DEVICE_UUID = uuid
    }

    return PrivateData
})
