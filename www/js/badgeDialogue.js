function Chunk() {
    //Represents a chunk
    var maxSamples = 114;

    this.ts = -1;
    this.ts_ms = 0;
    this.voltage = -1;
    this.sampleDelay = -1;
    this.numSamples = -1;
    this.samples = [];

    /**
    *Sets the header of the chunk
    *@param the timestamp of the chunk
    *@param the fraction (ms) of timestamp
    *@param voltage the voltage at the time the chunk was recorded
    *@param the sampleDelay of the chunk
    *@param the number of samples in this chunk
    */
    this.setHeader= function(ts, ts_ms, voltage, sampleDelay, numSamples) {
        this.ts = ts;
        this.ts_ms = ts_ms;
        this.voltage = voltage;
        this.sampleDelay = sampleDelay;
        this.numSamples = numSamples;
    }.bind(this);

    /*
     * @return the voltage of the chunk
     */
    this.getVoltage = function() {
        return this.voltage;
    }.bind(this);

    /*
     * @return the timestamp of the chunk
     */
    this.getTimeStamp = function () {
        return this.ts;
    }.bind(this);

    /*
     * @return the sampleDelay of the chunk
     */
    this.getSampleDelay = function () {
        return this.sampleDelay;
    }.bind(this);

    /*
     * @return the samples of this chunk
     */
    this.getSamples = function(){
        return this.samples;
    }.bind(this);

    /*
     * @param newData the byte array that represents more samples
     */
    this.addSamples = function(newData) {
        Array.prototype.push.apply(this.samples, newData);
        //this.samples = this.samples.concat(newData);
        if (this.samples.length > this.numSamples) {
            // error
            console.error("Too many samples in chunk!",this.samples.length);
        }

    }.bind(this);

    /*
     * resets a chunk to defaults settngs
     */
    this.reset = function () {
        this.ts = -1;
        this.ts_ms = 0;
        this.voltage = -1;
        this.sampleDelay = -1;
        this.numSamples = -1;
        this.samples = [];
    }.bind(this);


    /*
     * @return whether or not the chunk is full
     */
    this.completed = function() {
        return (this.samples.length >= this.numSamples);
    }.bind(this);

    this.toDict = function (member) {
        return {
            voltage:this.voltage,
            timestamp:this.ts + this.ts_ms/1000.0,
            sample_period:this.sampleDelay,
            num_samples:this.numSamples,
            samples:this.samples,
            badge_address: member.badgeId,
            member: member.key
    };
    }.bind(this);

    this.isFull = function() {
        return this.samples.length >= 114;
    }.bind(this);
}



function Scan() {
    //Represents a scan

    this.ts = -1;
    this.voltage = -1;
    this.numDevices = -1;
    this.scans = {};

    /**
    *Sets the header of the chunk
    *@param the timestamp of the chunk
    *@param the fraction (ms) of timestamp
    *@param voltage the voltage at the time the chunk was recorded
    *@param the sampleDelay of the chunk
    *@param the number of samples in this chunk
    */
    this.setHeader= function(ts, voltage, numDevices) {
        this.ts = ts;
        this.voltage = voltage;
        this.numDevices = numDevices;
    }.bind(this);

    /*
     * @return the voltage of the chunk
     */
    this.getVoltage = function() {
        return this.voltage;
    }.bind(this);

    /*
     * @return the timestamp of the chunk
     */
    this.getTimeStamp = function () {
        return this.ts;
    }.bind(this);

    /*
     * @return the scans in this chunk
     */
    this.getScans = function(){
        return this.scans;
    }.bind(this);

    /*
     * @param newData the byte array that represents more samples
     */
    this.addScans = function(newData) {
        //Array.prototype.push.apply(this.scans, newData);
        //this.samples = this.samples.concat(newData);

        for (var id in newData) {
          if (newData.hasOwnProperty(id)) {
            this.scans[id] = newData[id]
          }
        }


        if (Object.keys(this.scans).length> this.numDevices) {
            // error
            console.error("Too many samples in chunk!", Object.keys(this.scans).length);
        }

    }.bind(this);

    /*
     * resets a chunk to defaults settngs
     */
    this.reset = function () {
      this.ts = -1;
      this.voltage = -1;
      this.numDevices = -1;
      this.scans = {};
    }.bind(this);

    this.completed = function() {
      return Object.keys(this.scans).length >= this.numDevices;
    }

    this.toDict = function (member) {
        return {
            voltage:this.voltage,
            timestamp:this.ts,
            //num_devices:this.numDevices,
            rssi_distances:this.scans,
            member: member.key
    };
    }.bind(this);
}



