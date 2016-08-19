angular.module('ngOpenBadge.services')

.factory('OBSBluetooth', function ($cordovaBluetoothLE, $q, $struct) {
    var BluetoothFactory = {};
    var CRITICAL_LOGGING = true
    var MODERATE_LOGGING = false

    // fake data that will be injected upon 'not supported' error.
    // set to [] on prod.
    var TESTING_DATA = [
      {
          owner:   "Jackson Kearl",
          address: "34:3C:74:7E:92:EA",
          battery: 'ion-battery-full',
          rssi:    -45,
          strength:'good'
      },
      {
          owner:   "Oren Lederman",
          address: "13:EC:29:4E:17:C7",
          battery: 'ion-battery-low',
          rssi:    -90,
          strength:'low'
      },
      {
          owner:   "عبد الحميد",
          address: "CE:18:5F:D4:6C:5B",
          battery: 'ion-battery-full',
          rssi:    -63,
          strength:'mild'
      },
      {
          owner:   "Getsina Yassa",
          address: "D6:6C:20:52:D3:A9",
          battery: 'ion-battery-half',
          rssi:    -45,
          strength:'good'
      },
      {
          owner:   "Paul Hager",
          address: "74:F7:AD:73:D0:DF",
          battery: 'ion-battery-half',
          rssi:    -45,
          strength:'good'
      },
    ]

    var scanPromise;

    BluetoothFactory.init = function() {
        if (MODERATE_LOGGING) console.log("INITING BLUETOOTH")
        return $cordovaBluetoothLE.initialize({request:true})
    }

    BluetoothFactory.startScan = function() {
        if (MODERATE_LOGGING) console.log("STARTING SCAN");

        if (typeof scanPromise !== "undefined")
            scanPromise.reject("Starting new Scan")

        scanPromise = $q.defer()

        params = {
            services:[],
            "allowDuplicates": false
        }

        $cordovaBluetoothLE.startScan(params).then(null,
            function startscan_error(obj) {
                if (CRITICAL_LOGGING)
                    console.log("Scan error", obj.message);
                if (TESTING_DATA) {
                  for (var i = 0; i < TESTING_DATA.length; i++) {
                    scanPromise.notify(TESTING_DATA[i])
                  }
                  scanPromise.reject(obj.message)
                }
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
                                owner:   badgeMap[obj.address],
                                address: obj.address,
                                battery: obj.battery,
                                rssi:    obj.rssi
                            }

                            if      (badge.rssi < -90) { badge.strength = 'low'  }
                            else if (badge.rssi < -60) { badge.strength = 'mild' }
                            else                       { badge.strength = 'good' }

                            scanPromise.notify(badge)
                        }
                    }
                }
                else if (obj.status === "scanStarted") {
                    // no affect on the scan promise, just wait
                    if (MODERATE_LOGGING)
                        console.log("Scan started")
                }
            });
        return scanPromise.promise;
    }

    BluetoothFactory.stopScan = function() {
        if (MODERATE_LOGGING) console.log("STOPPING SCAN");

        if (scanPromise)
            scanPromise.resolve("Stopping Scan")

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
