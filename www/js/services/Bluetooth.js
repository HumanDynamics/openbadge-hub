angular.module('ngOpenBadge.services')

.factory('OBSBluetooth', function ($cordovaBluetoothLE, $q, $struct, $timeout, $interval, OBSMyProject) {
  var BluetoothFactory = {};
  var CRITICAL_LOGGING = true;
  var MODERATE_LOGGING = true;

  var nrf51UART = {
    serviceUUID:      '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // 0x000c?
    txCharacteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // transmit is from the phone's perspective
    rxCharacteristic: '6e400003-b5a3-f393-e0a9-e50e24dcca9e'  // receive is from the phone's perspective
  };

  // fake data that will be injected upon 'not supported' error.
  // set to [] on prod.
  var TESTING_DATA = [
    {
      address: "E3:09:E5:88:38:B2",
      battery: 'ion-battery-full',
      rssi:    -45,
      strength:'good'
    },
    {
      address: "D2:3C:F6:B9:87:24",
      battery: 'ion-battery-low',
      rssi:    -90,
      strength:'low'
    },
    {
      address: "E8:AB:1E:5D:08:C9",
      battery: 'ion-battery-full',
      rssi:    -63,
      strength:'mild'
    },
    {
      address: "EA:B6:FF:F8:35:A3",
      battery: 'ion-battery-half',
      rssi:    -45,
      strength:'good'
    },
    {
      address: "C1:10:9A:32:E0:C4",
      battery: 'ion-battery-half',
      rssi:    -45,
      strength:'good'
    },
    {
      address: "E3:26:AC:CD:0B:65",
      battery: 'ion-battery-full',
      rssi:    -45,
      strength:'good'
    },
    {
      address: "FA:DF:C3:8C:99:3C",
      battery: 'ion-battery-low',
      rssi:    -90,
      strength:'low'
    },
    {
      address: "DB:C8:1B:F8:B8:0F",
      battery: 'ion-battery-full',
      rssi:    -63,
      strength:'mild'
    },
    {
      address: "F2:74:78:84:E2:76",
      battery: 'ion-battery-half',
      rssi:    -45,
      strength:'good'
    },
    {
      address: "FB:29:43:AC:9B:70",
      battery: 'ion-battery-half',
      rssi:    -45,
      strength:'good'
    },
    {
      address: "EF:18:8D:7E:4C:F3",
      battery: 'ion-battery-half',
      rssi:    -45,
      strength:'good'
    },
  ];

  //TESTING_DATA = null;

  var scanPromise;

  BluetoothFactory.init = function() {
    if (MODERATE_LOGGING) console.log("INITING BLUETOOTH");
    return $cordovaBluetoothLE.initialize({request:true}).then(
      $cordovaBluetoothLE.requestPermission
    );
  };

  BluetoothFactory.startScan = function() {
    var badgeMap = OBSMyProject.members;

    if (MODERATE_LOGGING) console.log("STARTING SCAN");

    if (typeof scanPromise !== "undefined")
    scanPromise.reject("Starting new Scan");

    scanPromise = $q.defer();

    var params = {
      services:[],
      "allowDuplicates": false
    };

    $cordovaBluetoothLE.startScan(params).then(null,
      function startscan_error(obj) {
        if (CRITICAL_LOGGING)
        console.log("Scan error", obj.message);
        if (TESTING_DATA) {
          for (var i = 0; i < TESTING_DATA.length; i++) {
            var fakeFound = TESTING_DATA[i];
            if (fakeFound.address in badgeMap) {
              fakeFound.owner = badgeMap[fakeFound.address].name;
              fakeFound.key = badgeMap[fakeFound.address].key;
              scanPromise.notify(TESTING_DATA[i]);
            }
          }
          console.log("rejecting scan");
          scanPromise.reject(obj.message);
        }
      },
      function startscan_notify(obj) {
        if (obj.status === "scanResult") {
          if (obj.name === "BADGE") {
            if (MODERATE_LOGGING)
            console.log("Scan found " + obj.address);
            if (obj.address in badgeMap) {
              BluetoothFactory.fillVoltageFromAdvertisement(obj);
              // tell the promise that we found something
              var badge = {
                owner:   badgeMap[obj.address].name,
                key:     badgeMap[obj.address].key,
                address: obj.address,
                battery: obj.battery,
                rssi:    obj.rssi
              };

              if      (badge.rssi < -120) { badge.strength = 'low' ; }
              else if (badge.rssi < -70)  { badge.strength = 'mild'; }
              else                        { badge.strength = 'good'; }

              scanPromise.notify(badge);
            }
          }
        }
        else if (obj.status === "scanStarted") {
          // no affect on the scan promise, just wait
          if (MODERATE_LOGGING)
          console.log("Scan started");
        }
      }
    );
    return scanPromise.promise;
  };

  BluetoothFactory.stopScan = function() {
    if (MODERATE_LOGGING) console.log("STOPPING SCAN");

    if (scanPromise)
    scanPromise.resolve("Stopping Scan");

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
  };

  BluetoothFactory.isScanning = function() {
    if (MODERATE_LOGGING) console.log("CHECKING SCAN");
    var deferredIsScannning = $q.defer();
    $cordovaBluetoothLE.isScanning().then(function(obj) {
      if (MODERATE_LOGGING)
      console.log("Is Scanning Success : " + JSON.stringify(obj));
      deferredIsScannning.resolve(obj.isScanning);
    });
    return deferredIsScannning.promise;
  };

  BluetoothFactory.fillVoltageFromAdvertisement = function(badge) {
    var bytes;
    var dataString;
    if (badge.advertisement.manufacturerData) {  //ios
      bytes = $cordovaBluetoothLE.encodedStringToBytes(badge.advertisement.manufacturerData);
      dataString =  $cordovaBluetoothLE.bytesToString(bytes);
    } else {  // andriod
      bytes = $cordovaBluetoothLE.encodedStringToBytes(badge.advertisement);
      dataString =  $cordovaBluetoothLE.bytesToString(bytes).substring(18,26);
    }
    var badgeDataArray = $struct.Unpack('<HfBB', dataString);
    badge.voltage = badgeDataArray[1];

    if      (badge.voltage < 2.4) { badge.battery = 'ion-battery-low' ; }
    else if (badge.voltage < 2.6) { badge.battery = 'ion-battery-half'; }
    else                          { badge.battery = 'ion-battery-full'; }
  };

  BluetoothFactory.connect = function(badge) {
    badge.status = 'connecting';
    badge.connected  = 'never';
    var address = badge.address;
    // creates and attempts to maintain a connection with the given address.
    // timesout if over 5 seconds for first connect, or 10 for a reconnect

    var defer = $q.defer();

    var connectTimeout = $timeout( function () {
      defer.reject("connecting timedout to", badge);
      badge.status = 'connect timeout';

    }, 5000);

    $cordovaBluetoothLE.connect({address:address}).then(null,
      function(error) {
        badge.status = 'connect error';
        //Handle errors
        $timeout.cancel(connectTimeout);

        if (CRITICAL_LOGGING) console.log(error.message);
        defer.reject(error);
      },
      function(notif) {
        if (MODERATE_LOGGING) console.log(notif);

        if (notif.status == "connected") {
          badge.status = 'connected';
          badge.connected  = 'yes';
          $timeout.cancel(connectTimeout);

          defer.notify(notif);
        } else {
          // oops, we disconnected. Change to reconnecting.
          badge.status = 'disconnected';
          badge.connected  = 'no';
          $timeout.cancel(connectTimeout);
          BluetoothFactory.maintain(badge, defer);
        }
      }
    );

    return defer.promise;
  };

  BluetoothFactory.maintain = function(badge, defered) {
    var address = badge.address;
    badge.status = 'reconnecting';

    if (CRITICAL_LOGGING) console.log("Attempting to reconnect to", badge);

    var connectTimeout = $timeout( function () {
      defered.reject("reconnection timedout to", address);
      badge.connected = 'no';
      badge.status = 'reconnect timeout';
    }, 10000);

    $cordovaBluetoothLE.reconnect({address:address}).then(null,
      function (error) {
        badge.connected = 'no';
        badge.status = 'reconnect error';
        $timeout.cancel(connectTimeout);
        if (CRITICAL_LOGGING) console.log("Reconnect error:", error);
        defered.reject(error);
      },
      function (notif) {
        if (CRITICAL_LOGGING) console.log("Reconnect notification:", notif);
        $timeout.cancel(connectTimeout);
        defered.notify(notif);

        if (notif.status === "disconnected") {
          badge.connected = 'no';
          badge.status = 'needs reconnect';
          BluetoothFactory.maintain(badge, defered);
        } else {
          badge.connected = 'yes';
          badge.status = 'reconnected';
        }
      }
    );
    return defered;
  };

  BluetoothFactory.sendString = function (badge, string) {

    var bytes = $cordovaBluetoothLE.stringToBytes(string);
    var encodedString = $cordovaBluetoothLE.bytesToEncodedString(bytes);
    var paramsObj = {
      "address":badge.address,
      "service": nrf51UART.serviceUUID,
      "characteristic": nrf51UART.txCharacteristic,
      "value" : encodedString
    };

    return $cordovaBluetoothLE.write(paramsObj);
  };

  BluetoothFactory.sendStartRecordingRequest = function (badge) {
    var d  = new Date()/1000.0;
    var s  = Math.floor(d);
    var ms = d-s;
    var timeString = $struct.Pack('<cLH',['s',s,ms]);

    return BluetoothFactory.sendString(badge, timeString).then(function () {
      var d  = new Date()/1000.0;
      var s  = Math.floor(d);
      var ms = d-s;
      var startRecordString = $struct.Pack('<cLHH',['1',s,ms, 5]);

      badge.lastUpdate = d;

      return BluetoothFactory.sendString(badge,startRecordString);
    });
  };

  BluetoothFactory.collectData = function(badge) {

    if (badge.status !== "connected") {
      console.log("Badge is not conencted right now, postponing data collection");
      $timeout(function () {
        BluetoothFactory.collectData(badge);
      }, 1000);
      return;
    }

    var isHeader = function(data) {
      try {
        var header = $struct.Unpack('<LHfHB',data);
        if (header[2] > 1 && header[2] < 4 || header[1] == 0) { // jshint ignore:line
          return true;
        }
      } catch (e) { }
      return false;
    };

    var onHeaderReceived = function(data) {
      console.log("Received a header: ");
      var header = $struct.Unpack('<LHfHB',data); //time, fraction time (ms), voltage, sample delay, number of samples

      var timestamp    = header[0];
      var timestampMS  = header[1];
      var voltage      = header[2];
      var samplePeriod = header[3];
      var sampleCount  = header[4];

      if (voltage > 1 && voltage < 4) {
        //valid header?, voltage between 1 and 4
        console.log("Timestamp " + header[0] + "."+header[1]);
        console.log("Voltage " + header[2]);

        // if (badge.workingChunk && badge.workingChunk.timestamp != timestamp) {
        //   // looks like the chunk we were working on is complete! Let's save it.
        //   if (badge.onChunkCompleted) {
        //     badge.onChunkCompleted(badge.workingChunk);
        //   }
        //   //this.log("Added another chunk, I now have " + this.chunks.length + " full chunks");
        // }
        console.log("Creating a new chunk of data, to replace", badge.workingChunk);

        badge.workingChunk = {
          timestamp:    timestamp + timestampMS/1000.0,
          voltage:      voltage,
          samplePeriod: samplePeriod,
          sampleCount:  sampleCount,
          samples: []
        };
      }
    };

    var onDataReceived = function(data) {
      //parse as a datapacket
      var sampleArr = $struct.Unpack("<" + data.length + "B", data);
      Array.prototype.push.apply(badge.workingChunk.samples, sampleArr);

      if (badge.workingChunk.samples.length >= badge.workingChunk.sampleCount) {
        console.log("Finished a chunk of data", badge.workingChunk);
        badge.lastUpdate = badge.workingChunk.timestamp;

        if (badge.onChunkCompleted) {
          badge.onChunkCompleted(this.workingChunk);
        }
      }
    };

    var discoverDevice = function() {
      var address = badge.address;
      //console.log(address + "|Internal call to discover");
      var d = $q.defer();
      var paramsObj = {"address":address};
      $cordovaBluetoothLE.discover(paramsObj).then(
        function discovered(obj) { // success
          //console.log(address + "|Internal call to discover - success");
          if (obj.status == "discovered") {
            d.resolve(obj);
          } else {
            d.reject(obj);
          }
        },
        function disconver_err(obj) { // failure function
          d.reject(obj);
        });

        return d.promise;
      };

      var subscribeToDevice = function() {
        var address = badge.address;
        //console.log(address + "|Internal call to subscribe");
        var d = $q.defer();
        var paramsObj = {
          "address":address,
          "service": nrf51UART.serviceUUID,
          "characteristic": nrf51UART.rxCharacteristic,
          "isNotification" : true
        };

        $cordovaBluetoothLE.subscribe(paramsObj).then(null,
          function subscribed_err(obj) {
            d.reject(obj);
          },
          function subscribe_notif(obj) {
            d.notify(obj);
          });
          return d.promise;
        };

        var sendDataRequest = function() {
          var ts_seconds = Math.floor(badge.lastUpdate);
          var ts_ms = badge.lastUpdate%1;
          var timeString = $struct.Pack('<cLH',['r',ts_seconds,ts_ms]);
          return BluetoothFactory.sendString(badge, timeString);
        };

        discoverDevice().then(subscribeToDevice).then(
          null,
          function (error) {console.log(error);},
          function (notif) {
            console.log(notif);
            if (notif.status == "subscribeResult") {
              if (isHeader(notif)) {
                onHeaderReceived(notif);
              } else {
                onDataReceived(notif);
              }
            }
          }
        );

        badge.collectDataInterval = $interval(function () {
          console.log("Requesting recording data");
          sendDataRequest();
        }, 5000);

      };

      return BluetoothFactory;
    });
