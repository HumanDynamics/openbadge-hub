/*
All interactiaons with the badges and the cordovaBlueetoothLE plugin should happen
  through here.
*/

angular.module('ngOpenBadge.services').factory('OBSBluetooth', function($cordovaBluetoothLE, $q, $struct, $timeout, $interval, OBSMyProject) {
  var BluetoothFactory = {};
  var CRITICAL_LOGGING = true;
  var MODERATE_LOGGING = true;

  var nrf51UART = {
    serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // 0x000c?
    txCharacteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // transmit is from the phone's perspective
    rxCharacteristic: '6e400003-b5a3-f393-e0a9-e50e24dcca9e' // receive is from the phone's perspective
  };

  // first step when using bluetooth, have to make sure its on and stuff
  BluetoothFactory.init = function() {
    if (MODERATE_LOGGING)
      console.log("INITING BLUETOOTH");
    return $cordovaBluetoothLE.initialize({request: true}).then(null, null,
    // update = recieved permissions (hopefully)
    // this will fail on iPhone. Hopefully we can roll with it.
    $cordovaBluetoothLE.requestPermission);
  };

  var scanPromise;
  // start a scan, notify about badge objects {voltage, owner, name, rssi, etc}
  BluetoothFactory.startScan = function() {
    var badgeMap = OBSMyProject.badgeMap;

    if (MODERATE_LOGGING)
      console.log("STARTING SCAN");

    if (typeof scanPromise !== "undefined")
      scanPromise.reject("Starting new Scan");

    scanPromise = $q.defer();

    var unpackBroadcast = function(data) {

      function bin2String(array) {
        var result = "";
        for (var i = 0; i < array.length; i++) {
          result += String.fromCharCode(parseInt(array[i], 10));
        }
        return result;
      }

      var DEVICE_NAME_FIELD_ID = 9;
      var BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME = 0x08;
      var BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME = 0x09;
      var BLE_GAP_AD_TYPE_MANUFACTURER_SPECIFIC_DATA = 0xFF;
      var CUSTOM_DATA_LEN = 14; // length of badge custom data adv
      var MAC_LENGTH = 6; // length of a MAC address

      var data_length = data.length;
      var index = 0;
      var name = null;
      var field_len;
      var adv_payload = null;

      while (adv_payload === null && index < data.length) {
        // console.log("index:", index)
        field_len = $struct.Unpack('<B', data[index])[0];
        // console.log("field_len is:", field_len);
        index += 1;

        var field_type = $struct.Unpack('<B', data[index])[0];
        // console.log("field_type is:", field_type);
        index += 1;
        // is it a name field?
        if (field_type == BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME || field_type == BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME) {
          var name_field = data.slice(index, index + field_len);
          var name_as_bytes = $struct.Unpack('<' + name_field.length + 'B', name_field);
          name = bin2String(name_as_bytes)// is it the adv payload?; // converts byte to string
        } else if (field_type == BLE_GAP_AD_TYPE_MANUFACTURER_SPECIFIC_DATA) {
          if (field_len == CUSTOM_DATA_LEN) {
            var payload_field = data.slice(index, index + field_len);

            var payload = $struct.Unpack('<HBBHB' + MAC_LENGTH + 'B', payload_field);
            // console.log(payload);

            adv_payload = {};
            adv_payload.voltage = 1 + 0.01 * payload[1];
            adv_payload.status_flags = payload[2];
            adv_payload.badge_id = payload[3];
            adv_payload.project_id = payload[4];

            // Check if the 1st bit is set
            var sync_status = adv_payload.status_flags & 1;
            adv_payload.sync_status = sync_status;

            // Check if the 2nd bit is set:
            var audio_status = adv_payload.status_flags & 2;
            adv_payload.audio_status = audio_status;

            // Check if the 3rd bit is set:
            var proximity_status = adv_payload.status_flags & 4;
            adv_payload.proximity_status = proximity_status;

            var mac = "";
            for (var i = 10; i >= 5; i--) {
              mac += ('00' + (payload[i]).toString(16)).slice(-2);
              if (i > 5)
                mac += ":";
              }
            adv_payload.mac = mac.toUpperCase();
          }
        }

        // advance to next field
        index += field_len - 1;
      }
      return adv_payload;
    };

    $cordovaBluetoothLE.startScan({services: []}).then(null, function startscan_error(obj) {
      if (CRITICAL_LOGGING)
        console.log("Scan error", obj.message);
      }
    , function startscan_notify(obj) {
      if (obj.status === "scanResult") {

        if (obj.name === "HDBDG") {

          if (MODERATE_LOGGING)
            console.log("Scan found " + obj.address);
          if (obj.address in badgeMap) {

            var adbytes = $cordovaBluetoothLE.encodedStringToBytes(obj.advertisement);
            var adStr = $cordovaBluetoothLE.bytesToString(adbytes);
            var adBadgeData = unpackBroadcast(adStr);

            // tell the promise that we found something
            adBadgeData.owner = badgeMap[obj.address].name;
            adBadgeData.key = badgeMap[obj.address].key;
            adBadgeData.address = obj.address;

            adBadgeData.rssi = obj.rssi;

            if (adBadgeData.rssi < -120) {
              adBadgeData.strength = 'low';
            } else if (adBadgeData.rssi < -70) {
              adBadgeData.strength = 'mild';
            } else {
              adBadgeData.strength = 'good';
            }

            if (adBadgeData.voltage > 2.7) {
              adBadgeData.battery = 'ion-battery-full';
            } else if (adBadgeData.voltage > 2.4) {
              adBadgeData.battery = 'ion-battery-half';
            } else {
              adBadgeData.battery = 'ion-battery-empty';
            }

            scanPromise.notify(adBadgeData);
          }
        }
      } else if (obj.status === "scanStarted") {
        // no affect on the scan promise, just wait
        if (MODERATE_LOGGING)
          console.log("Scan started");
        }
      });
    return scanPromise.promise;
  };

  // stop the scan, cancel the scanPromise
  BluetoothFactory.stopScan = function() {
    if (MODERATE_LOGGING)
      console.log("STOPPING SCAN");

    if (scanPromise)
      scanPromise.resolve("Stopping Scan");

    $cordovaBluetoothLE.stopScan().then(function stopscan_success(obj) {
      if (MODERATE_LOGGING)
        console.log("Stop Scan Success : ", obj);
      }
    , function stopscan_error(obj) {
      if (CRITICAL_LOGGING)
        console.log("Stop Scan Error : ", obj);
      }
    );
  };

  // is the hub currently engaged in a scan?
  BluetoothFactory.isScanning = function() {
    if (MODERATE_LOGGING)
      console.log("CHECKING SCAN");
    var deferredIsScannning = $q.defer();
    $cordovaBluetoothLE.isScanning().then(function(obj) {
      if (MODERATE_LOGGING)
        console.log("Is Scanning Success : ", obj);
      deferredIsScannning.resolve(obj.isScanning);
    });
    return deferredIsScannning.promise;
  };

  // call this each time we connect and disconnect, to make sure we know whats going on
  //   with the badge. Calls a badge.onSubscription function with the subscription notif on
  //   notification.
  BluetoothFactory.discoverAndSubscribe = function(badge) {
    var discoverDevice = function() {
      var address = badge.address;
      //console.log(address + "|Internal call to discover");
      var d = $q.defer();
      var paramsObj = {
        "address": address
      };
      $cordovaBluetoothLE.discover(paramsObj).then(function discovered(obj) { // success
        //console.log(address + "|Internal call to discover - success");
        if (obj.status == "discovered") {
          d.resolve(obj);
        } else {
          d.reject(obj);
        }
      }, function disconver_err(obj) { // failure function
        d.reject(obj);
      });

      return d.promise;
    };

    var subscribeToDevice = function() {
      var address = badge.address;
      //console.log(address + "|Internal call to subscribe");
      var d = $q.defer();
      var paramsObj = {
        "address": address,
        "service": nrf51UART.serviceUUID,
        "characteristic": nrf51UART.rxCharacteristic,
        "isNotification": true
      };

      $cordovaBluetoothLE.subscribe(paramsObj).then(null, function subscribed_err(obj) {
        console.log("error! ", obj)
        d.reject(obj);
      }, function subscribe_notif(obj) {
        d.notify(obj);
      });
      return d.promise;
    };

    var defer = $q.defer();

    console.log("Subscribing to", badge.address);
    discoverDevice().then(subscribeToDevice).then(null,
      function(error) {
        if (CRITICAL_LOGGING)
          console.log("subscription error!", error.address, error.message);
      },
      function(notif) {
        //if (MODERATE_LOGGING) console.log("got subscription update from " + badge.address, notif.value);
        if (notif.status !== "subscribedResult") {
          defer.notify("start");
        }
        defer.notify(notif);
        if (badge.onSubscription) {
          badge.onSubscription(notif);
        }
    });

    return defer.promise;
  };

  // start a long standing connection to badge. in the event this connection dies,
  //   it will call `maintain` in order to keep the connection going
  BluetoothFactory.connect = function(badge) {

    var address = badge.address;
    // creates and attempts to maintain a connection with the given address.
    // timesout if over 5 seconds for first connect, or 10 for a reconnect
    console.log("Connecting to", badge);
    var defer = $q.defer();

    var connectTimeout = $timeout(function() {
      console.log("The connection to", badge.address, "has timedout");
      BluetoothFactory.endConnection(badge)
      defer.reject("connecting timedout to", badge);
    }, 60 * 1000);

    $cordovaBluetoothLE.connect({address: address}).then(null,
      function(error) {
        //Handle errors
        $timeout.cancel(connectTimeout);
        if (CRITICAL_LOGGING) {
          console.log("Error connecting: ", address, error.message);
        }
      },
      function(notif) {
        console.log("connection notification: ", notif.address, notif.status);

        if (notif.status == "connected") {
          console.log("still connected??")
          $timeout.cancel(connectTimeout);

          defer.notify(true);

        } else {
          // oops, we disconnected. Change to reconnecting.
          console.log("DISCONNECT")
          $timeout.cancel(connectTimeout);
          // we have to wait a tiny bit due to android bluetooth bugs
          // when attempting to reconnect after a disconnect
          $timeout(function() {
            console.log("attempting to reconnect to ", badge.address)
            BluetoothFactory.maintain(badge, defer);
          }, 500)
          // defer.notify(false);

        }
      }
    );

    return defer.promise;
  };

  // keep calling `reconnect` in order to keep a badge that was once connected still connected
  BluetoothFactory.maintain = function(badge, defered) {
    var address = badge.address;

    console.log("bluetooth maintain: ", badge.address)
    if (MODERATE_LOGGING) {
      console.log("Attempting to reconnect to", badge.address);
    }

    var connectTimeout = $timeout(function() {
      console.log("The maintnence to", badge.address, "has timedout");
      BluetoothFactory.endConnection(badge)
      defered.reject("reconnection timedout to", address);
    }, 60 * 10 * 1000);

    $cordovaBluetoothLE.reconnect({address: address}).then(null,
      function(error) {
        $timeout.cancel(connectTimeout);
        if (CRITICAL_LOGGING) {
          console.log("Reconnect error:", error);
        }
        console.log("error. trying to reconnect again");
        //try again pls
        BluetoothFactory.maintain(badge, defered);
        defered.notify(false);
      },
      function(notif) {
        if (CRITICAL_LOGGING) {
          console.log("Reconnect notification:", notif.address, notif.status);
        }
        $timeout.cancel(connectTimeout);

        if (notif.status === "disconnected") {
          BluetoothFactory.maintain(badge, defered);
          defered.notify(false);
        } else {
          console.log("reconnect success", badge.address)
          defered.notify(true);
        }
      }
    );

    // return defered;
  };

  BluetoothFactory.sendString = function(badge, string) {

    var bytes = $cordovaBluetoothLE.stringToBytes(string);
    var encodedString = $cordovaBluetoothLE.bytesToEncodedString(bytes);
    var paramsObj = {
      "address": badge.address,
      "service": nrf51UART.serviceUUID,
      "characteristic": nrf51UART.txCharacteristic,
      "value": encodedString
    };

    return $cordovaBluetoothLE.write(paramsObj);
  };

  BluetoothFactory.sendStartRecordingRequest = function(badge) {
    var d = new Date() / 1000.0;
    var s = Math.floor(d);
    var ms = d - s;
    // status update for badge
    if (!badge.lastUpdate)
      badge.lastUpdate = d;
    var startRecordString = $struct.Pack('<cLHH', ['1', s, ms, 5]);
    if (MODERATE_LOGGING)
      console.log("Sent a start recording request to ", badge.address);
    return BluetoothFactory.sendString(badge, startRecordString).then(function() {
      var d = new Date() / 1000.0;
      var s = Math.floor(d);
      var ms = d - s;
      // start recording command
      var timeString = $struct.Pack('<cLH', ['s', s, ms]);
      if (MODERATE_LOGGING)
        console.log("Sent a status update to ", badge.address);
      return BluetoothFactory.sendString(badge, timeString);
    });
  };

  // connect to badge and set up functions and
  //   listener things for hearing what the badge tells us.
  BluetoothFactory.initializeBadgeBluetooth = function(badge) {
    BluetoothFactory.connect(badge). // start a long standing, self-recovering connection
    then(null, function() {
      if (!badge.hasConnected) {
        console.log("recursively attempting to connect... heregoes");
        BluetoothFactory.initializeBadgeBluetooth(badge);
      }
    }, function(connected) {
      if (connected) {
        badge.hasConnected = true;
        // send a message to start recording.
        // we should discover and stuff here too.
        if (!badge.onSubscription) {
          console.log("creating onSubscription for", badge.address);
          BluetoothFactory.configureOnSubscribe(badge);
        }
        BluetoothFactory.discoverAndSubscribe(badge).then(null, null, function(notif) {
          if (notif === "start") {
            BluetoothFactory.sendStartRecordingRequest(badge);
          }
        });
      }
    });
  };

  BluetoothFactory.endConnection = function(badge) {
    if (badge.dataCollectionInterval) {
      $interval.cancel(badge.dataCollectionInterval);
    }
    return $cordovaBluetoothLE.close({address: badge.address})
      .then( function() {
      console.log("Closed connection to", badge);
      })
  }

  // create badge's onSubscribe function, which parses subscription data
  BluetoothFactory.configureOnSubscribe = function(badge) {

    var onHeaderReceived = function(data) {
      var header = $struct.Unpack('<LHfHB', data); //time, fraction time (ms), voltage, sample delay, number of samples

      var timestamp = header[0];
      var timestampMS = header[1];
      var voltage = header[2];
      var samplePeriod = header[3];
      var sampleCount = header[4];

      if (voltage > 1 && voltage < 4) {
        badge.workingChunk = {
          timestamp: timestamp + timestampMS / 1000.0,
          voltage: voltage,
          samplePeriod: samplePeriod,
          sampleCount: sampleCount,
          samples: []
        };
      }
    };

    var onDataReceived = function(data) {

      var sampleArr = $struct.Unpack("<" + data.length + "B", data);

      if (badge.workingChunk) {
        Array.prototype.push.apply(badge.workingChunk.samples, sampleArr);

        if (badge.workingChunk.samples.length >= badge.workingChunk.sampleCount) {
          badge.lastUpdate = badge.workingChunk.timestamp;

          if (badge.onChunkCompleted && badge.workingChunk.sampleCount === 114) {
            badge.onChunkCompleted(badge.workingChunk, "audio recieved");
          }
        }
      }
    };

    if (badge.dataCollectionInterval) {
      $interval.cancel(badge.dataCollectionInterval);
    }

    badge.dataCollectionInterval = $interval(function() {
      var ts_seconds = Math.floor(badge.lastUpdate);
      var ts_ms = badge.lastUpdate % 1;
      var timeString = $struct.Pack('<cLH', ['r', ts_seconds, ts_ms]);
      console.log("Requesting sample data since", badge.lastUpdate);
      return BluetoothFactory.sendString(badge, timeString);
    }, 5000);

    badge.onSubscription = function(notif) {
      if (notif && notif.status == "subscribedResult") {

        var bytes = bluetoothle.encodedStringToBytes(notif.value);
        var str = bluetoothle.bytesToString(bytes);

        // test that the data can be parsed as a header, which means it is in the right format,
        //   and has a valid voltage (or null, signifying the closing header (i.e. footer))
        var isHeader = function(data) {
          try {
            var header = $struct.Unpack('<LHfHB', data);
            if (header[2] > 1 && header[2] < 4 || header[1] == 0) { // jshint ignore:line
              return true;
            }
          } catch (e) {}
          return false;
        };

        if (isHeader(str)) {
          onHeaderReceived(str);
        } else {
          onDataReceived(str);
        }
      }
    };
  };

  return BluetoothFactory;
});
