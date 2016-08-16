angular.module('ngOpenBadge.services')

.factory('OBSBluetooth', function ($cordovaBluetoothLE, $q, $struct) {
    var BluetoothFactory = {};
    var CRITICAL_LOGGING = true
    var MODERATE_LOGGING = false

    var scan_promise;

    BluetoothFactory.init = function() {
        if (MODERATE_LOGGING) console.log("INITING BLUETOOTH")
        return $cordovaBluetoothLE.initialize({request:true})
    }

    BluetoothFactory.startScan = function(badge_map) {
        if (MODERATE_LOGGING) console.log("STARTING SCAN");
        if (typeof badge_map === "undefined")
            badge_map = {}      //badge_map we get from the server

        if (typeof scan_promise !== "undefined")
            scan_promise.reject("Starting new Scan")

        scan_promise = $q.defer()

        params = {
            services:[],
            "allowDuplicates": false
        }

        $cordovaBluetoothLE.startScan(params).then(null,
            function startscan_error(obj) {
                if (CRITICAL_LOGGING)
                    console.log("Scan error", obj.message);
                scan_promise.reject(obj.message)
            },
            function startscan_notify(obj) {
                if (obj.status === "scanResult") {
                    if (obj.name === "BADGE") {
                        if (MODERATE_LOGGING)
                            console.log("Scan found " + obj.address)
                        if (obj.address in badge_map) {
                            BluetoothFactory.fillVoltageFromAdvertisement(obj)
                            // tell the promise that we found something
                            var badge = {
                                owner:   badge_map[obj.address],
                                address: obj.address,
                                battery: obj.battery,
                                rssi:    obj.rssi
                            }

                            if      (badge.rssi < -90) { badge.strength = 'low'  }
                            else if (badge.rssi < -60) { badge.strength = 'mild' }
                            else                       { badge.strength = 'good' }

                            scan_promise.notify(badge)
                        }
                    }
                }
                else if (obj.status === "scanStarted") {
                    // no affect on the scan promise, just wait
                    if (MODERATE_LOGGING)
                        console.log("Scan started")
                }
            });
        return scan_promise.promise;
    }

    BluetoothFactory.stopScan = function() {
        if (MODERATE_LOGGING) console.log("STOPPING SCAN");

        if (scan_promise)
            scan_promise.resolve("Stopping Scan")

        $cordovaBluetoothLE.stopScan().then(
            function stopscan_success(obj) {
                if (MODERATE_LOGGING)
                    console.log("Stop Scan Success : "+ JSON.stringify(obj));
            },
            function stopscan_error(obj) {
                if (CRITICAL_LOGGING)
                    console.log("Stop Scan Error : "+ JSON.stringify(obj));
            }
        );
    }

    BluetoothFactory.isScanning = function() {
        if (MODERATE_LOGGING) console.log("CHECKING SCAN");
        var deferredIsScannning = $q.defer()
        $cordovaBluetoothLE.isScanning().then(function(obj) {
            if (MODERATE_LOGGING)
                consiole.log("Is Scanning Success : " + JSON.stringify(obj));
            deferredIsScannning.resolve(obj.isScanning);
        });
        return deferredIsScannning.promise
    };

    BluetoothFactory.fillVoltageFromAdvertisement = function(badge) {
        var bytes;
        var dataString;
        if (badge.advertisement.manufacturerData) {  //ios
            bytes = $cordovaBluetoothLE.encodedStringToBytes(badge.advertisement.manufacturerData)
            dataString =  $cordovaBluetoothLE.bytesToString(bytes)
        } else {  // andriod
            bytes = $cordovaBluetoothLE.encodedStringToBytes(badge.advertisement)
            dataString =  $cordovaBluetoothLE.bytesToString(bytes).substring(18,26)
        }
        var badgeDataArray = $struct.Unpack('<HfBB', dataString)
        badge.voltage = badgeDataArray[1]
        if (MODERATE_LOGGING)
            console.log(badge.address + " has voltage " + badge.voltage);

        if      (badge.voltage < 2.4) { badge.battery = 'ion-battery-low'  }
        else if (badge.voltage < 2.6) { badge.battery = 'ion-battery-half' }
        else                          { badge.battery = 'ion-battery-full' }
    }

    return BluetoothFactory
})