/**
*Represents a badge dialogue for extracting structs
*@param badge badge object
*/
function BadgeDialogue(badge) {

    var struct = require('./struct.js').struct;
    this.badge = badge;

    this.workingChunk = null; //chunk we are currently building
    this.workingScanChunk = null;
    //this.chunks = []; //will store chunks once Received

    this.log = function(str) {
        //console.log(str);
        this.badge.log(str);
    }.bind(this);

    /**
     * updates the given badge with correct time and asks for status
     */
    this.sendStatusRequest = function() {
        //Set current time
        var d = new Date();
        var now = this.nowAsSecAndMs();
        this.log('Sending status request with epoch_seconds: ' + now.seconds+ ', ms: '+now.ms);

        var timeString = struct.Pack('<cLH',['s',now.seconds,now.ms]);
        this.badge.sendString(timeString);
    }.bind(this);

    /**
     * This gets called by the badge once the status request has been fulfilled
     */
    this.onStatusReceived = function(data) {
        var status = struct.Unpack('<BBBLHf',data); //clockSet,dataReady,recording,timestamp_sec,timestamp_ms,voltage
        this.log("Received a status update. Timestamp,ms,Voltage,recStatus: "+status[3]+' '+status[4]+' '+status[5]+' '+status[2]);

        return {clockSet: status[0],
                dataReady: status[1],
                recordStatus: status[2],
                timestamp:status[3],
                timestamp_ms:status[4],
                voltage: status[5]};
    }.bind(this);



    /**
     * sends a start recording request
     */
    this.sendStartRecRequest = function() {
        //Set current time
        var now = this.nowAsSecAndMs();
        this.log('Requesting badge to start recording. Epoch_seconds: ' + now.seconds+ ', ms: '+now.ms+", Timeout: "+RECORDING_TIMEOUT_MINUTES);

        var timeString = struct.Pack('<cLHH',['1',now.seconds,now.ms, RECORDING_TIMEOUT_MINUTES]);
        this.badge.sendString(timeString);
    }.bind(this);

    /**
     * This gets called by the badge once the recording request has been fulfilled
     */
    this.onRecordingAckReceived = function(data) {
        this.log("Received recording ack");
    }.bind(this);


    /**
     * sends an end recording request
     */
    this.sendEndRecRequestAndClose = function() {
        //Set current time
        var d = new Date();
        var now = this.nowAsSecAndMs();
        this.log('Requesting badge to end recording');

        var timeString = struct.Pack('<c',['0']);
        this.badge.sendStringAndClose(timeString);
    }.bind(this);

    /**
     * send request for data since given date
     */
    this.sendDataRequest = function(ts_seconds,ts_ms) {
        this.log('Requesting data since epoch_seconds: ' + ts_seconds+ ', ms: '+ts_ms);

        var timeString = struct.Pack('<cLH',['r',ts_seconds,ts_ms]);
        this.expectingHeader = true;
        this.badge.sendString(timeString);
    }.bind(this);

    /**
     * Once the device has determined it has received a header from the badge, it will call this
     */
    this.onHeaderReceived = function(data, callback) {
        this.log("Received a header: ");
        var header = struct.Unpack('<LHfHB',data); //time, fraction time (ms), voltage, sample delay, number of samples

        var timestamp = header[0];
        var timestamp_ms = header[1];
        var voltage = header[2];
        var sample_delay = header[3];
        var sample_count = header[4];

        if (voltage > 1 && voltage < 4) {
            //valid header?, voltage between 1 and 4
            this.log("&nbsp Timestamp " + header[0] + "."+header[1]);
            this.log("&nbsp Voltage " + header[2]);

            if (this.workingChunk && this.workingChunk.getTimeStamp() != timestamp) {
                // looks like the chunk we were working on is complete! Let's save it.
                //this.chunks.push(this.workingChunk);
                if (this.onChunkCompleted) {
                    this.onChunkCompleted(this.workingChunk);
                }
                //this.log("Added another chunk, I now have " + this.chunks.length + " full chunks");
            }

            this.workingChunk = new Chunk();
            this.workingChunk.setHeader(timestamp, timestamp_ms, voltage, sample_delay, sample_count);

            this.expectingHeader = false;

        } else if (timestamp_ms == 0) {
            this.log("End of data received, disconnecting");
            callback();
            //badge.close();
        } else {
            this.log("invalid header");
        }
    }.bind(this);

    /**
     * Once the badge has determined it has received volume data from the badge, it will call this
     */
    this.onDataReceived = function(data) {
        //parse as a datapacket
        var sample_arr = struct.Unpack("<" + data.length + "B", data);
        this.workingChunk.addSamples(sample_arr);

        if (this.workingChunk.completed()) {
            //we finished a chunk
            this.expectingHeader = true;
            if (this.onNewChunk) {
                this.onNewChunk(this.workingChunk);
            }

        }
    }.bind(this);


    /**
     * @returns the array of chunk objects that this badge has extracted
     */
    //this.getChunks = function () {
    //    return this.chunks;
    //}.bind(this);

    this.nowAsSecAndMs = function () {
        var d = new Date();
        var seconds = Math.floor(d.getTime()/1000);
        var ms = d.getTime() % 1000;
        return {'seconds':seconds, 'ms':ms};
    }

    /**
     * Returns the date of the last seen chunk (or a fake date, if no chunks)
     */
    this.getLastSeenChunkTs = function () {
        if (this.workingChunk) {
            this.log("Found chunk!");
            var c = this.workingChunk;
            return {'seconds':c.ts, 'ms':c.ts_ms};
        } else {
            this.log("No stored chunks. Using default date.");
            var now = this.nowAsSecAndMs();
            return {'seconds':now.seconds - 60, 'ms':now.ms};
        }
    }.bind(this);

    this.isHeader = function(data) {
        try {
            var header = struct.Unpack('<LHfHB',data);
            if (header[2] > 1 && header[2] < 4 || header[1] == 0) {
                return true;
            }
        } catch (e) {

        }
        return false;

    }.bind(this);

    this.clearData = function() {
        this.workingChunk = null;
        this.chunks = [];
    }.bind(this);


















        /**
         * sends a start recording request
         */
        this.sendStartScanRequest = function() {
            //Set current time
            var now = this.nowAsSecAndMs();
            this.log('Requesting badge to start scanning. Epoch_seconds: ' + now.seconds+ ', ms: '+now.ms+", Timeout: "+RECORDING_TIMEOUT_MINUTES);


            var scanWindow = 100
            var scanInterval = 300
            var scanDuration = 5   // how long each scan lasts
            var scanPeriod = 60    // how often to run a scan
            var recordingTimeout = 10
            var timeString = struct.Pack('<cLHHHHHH', ["p",now.seconds,now.ms, recordingTimeout,scanWindow, scanInterval,scanDuration,scanPeriod])

            this.badge.sendString(timeString);
        }.bind(this);

        /**
         * This gets called by the badge once the recording request has been fulfilled
         */
        this.onScanAckReceived = function(data) {
            this.log("Received scanning ack");
        }.bind(this);


        /**
         * sends an end recording request
         */
        this.sendEndScanRequestAndClose = function() {
            //Set current time
            var d = new Date();
            var now = this.nowAsSecAndMs();
            this.log('Requesting badge to end recording');

            var timeString = struct.Pack('<c',['q']);
            this.badge.sendStringAndClose(timeString);
        }.bind(this);

        /**
         * send request for data since given date
         */
        this.sendScanDataRequest = function(ts_seconds,ts_ms) {
            this.log('Requesting data since epoch_seconds: ' + ts_seconds+ ', ms: '+ts_ms);

            var timeString = struct.Pack('<cL',['b',ts_seconds]);
            this.expectingScanHeader = true;
            this.badge.sendString(timeString);
        }.bind(this);

        /**
         * Once the device has determined it has received a header from the badge, it will call this
         */
        this.onScanHeaderReceived = function(data) {
            this.log("Received a header: ");
            var header = struct.Unpack('<LfB',data); //time, voltage, number of devices seen

            var timestamp = header[0];
            var voltage = header[1];
            var number_devices_seen = header[2];

            if (voltage > 1 && voltage < 4) {
                //valid header?, voltage between 1 and 4
                this.log("&nbsp Timestamp " + header[0]);
                this.log("&nbsp Voltage " + header[1]);

                if (this.workingScanChunk && this.workingScanChunk.getTimeStamp() != timestamp) {
                    // looks like the chunk we were working on is complete! Let's save it.
                    //this.chunks.push(this.workingChunk);
                    if (this.onScanChunkCompleted) {
                        this.onScanChunkCompleted(this.workingScanChunk);
                    }
                    //this.log("Added another chunk, I now have " + this.chunks.length + " full chunks");
                }

                this.workingScanChunk = new Scan();
                this.workingScanChunk.setHeader(timestamp, voltage, number_devices_seen);

                this.expectingScanHeader = false;

            } else if (timestamp == 0) {
                this.log("End of data received, disconnecting");
                badge.close();
            } else {
                this.log("invalid header");
            }
        }.bind(this);

        /**
         * Once the badge has determined it has received scan data from the badge, it will call this
         */
        this.onScanDataReceived = function(data) {
            //parse as a datapacket
            var match = "Hbb"
            var toUnpack = ""
            for (var i = 0; i < Math.floor(data.length/4); i ++) {
              toUnpack += match
            }

            var scan_arr = struct.Unpack("<" + toUnpack, data);


            var unpacked = {}
            for (var i = 0; i < scan_arr.length; i+= 3 ) {
              var id = scan_arr[i]
              var rssi = scan_arr[i+1]
              var count = scan_arr[i+2]
              unpacked[id] = {
                 'rssi': rssi,
                 'scans': count
                }
            }

            this.workingScanChunk.addScans(unpacked);
            //console.log("workingScanChunk", this.workingScanChunk);


            if (this.workingScanChunk.completed()) {
                //we finished a chunk
                this.expectingScanHeader = true;
                if (this.onNewScanChunk) {
                    this.onNewScanChunk(this.workingScanChunk);
                }

            }
        }.bind(this);


        /**
         * Returns the date of the last seen chunk (or a fake date, if no chunks)
         */
        this.getLastSeenScanChunkTs = function () {
            if (this.workingScanChunk) {
                this.log("Found chunk!");
                var c = this.workingScanChunk;
                return {'seconds':c.ts, 'ms':0};
            } else {
                this.log("No stored chunks. Using default date.");
                var now = this.nowAsSecAndMs();
                return {'seconds':now.seconds - 120, 'ms':now.ms};
            }
        }.bind(this);

        this.isScanHeader = function(data) {
            try {
                var header = struct.Unpack('<LfB',data);
                if ((header[1] > 1 && header[1] < 4) || header[1] == 0) {
                    return true;
                }
            } catch (e) {

            }
            return false;

        }.bind(this);


};

exports.BadgeDialogue = module.exports = {
	BadgeDialogue: BadgeDialogue
};
