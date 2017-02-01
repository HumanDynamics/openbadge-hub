window.gitRevision = "b7c7ae3";
window.gitRevision = "b7c7ae3";
window.gitRevision = "b7c7ae3";
window.gitRevision = "b7c7ae3";
window.gitRevision = "b7c7ae3";
window.gitRevision = "b7c7ae3";
window.gitRevision = "b7c7ae3";
window.gitRevision = "e485c7d";
window.gitRevision = "00d2559";
window.gitRevision = "00d2559";
window.gitRevision = "00d2559";
window.gitRevision = "00d2559";
Object.assign = require('object-assign')
require('q');
const RhythmClient = require('rhythm-client');
Array.from = require('array.from');
var qbluetoothle = require('./qbluetoothle');
var Badge = require('./badge');
struct = require('./struct.js').struct;

window.LOCALSTORAGE_GROUP_KEY = "groupkey";
window.LOCALSTORAGE_GROUP = "groupjson";

window.LOCALSTORAGE_PROJECT    = "projectJSON"

window.BADGE_SCAN_INTERVAL = 9000;
window.BADGE_SCAN_DURATION = 8000;

window.WATCHDOG_SLEEP = 5000;

window.LOG_SYNC_INTERVAL = 10 * 1000;
window.CHART_UPDATE_INTERVAL = 5 * 1000;
window.DEBUG_CHART_WINDOW = 1000 * 60 * 5;

window.CHECK_BLUETOOTH_STATUS_INTERVAL = 5 * 60 * 1000; //how often to just try to enable bluetooth. separate from the warning system.
window.CHECK_MEETING_LENGTH_INTERVAL = 3 * 60 * 60 * 1000;
window.CHECK_MEETING_LENGTH_REACTION_TIME = 5 * 60 * 1000;

window.DATA_DELAY_INTERVAL = 20 * 1000; // when calculating data, what delay to assume


BATTERY_YELLOW_THRESHOLD = 2.6;
BATTERY_RED_THRESHOLD = 2.4;

BLUETOOTH_OFF_WARNING_TIMEOUT = 5 * 60 * 1000; // if you haven't see bluetooth in this long, send a warning
BLUETOOTH_OFF_WARNING_INTERVAL = 5 * 1000; // how often to check for bluetooth to give the warning
NO_BADGE_SEEN_WARNING_TIMEOUT = 5 * 60 * 1000; // if you haven't seen a badge in this long, send a warning
NO_BADGE_SEEN_WARNING_INTERVAL = 5 * 1000; // how often to check for badges for the warning

RECORDING_TIMEOUT_MINUTES = 5;

window.SHOW_BADGE_CONSOLE = false;


//
// set to false in the real app, or keep true if we're okay with
//   SLOANers possibly guessing to type "EXPLORE" into the groupID field
//   and getting access to our debug mode
//
DEBUG_MODE_ENABLED = true
groupID = "EXPLORE"
FREE_MEET = true
VISUALIZATION = true


// Polyfill Array find
// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
        value: function(predicate) {
            // 1. Let O be ? ToObject(this value).
            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }

            var o = Object(this);

            // 2. Let len be ? ToLength(? Get(O, "length")).
            var len = o.length >>> 0;

            // 3. If IsCallable(predicate) is false, throw a TypeError exception.
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }

            // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
            var thisArg = arguments[1];

            // 5. Let k be 0.
            var k = 0;

            // 6. Repeat, while k < len
            while (k < len) {
                // a. Let Pk be ! ToString(k).
                // b. Let kValue be ? Get(O, Pk).
                // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
                // d. If testResult is true, return kValue.
                var kValue = o[k];
                if (predicate.call(thisArg, kValue, k, o)) {
                    return kValue;
                }
                // e. Increase k by 1.
                k++;
            }

            // 7. Return undefined.
            return undefined;
        }
    });
}


/***********************************************************************
 * Model Declarations
 */

/**
 * Group Model
 * Holds the data of a group, constructed from json data from the server
 */
function Group(groupJson) {
    //console.log(groupJson)
    this.name = groupJson.name;
    this.key = groupJson.key;
    this.visualization_ranges = groupJson.visualization_ranges;
    this.members = [];
    for (var i = 0; i < groupJson.members.length; i++) {
        this.members.push(new GroupMember(groupJson.members[i]));
    }
}

/**
 * Group Member Model
 * Created by Group, contains a Badge, and has some basic data about the member
 */
function GroupMember(memberJson) {
    this.name = memberJson.name;
    this.key = memberJson.key;
    this.badgeId = memberJson.badge;

    this.badge = new Badge.Badge(this.badgeId);
    this.dataAnalyzer = new DataAnalyzer();

    this.badge.badgeDialogue.onNewChunk = function(chunk) {
        this.dataAnalyzer.addChunk(chunk);
    }.bind(this);

    this.badge.badgeDialogue.onChunkCompleted = function(chunk) {
        if (chunk.voltage) {
            this.voltage = chunk.voltage;
        }
        if (this.meeting) {
            this.meeting.logChunk(chunk, this);
        }
    }.bind(this);




    this.badge.badgeDialogue.onNewScanChunk = function(chunk) {
        //this.dataAnalyzer.addScanChunk(chunk);
    }.bind(this);

    this.badge.badgeDialogue.onScanChunkCompleted = function(chunk) {
        if (chunk.voltage) {
            this.voltage = chunk.voltage;
        }
        if (this.meeting) {
            this.meeting.logScanChunk(chunk, this);
        }
    }.bind(this);




    this.badge.onConnect = function() {
        if (this.$lastConnect) {
            this.$lastConnect.text(this.badge.lastConnect.toUTCString());
        }
    }.bind(this);

    this.clearData = function() {
        this.dataAnalyzer.clearData();
        this.badge.badgeDialogue.clearData();
        this.badge.lastConnect = new Date();
        this.seenWarningGiven = false;
    }.bind(this);
}

/**
 * Meeting Model
 *
 * This is in charge of logging all data to the log file
 */
function Meeting(meetingId, group, members, type, moderator, description, location) {
    this.meetingId = meetingId;
    this.members = members;
    this.group = group;
    this.type = type;
    this.location = location;
    this.startTime = new Date();
    this.timestamp = this.startTime.getTime()/1000
    this.moderator = moderator;
    this.description = description;
    this.uuid = device.uuid + "_" + this.startTime.getTime();
    this.log_index = 0
    this.last_interval_end_date = new Date().getTime() - DATA_DELAY_INTERVAL; // when did we last calaulate  speaking intervals?


    this.toPost = []

    this.showVisualization = function() { return true }();

    var meeting = this;


    $.each(this.members, function(index, member) {
        member.clearData();
    }.bind(this));

    this.logChunk = function(chunk, member) {

        var chunk_data = chunk.toDict(member);
        this.writeLog("audio received", chunk_data);

    }.bind(this);


    this.logScanChunk = function(chunk, member) {
        var chunk_data = chunk.toDict(member);
        this.writeLog("proximity received", chunk_data);
        console.log("scan received", chunk_data);

    }.bind(this);



    this.logPauseStart = function() {
        this.writeLog("pause started", null)
    }.bind(this);

    this.logPauseEnd = function(cause, remaining) {
        this.writeLog("pause ended", {'resume_cause':cause,
                                 'seconds_remaining':remaining})
    }.bind(this);


    this.logMeetingMemberAdd = function(member) {
      this.writeLog("member changed", {'member_key':member.key,
                                          "change":"join"})
    }.bind(this);

    this.logMeetingMemberRemove = function(member) {
        this.writeLog("member changed", {'member_key':member.key,
                                            "change":"leave"})
    }.bind(this);


    this.getLogName = function() {
        return this.uuid + ".txt";
    }.bind(this);

    this.writeLog = function(type, data) {

      var log_obj = { 'type':type,
              'log_timestamp':new Date()/1000,
                  'log_index':this.log_index,
                        'hub':device.uuid,
                       'data':data }

      this.log_index += 1
      var str = JSON.stringify(log_obj) + '\n'
      return window.fileStorage.save(this.getLogName(), str);
    }.bind(this);


    this.printLogFile = function() {
        window.fileStorage.load(this.getLogName()).done(function (data) {
            console.log(data);
        });
    }.bind(this);

    var memberIds = [];
    var memberInitials = [];
    $.each(this.members, function(index, member) {
        memberIds.push(member.key);
        memberInitials.push(getInitials(member.name));
        member.meeting = meeting;
    });
    this.memberKeys = memberIds;
    this.memberInitials = memberInitials;


    this.updateMeeting = function() {
      var memberIds = [];
      var memberInitials = [];
      $.each(this.members, function(index, member) {
        memberIds.push(member.key);
        memberInitials.push(getInitials(member.name));
        member.meeting = meeting;
      });
      this.memberKeys = memberIds;
      this.memberInitials = memberInitials;
    }

    this.syncLogFile = function(isComplete, endingMethod) {
      app.getCompletedMeetings(function (meetings) {
        app.syncLogFile(this.getLogName(), !!isComplete, endingMethod, new Date().toJSON(), meetings);
      }.bind(this))
    }.bind(this);



    this.initializeMeeting = function() {
        var split = new Date().toString().split(" ");
        var timeZoneFormatted = split[split.length - 2] + " " + split[split.length - 1];

        console.log("initializing meeting")

        this.writeLog("meeting started", {
            'uuid': this.uuid,
            'start_time':new Date()/1000,
            'log_version':"2.0",
            'hub_version':window.gitRevision,
            'moderator':this.moderator,
            'location':this.location,
            'description': this.description.replace(/\s\s+/g, ' '),
            'type':this.type
        }).then(this.writeLog("hub joined", {
                "uuid":device.uuid,
                "locale":timeZoneFormatted
        }))
    }.bind(this);

    this.initRhythmMeeting = function() {
        console.log("initializing a Rhythm meeting")
        
        app.rc.connect().then(function () {
            var meeting = {id: this.meetingId}//{id: this.uuid}
            console.log("Rhythm: Meeting ID", this.meetingId)
            var participants = [] //[{uuid: 'p1uuid', consent: true}, {uuid: 'p2uuid', consent: true}]
            $.each(this.memberKeys, function(index, member) {
                console.log("Rhythm: adding participant",member)
                participants.push({uuid: member, consent: true});
            });

            app.rc.startMeeting(meeting, participants, {}).then(function (result) {
                if (result) {
                    console.log("Started a Rhythm meeting!!!")
                }
            }).catch(function (err) {
                console.log("Can't start a Rhythm meeting. something went wrong.",err)
            })
        }.bind(this))
    }.bind(this);

    this.initializeMeeting();
    this.initRhythmMeeting();

}

/**
 * Abstract Model for a Page. These are representations of any .page element that's a direct child of <body>.
 * Check out the Page Configurations for examples of how to initialize one.
 */
function Page(id, onInit, onShow, onHide, extras) {
    PAGES.push(this);

    this.onPause = function() {};
    this.onResume = function() {};

    if (extras) {
        for (var key in extras) {
            this[key] = extras[key];
            if (typeof this[key] === "function") {
                this[key] = this[key].bind(this);
            }
        }
    }

    this.id = id;
    this.onInit = onInit.bind(this);
    this.onShow = onShow.bind(this);
    this.onHide = onHide.bind(this);
}

// Global list of pages, used for navigation
PAGES = [];


/***********************************************************************
 * Page Configurations
 */


/**
 * Main Page that displays the list of present users for the group
 */
mainPage = new Page("main",
    function onInit() {
        //
        // Setting the group id in the settings page to "explore" will cause the app to
        //  go into the explore mode, where it just finds badges around it
        //


        app.exploreMode = true //(app.exploreEnabled && (groupId === "EXPLORE")) || FREE_MEET


        $(".clear-scan-button").click(function() {
            app.isNewHub = false
            app.refreshGroupData();
            app.synchronizeIncompleteLogFiles();
            mainPage.displayActiveBadges();
        });
        $("#settings-button").click(function() {
            app.showPage(settingsPage);
        });
        $(".startMeetingButton").click(function() {

            var activeMembers = 0;
            var memberList = []
            for (var i = 0; i < app.group.members.length; i++) {
                var member = app.group.members[i];
                if (member.active) {
                    activeMembers += 1;
                    memberList.push(member)
                }
            }
            //
            // in explore mode, it doesnt matter if we only have one person, but do still need 1
            //
            if (app.exploreMode && !FREE_MEET) {
                if (activeMembers < 1) {
                    navigator.notification.alert("Choose a badge to inspect.");
                    return;
                }
                
                app.meeting = new Meeting("temp", app.group, memberList, "", "", "", "");
                app.showPage(meetingPage);
                return;

            }
            if (activeMembers < 2 && !app.is_god) {
                navigator.notification.alert("Need at least 2 people present to start a meeting.");
                return;
            }
            app.showPage(meetingConfigPage);
        });
        $(".error-retry").click(function() {
        });
    },
    function onShow() {
        //
        // each time the main page showes, we update wether or not we are on exploremode
        //
       // var groupId = localStorage.getItem(LOCALSTORAGE_GROUP_KEY);
        app.exploreMode = true// (app.exploreEnabled && (groupId === "EXPLORE")) || FREE_MEET;
        if (FREE_MEET) {
            $(".explore").addClass("hidden");
            $(".standard").addClass("hidden");
            $(".free").removeClass("hidden");
        }
        else if (app.exploreMode) {
            $(".free").addClass("hidden");
            $(".explore").removeClass("hidden");  // show all the explore elements
            $(".standard").addClass("hidden");    // remove all the standard elements
            $(".explore-chart-container").css("margin-top", "-100px")
        } else {
            $(".free").addClass("hidden");
            $(".standard").removeClass("hidden");
            $(".explore").addClass("hidden");
            $(".explore-chart-container").css("margin-top", "0px")
        }
        app.clearScannedBadges();
        setTimeout( function () {
          app.synchronizeIncompleteLogFiles()
          app.meeting = null
        }, 5000)

        if (app.bluetoothInitialized) {
            // after bluetooth is disabled, it's automatically re-enabled.
            //this.beginRefreshData();
            if (device.version[0] == '4') {
              app.disableBluetooth();
            }
            else {
              clearInterval(app.badgeScanIntervalID);
              app.badgeScanIntervalID = setInterval(function() {
                  app.scanForBadges();
              }, BADGE_SCAN_INTERVAL);
              app.scanForBadges();
            }
        }
    },
    function onHide() {
        clearInterval(app.badgeScanIntervalID);
        app.stopScan();
    },
    {
        onPause: function() {
            this.onHide();
        },
        onResume: function() {
            this.onShow();
        },
        onBluetoothInit: function() {
            this.loadGroupData();

            clearInterval(app.badgeScanIntervalID);
            app.badgeScanIntervalID = setInterval(function() {
                app.scanForBadges();
            }, BADGE_SCAN_INTERVAL);
            app.scanForBadges();
        },
        loadGroupData: function() {
            //
            // there will be no local JSON for the explore group, becuase
            //   it changes with each exploration, so lets just skip this step
            //
            if (app.exploreMode || FREE_MEET) {
                app.refreshGroupData(false);
                return;
            }
            // load the group from localstorage, if it's saved there.
            var groupJSON = localStorage.getItem(LOCALSTORAGE_GROUP);
            if (groupJSON) {
                try {
                    app.group = new Group(JSON.parse(groupJSON));
                    app.onrefreshGroupDataComplete();
                } catch (e) {
                    app.group = null;
                }
            }
            app.refreshGroupData(! app.group);
        },
        beginRefreshData: function() {
            //$(".devicelistMode").addClass("hidden");
            //$("#devicelistLoader").removeClass("hidden");
        },
        createGroupUserList: function(invalidkey) {
            //$(".devicelistMode").addClass("hidden");

            if (invalidkey) {
                $("#devicelistServerError").removeClass("hidden");
                return;
            }

            if (app.group == null) {
                $("#devicelistError").removeClass("hidden");
                return;
            }

            $("#devicelistContainer").removeClass("hidden");

            $(".devicelist").empty();
            if (! app.group || ! app.group.members) {
                console.log("Couldnt find any members in ", app.group)
                return;
            }

            for (var i = 0; i < app.group.members.length; i++) {
                var member = app.group.members[i];
                // we dont bother with this in explore mode, becuase we dont have
                //   group memebers to add. rather, we add them as we find anything around us
                if (!app.exploreMode) {
                    $(".devicelist").append($("<li onclick='app.toggleActiveUser(\"{key}\")' class=\"item\" data-name='{name}' data-device='{badgeId}' data-key='{key}'><span class='name'>{name}</span><i class='icon ion-battery-empty battery-icon' /></li>".format(member)));
                }
            }

            app.markActiveUsers();
            this.displayActiveBadges();
        },
        displayActiveBadges: function() {

            $(".devicelist .item").removeClass("active ion-battery-half ion-battery-full ion-battery-empty ion-battery-low");
            for (var i = 0; i < app.group.members.length; i++) {
                var member = app.group.members[i];
                var $el = $(".devicelist .item[data-device='" + member.badgeId + "']");

                if (member.active) {
                    $el.addClass("active");
                }
                // we ad a voltage indicator regardless of the activity state
                if (member.voltage) {
                    if (member.voltage >= BATTERY_YELLOW_THRESHOLD) {
                        $el.find(".battery-icon").addClass("ion-battery-full");
                    } else if (member.voltage >= BATTERY_RED_THRESHOLD) {
                        $el.find(".battery-icon").addClass("ion-battery-half");
                    } else {
                        $el.find(".battery-icon").addClass("ion-battery-low");
                    }
                }
            }
        },

    }
);

/**
 * Meeting Config Page that sets up the meeting before it starts
 * @type {Page}
 */
meetingConfigPage = new Page("meetingConfig",
    function onInit() {
        $(".startMeetingConfirmButton").click(function() {
            var type = $("#meetingTypeField").val();
            var moderator = $("#mediatorField option:selected").data("key");
            var meetingId = $("#meetingIdField").val();
            var location = $("#meetingLocationField").val();
            var description = $("#meetingDescriptionField").val();
            app.meeting = new Meeting(meetingId, app.group, this.meetingMembers, type, moderator, description, location);
            app.showPage(meetingPage);
        }.bind(this));
    },
    function onShow() {
        this.meetingMembers = [];
        for (var i = 0; i < app.group.members.length; i++) {
            var member = app.group.members[i];
            if (member.active) {
                this.meetingMembers.push(member);
            }
        }
        var names = [];
        $("#mediatorField").empty();
        $("#mediatorField").append($("<option data-key='none'>None</option>"));
        for (var i = 0; i < this.meetingMembers.length; i++) {
            var member = this.meetingMembers[i];
            names.push(member.name);
            $("#mediatorField").append($("<option data-key='" + member.key + "'>" + member.name + "</option>"));
        }
        $("#memberNameList").text(names.join(", "));
    },
    function onHide() {
    }
);

/**
 * Meeting Page that records data from badges for all members
 * @type {Page}
 */
meetingPage = new Page("meeting",
    function onInit() {
        app.meetingPaused = false
        $("#endMeetingButton").click(function() {
            this.confirmBeforeHide();
        }.bind(this));
        this.$debugCharts = $("#debug-charts");
        $('#debug-chart-button').featherlight(this.$debugCharts, {persist:true});
        $('#add-rem-member-button').featherlight($("#devicelist-add-rem"));
        $('#add-rem-member-button').click(function() {
          app.scanForBadges()
        })

        $('.resume-button').click(function() {
          app.meeting.pause_countdown.end()
          app.meeting.pause_countdown = null
        });

        function return_from_break(manual_end, remaining) {
              if (manual_end) {
                  app.meeting.logPauseEnd("manual", remaining);
              } else {
                  app.meeting.logPauseEnd("timer", 0);
              }

              $('.hide-when-paused').removeClass('hidden')
              $('.show-when-paused').addClass('hidden')
        }

        $('#add-5-button').click(function() {
          app.meeting.pause_countdown.extendClock(5*60)
        })

        $('#add-15-button').click(function() {
          app.meeting.pause_countdown.extendClock(15*60)
        })

        $('#pause-button').click(function() {
            app.meeting.logPauseStart();

            $('.hide-when-paused').addClass('hidden')
            $('.show-when-paused').removeClass('hidden')

            var initial_time = 10 * 60 * 1000;
            app.meeting.pause_countdown = new Countdown('break-countdown', initial_time, return_from_break)
      })

    },
    function onShow() {
        //
        // each time the main page showes, we update weather or not we are on exploremode
        //
        if (FREE_MEET) {
            $(".explore").addClass("hidden");
            $(".standard").addClass("hidden");
            $(".free").removeClass("hidden");
        }
        else if (app.exploreMode) {
            $(".free").addClass("hidden");
            $(".standard").addClass("hidden");    // remove all the standard elements
            $(".explore-chart-container").css("margin-top", "-100px")
            $(".explore").removeClass("hidden");  // show all the explore elements

        } else {
            $(".free").addClass("hidden");
            $(".standard").removeClass("hidden");
            $(".explore").addClass("hidden");
            $(".explore-chart-container").css("margin-top", "0px")
        }


        if (app.is_god) {
          console.log("We are god")
          $(".god-only").removeClass("hidden")
        } else {
          console.log("We are not god")
          $(".god-only").addClass("hidden")
        }


        this.createMemberUserList();

        window.plugins.insomnia.keepAwake();
        app.startAllDeviceRecording();
        app.watchdogStart();
        $("#clock").clock();

        this.timedOut = false;

        clearInterval(this.syncTimeout);

        this.syncTimeout = setInterval(function() {
            app.meeting.syncLogFile();
        }, LOG_SYNC_INTERVAL);

        clearInterval(this.bluetoothCheckTimeout);
        this.bluetoothCheckTimeout = setInterval(function() {
            app.ensureBluetoothEnabled();
        }, CHECK_BLUETOOTH_STATUS_INTERVAL);

        clearInterval(this.memberCheckIntervalID);
        this.memberCheckIntervalID = setInterval(function() {
            this.checkPresentMembers();
        }.bind(this), NO_BADGE_SEEN_WARNING_INTERVAL);


        cordova.plugins.backgroundMode.enable();

        this.initCharts();
        this.setMeetingTimeout();


        for (var i = 0; i < app.meeting.members.length; i++) {
          app.meeting.logMeetingMemberAdd(app.meeting.members[i])
        }
    },
    function onHide() {
        clearInterval(this.syncTimeout);
        clearInterval(this.chartTimeout);
        clearInterval(this.bluetoothCheckTimeout);
        clearInterval(this.memberCheckIntervalID);
        window.plugins.insomnia.allowSleepAgain();
        app.watchdogEnd();
        app.stopAllDeviceRecording();
        app.meeting.syncLogFile(true, this.timedOut ? "timedout" : "manual");

        cordova.plugins.backgroundMode.disable();

        this.clearMeetingTimeout();
    },
    {
        confirmBeforeHide: function() {

            navigator.notification.confirm("Are you sure?", function(result) {
                if (result == 1) {
                    this.onMeetingComplete();
                }
            }.bind(this));

            return true;
        },
        onBluetoothInit: function() {
            app.watchdogStart();
        },
        timeoutMeeting: function() {
            navigator.vibrate([500,500,500,500,500,500]);//,500,500,500,500,500,100,500,100,500,100,500,100,500,100]);

            navigator.notification.alert("Please press the button to indicate the meeting is still going, or we'll end it automatically in five minutes", function(result) {
                navigator.vibrate([]);
                this.setMeetingTimeout();
            }.bind(this), "Are you still there?", "Continue Meeting");

            this.closeTimeout = setTimeout(function() {
                navigator.notification.dismiss();
                this.clearMeetingTimeout();
                this.timedOut = true;
                app.showMainPage();
            }.bind(this), CHECK_MEETING_LENGTH_REACTION_TIME);
        },
        setMeetingTimeout: function() {

            this.clearMeetingTimeout();

            this.meetingTimeout = setTimeout(function() {

                this.timeoutMeeting();

            }.bind(this), CHECK_MEETING_LENGTH_INTERVAL);
        },
        clearMeetingTimeout: function() {
            clearTimeout(this.closeTimeout);
            clearTimeout(this.meetingTimeout);
        },
        checkPresentMembers: function() {
            $.each(app.meeting.members, function(index, member) {
                if (! member.seenWarningGiven) {
                    if (new Date().getTime() - member.badge.lastConnect > NO_BADGE_SEEN_WARNING_TIMEOUT) {
                        navigator.notification.alert("Hmm, it looks like we haven't seen " + member.name + " in a while. Please restart their badge if they're still here.");
                        member.seenWarningGiven = true;
                    }

                }
            });
        },
        initCharts: function() {

            var $charts = this.$debugCharts;

            $charts.empty();
            var template = _.template($("#debug-chart-template").text());
            $.each(app.meeting.members, function(index, member) {
                var $infocard = $(template({key:member.key,name:member.name}));
                $charts.append($infocard);
                member.chart = new DebugChart($infocard.find("canvas"));
                member.$lastConnect = $infocard.find(".last_update");
            });

            clearInterval(this.chartTimeout);
            this.chartTimeout = setInterval(function() {
                meetingPage.updateCharts();               // known to cause noisy memory useage, possibly leaky
            }, CHART_UPDATE_INTERVAL);

            var $mmVis = $("#meeting-mediator");
            $mmVis.empty();
            this.mm = null;
            console.log("Show=", app.meeting.showVisualization)
            console.log("second=",(!app.exploreMode) || FREE_MEET)
            if (app.meeting.showVisualization && ((!app.exploreMode) || FREE_MEET))
            {
                $("#visualization").removeClass("hidden");
                $("#meetingmemberlist").addClass("hidden");
                this.mm = new MM({participants: app.meeting.memberKeys,
                        names: app.meeting.memberInitials,
                        transitions: 0,
                        turns: []},
                    app.meeting.moderator,
                    $mmVis.width(),
                    $mmVis.height());
                this.mm.render('#meeting-mediator');
            } else {
                $("#meetingmemberlist").removeClass("hidden");
                $("#visualization").addClass("hidden");
            }


        },
        onMeetingComplete: function() {
            app.meeting.writeLog("meeting ended",
                {'end_method':"manual", "end_time":new Date()/1000}
            ).then(function () {
                app.syncLogFile(app.meeting.getLogName(), true, "maunal", new Date())
            })
            if (app.meeting.pause_countdown) {
              app.meeting.pause_countdown.end()
              app.meeting.pause_countdown = null
            }
            app.showPage(mainPage);
        },
        updateCharts: function() {

            this.displayVoltageLevels();

            var turns = [];
            var totalIntervals = 0;

            // Calculate intervals since the last time
            var end = new Date().getTime() - window.DATA_DELAY_INTERVAL; // now
            var start = app.meeting.last_interval_end_date;
            console.log(new Date(start).toUTCString(),new Date(end).toUTCString());
            app.meeting.last_interval_end_date = end;

            // calculate intervals
            var intervals = GroupDataAnalyzer(app.meeting.members,start,end);

            // update the chart
            $.each(app.meeting.members, function(index, member) {
                // update cutoff and threshold
                member.dataAnalyzer.updateCutoff();
                member.dataAnalyzer.updateMean();
                //member.dataAnalyzer.updateSpeakThreshold();

                var datapoints = filterPeriod(member.dataAnalyzer.getSamples(),start,end);

                member.chart.render(datapoints, intervals[index], start, end);

                turns.push({participant:member.key, turns:intervals[index].length});
                totalIntervals += intervals[index].length;

            }.bind(this));


            $.each(turns, function(index, turn) {
                turn.turns = turn.turns / totalIntervals;
            });

            if (this.mm) {
                this.mm.updateData({
                    participants: app.meeting.memberKeys,
                    names: app.meeting.memberInitials,
                    transitions: 0,
                    turns: turns
                });
            }

            // sends data to Rhythm
            $.each(app.meeting.members, function(index, member) {
                memberIntervals = intervals[index]
                for (var i = 0; i < memberIntervals.length; i++) {
                    var interval = memberIntervals[i];
                    console.log("Rhythm: Sending interval", member.key, interval.startTime, interval.endTime)
                    app.rc.sendSpeakingEvent(member.key, interval.startTime, interval.endTime)
                        .then(function (result) {
                            console.log("speaking object made!", result)
                        }).catch(function (err) {
                        console.log("ran into a problem", err)
                    })
                }
            })

        },
        createMemberUserList: function() {
            $("#meetingmemberlist-content").empty();
            for (var i = 0; i < app.meeting.members.length; i++) {
                var member = app.meeting.members[i];
                $("#meetingmemberlist-content").append($("<li class=\"item\" data-name='{name}' data-device='{badgeId}' data-key='{key}'><span class='name'>{name}</span><i class='icon ion-battery-empty battery-icon' /></li>".format(member)));
            }

            this.displayVoltageLevels();
        },
        displayVoltageLevels: function() {

            $("#meetingmemberlist-content .item .battery-icon").removeClass("ion-battery-empty ion-battery-half ion-battery-low ion-battery-full");
            for (var i = 0; i < app.meeting.members.length; i++) {
                var member = app.meeting.members[i];
                var $el = $("#meetingmemberlist-content .item[data-device='" + member.badgeId + "']");
                if (member.voltage) {
                    if (member.voltage >= BATTERY_YELLOW_THRESHOLD) {
                        $el.find(".battery-icon").addClass("ion-battery-full");
                    } else if (member.voltage >= BATTERY_RED_THRESHOLD) {
                        $el.find(".battery-icon").addClass("ion-battery-half");
                    } else {
                        $el.find(".battery-icon").addClass("ion-battery-low");
                    }
                }
            }
        },

    }
);


/**
 * This is a chart that displays raw volume and speaking interval data, for debug purposes
 */
function DebugChart($canvas) {

    var canvas = $canvas[0];

    var context = canvas.getContext('2d');

    var magnitude = 100;

    var margin = 5;
    var height = canvas.height - margin * 2;
    var width = canvas.width - margin * 2;

    function calcY(y) {
        return height - margin - (Math.min(y / magnitude, 1) * height);
    }
    function calcX(x, start, end) {
        return margin + width * ((x - start) / (end - start));
    }

    this.render = function(series, intervals, start, end) {

        context.clearRect(0, 0, canvas.width, canvas.height);

        context.fillStyle="#B2EBF2";
        for (var i = 0; i < intervals.length; i++) {
            var interval = intervals[i];
            var left = calcX(interval.startTime, start, end);
            var right = calcX(interval.endTime, start, end);
            context.fillRect(left, 0, right - left, canvas.height);
        }

        context.strokeStyle = "#00BFA5";
        context.lineWidth = 2;
        context.beginPath();
        for (var i = 0; i < series.length - 1; i++) {

            var point = series[i];

            var y = calcY(point.volClippedSmooth);
            var x = calcX(point.timestamp, start, end);
            if (i == 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
            x++;
        }
        context.stroke();

        context.strokeStyle = "#FF4500";
        context.lineWidth = 2;
        context.beginPath();
        for (var i = 0; i < series.length - 1; i++) {

            var point = series[i];

            var y = calcY(point.mean);
            var x = calcX(point.timestamp, start, end);
            if (i == 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
            x++;
        }
        context.stroke();

    }

    return this;
}


/***********************************************************************
 * App Navigation Behavior Configurations
 */

/**
 * App is the main brain behind the core functioning of the app.
 * The app should be the place to do the following operations. Do not have such operations in any other class,
 * and do not have any other operations in app. They belong elsewhere!
 *
 * + App and Cordova Initializations
 * + Page Navigation
 * + Bluetooth Operations
 * + Network Operations to talk to the server, including log file syncing
 * + Watchdog, the loop that runs during a meeting
 */
app = {
    /**
     * Initializations
     */
    initialize: function() {
        // init Rhythm server
        app.rc = new RhythmClient({
            serverUrl: SERVER_URL,
            serverEmail: SERVER_EMAIL,
            serverPassword: SERVER_PASSWORD
        });

        app.rc.connect().then(function () {
            console.log("connected to Rhythm server!")
        });

        //
        // set exploreEnabled to false in the real app, or keep true if we're okay with
        //   SLOANers possibly guessing to type "EXPLORE" into the groupID field
        //   and getting access to our debug mode
        //

        app.exploreEnabled = DEBUG_MODE_ENABLED || FREE_MEET;
        app.exploreEnabled = DEBUG_MODE_ENABLED || FREE_MEET;
        app.exploreMode = app.exploreEnabled || FREE_MEET;

        var projectJSON = localStorage.getItem(LOCALSTORAGE_PROJECT)
        if (projectJSON) {
          try {
            app.project = JSON.parse(projectJSON)
          } catch (e) {
            app.project = null
          }
        }

        var hub =  localStorage.getItem("HubName")
        if (hub) {
            $("#device-uuid").text(hub)
        }

        if (!app.project) {
            console.log("Getting project info. My project is:", app.project)
            $("#device-uuid").text("My UUID:" + device.uuid)
            $.ajax({
              url:BASE_URL + "projects",
              dataType:"json",
              type:"GET",
              success: function(result) {
                console.log("GET /project success:", result);
                app.project = result;
                app.project.id = result.project_id
                localStorage.setItem(LOCALSTORAGE_PROJECT, JSON.stringify(result))
              },
              error: function(error) {
                console.log("GET /project error:", error)
                if (error.status == 404) {
                  app.isNewHub = true;
                  app.registerAsNewHub()
                }

              }
            });
          }

        // if we are in explore mode, we will generate an empty group to begin
        //    with, then fill it as we find badges.
        if (app.exploreMode || FREE_MEET) {
            app.group = new Group({name:"Explored Group",
                                    key:"Explore",
                                    visualization_ranges:[{start:0,
                                                          end:Infinity}],
                                    members:[]
                                   });
        }

        this.initBluetooth();



        cordova.plugins.backgroundMode.setDefaults({title:'OpenBadge Meeting', text:'OpenBadge Meeting in Progress'});

        document.addEventListener("backbutton", function(e) {

            var currentFeatherlight = $.featherlight.current();
            if (currentFeatherlight) {
                e.preventDefault();
                currentFeatherlight.close();
                return;
            }

            if (app.activePage == mainPage) {
                navigator.app.exitApp();
            } else {
                e.preventDefault();
                if (app.activePage.confirmBeforeHide) {
                    app.activePage.confirmBeforeHide();
                } else {
                    app.showPage(mainPage);
                }
            }
        }, false);

        $(".back-button").click(function() {
            if (app.activePage.confirmBeforeHide) {
                app.activePage.confirmBeforeHide();
            } else {
                app.showPage(mainPage);
            }
        });


        for (var i = 0; i < PAGES.length; i++) {
            PAGES[i].onInit();
        }

        //var groupId = localStorage.getItem(LOCALSTORAGE_GROUP_KEY);
        //if (! groupId && !FREE_MEET) {
        //    this.showPage(settingsPage);
        //} else {
            this.showPage(mainPage);
        //}

        document.addEventListener("resume", function onResume() {
            setTimeout(function() {
                app.synchronizeIncompleteLogFiles();
            }, 100);
            app.activePage.onResume();
        }, false);
        setTimeout(function() {
            app.synchronizeIncompleteLogFiles();
        }, 1000);


        document.addEventListener("pause", function onPause() {
            app.stopScan();
            app.activePage.onPause();
        }, false);

        clearInterval(app.checkbluetoothinterval);
        app.lastSeenBluetooth = new Date();
        app.checkbluetoothinterval = setInterval(function() {
            app.checkForBluetoothWarning();
        }, BLUETOOTH_OFF_WARNING_INTERVAL);
    },

    /**
     * Bluetooth Functions
     */
    initBluetooth: function() {
        app.bluetoothInitialized = false;

        bluetoothle.initialize(
            app.bluetoothStatusUpdate,
            {request: false,statusReceiver: true}
        );
    },
    bluetoothStatusUpdate: function (obj) {
        console.log('Success');

        // Android v6.0 required requestPermissions. If it's Android < 5.0 there'll
        // be an error, but don't worry about it.
        if (cordova.platformId === 'android') {
            console.log('Asking for permissions');
            bluetoothle.requestPermission(
                function(obj) {
                    console.log('permissions ok');
                    app.ensureBluetoothEnabled();
                    app.bluetoothInitialized = true;
                    app.activePage.onBluetoothInit();
                },
                function(obj) {
                    //console.log('permissions err');
                    app.ensureBluetoothEnabled();
                    app.bluetoothInitialized = true;
                    app.activePage.onBluetoothInit();
                }
            );
        }
    },
    ensureBluetoothEnabled: function() {
        bluetoothle.isEnabled(function(status) {
            if (! status.isEnabled) {
                app.watchdogEnd();
                app.enableBluetooth();
            }
        });
    },
    enableBluetooth: function() {
        console.log("Enabling Bluetooth!");
        bluetoothle.enable(function success() {
            // unused
        }, function error() {
            toastr.error("Could not enable Bluetooth! Please enable it manually.");
            console.log("Could not enable bluetooth!");
        });
    },
    disableBluetooth: function() {
        app.watchdogEnd();
        app.stopScan();
        console.log("Disabling Bluetooth!");
        bluetoothle.disable(function success() {
        }, function error() {
        });
    },
    checkForBluetoothWarning: function() {
        bluetoothle.isEnabled(function(status) {
            if (status.isEnabled) {
                app.lastSeenBluetooth = new Date();
                app.warnedAboutBluetooth = false;
            } else {
                if (!app.warnedAboutBluetooth && new Date().getTime() - app.lastSeenBluetooth.getTime() > BLUETOOTH_OFF_WARNING_TIMEOUT) {
                    navigator.notification.alert("Hmm, it looks like we're unable to turn your Bluetooth on from our app. It may be broken. Please enable it or try to restart your phone. Sorry about this!");
                    app.warnedAboutBluetooth = true;
                }
            }
        });
    },

    registerAsNewHub: function() {
        $.ajax({
            url: BASE_URL + 0 +"/hubs",
            type:"PUT",
            dataType:"json",
            beforeSend: function(xhr){
                xhr.setRequestHeader('X-LAST-MEMBER-UPDATE', 0)
                xhr.setRequestHeader("X-APPKEY", APP_KEY)
                xhr.setRequestHeader("X-HUB-UUID", device.uuid)
            },
            success: function(result) {
                console.log(result)

            },
            error: function(error) {
            }
        });
    },

    /**
     * Log file synchronization functions
     */
    getLogFiles: function (callback) {
        window.fileStorage.list("/").done(function (entries) {
            callback(entries);
        });
    },
    getCompletedMeetings: function(callback) {
        if (app.project) {
            $.ajax({
                url: BASE_URL + app.project.key +"/hubs",
                type:"GET",
                beforeSend: function(xhr){
                    xhr.setRequestHeader('X-LAST-MEMBER-UPDATE', new Date()/1000);
                    xhr.setRequestHeader("X-APPKEY", APP_KEY);
                    xhr.setRequestHeader("X-HUB-UUID", device.uuid);
              },
              dataType:"json",
              success: function(result) {
                console.log(result)
                localStorage.setItem("HubName", result.name)
                $("#device-uuid").text(result.name)
                app.is_god = result.is_god
                for (var address in result.badge_map) {
                    if (result.badge_map.hasOwnProperty(address)) {
                        app.project.badge_map[address] = result.badge_map[address];
                        console.log("adding " + result.badge_map[address] + " to  " + address)
                    }
                }
                if (app.is_god) {
                  $(".god-only").removeClass("hidden")
                } else {
                  $(".god-only").addClass("hidden")
                }
                callback(result.meetings);

              },
              error: function(error) {
              }
          });
        } else {
          console.log("No project data available, calling server")
          app.refreshGroupData(false, function()
          {
              console.log("Got project data, ", app.project)
              app.getCompletedMeetings(callback)
          },
          1000)
        }

    },
    synchronizeIncompleteLogFiles: function() {
        app.getCompletedMeetings(function(meetings) {
            app.getLogFiles(function(logfiles) {
                for (var i = 0; i < logfiles.length; i++) {
                    var logfilename = logfiles[i].name;
                    if (logfilename.indexOf(device.uuid) == 0) {
                      if (!app.meeting || app.meeting.getLogName() != logfilename) {

                        app.syncLogFile(logfilename, true, "sync", null, meetings);

                      }
                    }
                }
            });
        })
    },
    syncLogFile: function(filename, isComplete, endingMethod, endTime, meetings) {
      console.log("Starting to sync")
      var meeting_uuid = filename.split(".")[0]

      if (meetings && (meeting_uuid in meetings) && meetings[meeting_uuid].is_complete) return

      if ( app.force_put || isComplete || (meetings && !(meeting_uuid in meetings))) {
        app.force_put = false

        console.log("PUTiing")
        var fileTransfer = new FileTransfer();
        var uri = encodeURI(BASE_URL + app.project.key + "/meetings");

        var fileURL = cordova.file.externalDataDirectory + filename;

        var options = new FileUploadOptions();
        options.fileKey = "file";
        options.fileName = fileURL.substr(fileURL.lastIndexOf('/') + 1);
        options.mimeType = "text/plain";
        options.headers = {"X-APPKEY": APP_KEY, "X-HUB-UUID": device.uuid};
        options.httpMethod = "PUT";

        options.params = {
            is_complete:!!isComplete,
        };

        if (endTime) {
            options.params.end_time = endTime;
        }

        if (endingMethod) {
            options.params.ending_method = endingMethod;
        }

        function addEndingChunk () {
            if (endingMethod && endingMethod == "sync") {
                window.fileStorage.load(meeting_uuid + ".txt").then( function(log) {
                    var log = log.split('\n')
                    var last = JSON.parse(log[log.length-2])
                    if (last.type !== "meeting ended") {
                        var log_obj = { 'type':"meeting ended",
                                'log_timestamp':new Date()/1000,
                                    'log_index':9999999,
                                          'hub':device.uuid,
                                         'data':{'ending_method':'sync'} }
                        this.log_index += 1
                        var str = JSON.stringify(log_obj) + '\n'
                        console.log("appending ening chunk to meeting");
                        return window.fileStorage.save(filename, str);
                    } else {
                        console.log("last chnk was ending, dont need to add more");
                    }
                })
            } else {
                console.log("putting witout adding endinng chunk");
            }
            return $.Deferred().resolve()
        }

        addEndingChunk().then(
            setTimeout(function () {
                fileTransfer.upload(fileURL, uri, function win() {
                    console.log("Log backed up successfully!");
                }, function fail(error) {
                    console.log("log backup error:", error)
                }, options)
                },
                1000)
        )

      } else {
        console.log("Trying to POST")
        var last_log_timestamp = meetings[meeting_uuid].last_log_timestamp
        var last_log_serial = meetings[meeting_uuid].last_log_serial

        var toPost = []
        window.fileStorage.load(meeting_uuid + ".txt").then( function(log) {
          log = log.split('\n');
          var num_chunks = log.length - 1;

          for (var i = last_log_serial + 1; i < num_chunks; i++) {
            toPost.push(log[i] + '\n')
          }

          console.log("We last posted", last_log_serial, "at, ", last_log_timestamp)
          console.log("we now post the data:", toPost)

          $.ajax(BASE_URL + app.project.key + "/meetings",
            {
              type:'POST',
              data:{uuid: meeting_uuid, chunks:JSON.stringify(toPost)},
              success: function(succ) {
                if (succ.status == "log mismatch") {
                  app.force_put = true
                  console.log("forcing a put")
                }
                else {
                    app.force_put = false;
                }
                console.log(succ);
              },
              error: function(err) {
                console.log("forcing a put")
                app.force_put = true
                console.log(err);
              }
            });

        });
      }

    },

    /**
     * Functions to refresh the group data from the backend
     */
    refreshGroupData: function(showLoading, callback) {
      app.clearScannedBadges()
      if (!app.isNewHub) {
            $.ajax({
              url:BASE_URL + "projects",
              dataType:"json",
              type:"GET",
              success: function(result) {
                console.log("GET /project success:", result);
                app.project = result;
                app.project.id = result.project_id;
                localStorage.setItem(LOCALSTORAGE_PROJECT, JSON.stringify(result))
              },
              error: function(error) {
                console.log("GET /project error:", error)
              }
            });
      }

    },
    onrefreshGroupDataStart: function() {
        mainPage.beginRefreshData();
    },
    onrefreshGroupDataComplete: function(invalidkey) {
        mainPage.createGroupUserList(invalidkey);
    },

    /**
     * Badge Scanning to see which badges are present, and get the status of each badge
     */
    scanForBadges: function() {
        app.activeBadges = app.activeBadges || []
        if (app.scanning || !( app.group || app.exploreMode)) {
            return;
        }
        $("#scanning").removeClass("hidden");
        app.scanning = true;
        qbluetoothle.stopScan().then(function() {
            qbluetoothle.startScan().then(
                function scanSucess(obj){ // success
                    console.log("Scan completed successfully - "+obj.status)
                    app.onScanComplete();
                }, function scanError(obj) { // error
                    console.log("Scan Start error: " + obj.error + " - " + obj.message)
                    app.onScanComplete();
                }, function scanProgress(obj) { // progress

                    // extract badge data from advertisement
                    var voltage = null;
                    if (obj.name == "BADGE") {
                        app.activeBadges.push(obj.address);
                        var adbytes = bluetoothle.encodedStringToBytes(obj.advertisement);
                        var adStr = bluetoothle.bytesToString(adbytes);
                        var adBadgeData = adStr.substring(18, 26);
                        var adBadgeDataArr = struct.Unpack('<HfBB', adBadgeData);
                        voltage = adBadgeDataArr[1];
                        app.onScanUpdate(obj.address,voltage);
                    }

                    if (obj.name == "HDBDG") {
                        app.activeBadges.push(obj.address);
                        var adbytes = bluetoothle.encodedStringToBytes(obj.advertisement);
                        var adStr = bluetoothle.bytesToString(adbytes);
                        var adBadgeData = app.unpack_broadcast_data(adStr)
                        voltage = adBadgeData.voltage;
                        app.onScanUpdate(obj.address,voltage);
                    }

                });
        });
    },
    unpack_broadcast_data: function(data){

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
      var adv_payload = null


      while (adv_payload === null && index < data.length) {
          // console.log("index:", index)
          field_len = struct.Unpack('<B', data[index])[0];
          // console.log("field_len is:", field_len);
          index += 1

          var field_type = struct.Unpack('<B', data[index])[0]
          // console.log("field_type is:", field_type);
          index += 1
          // is it a name field?
          if (field_type == BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME ||
                  field_type == BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME) {
              var name_field = data.slice(index, index+field_len)
              var name_as_bytes = struct.Unpack('<' + name_field.length + 'B', name_field)
              name = bin2String(name_as_bytes) // converts byte to string
              console.log("got name:", name);
            }

          // is it the adv payload?
          else if (field_type == BLE_GAP_AD_TYPE_MANUFACTURER_SPECIFIC_DATA) {
              if (field_len == CUSTOM_DATA_LEN){
                  console.log("parsing adv data");
                  var payload_field = data.slice(index, index + field_len)

                  var payload = struct.Unpack('<HBBHB' + MAC_LENGTH + 'B' , payload_field)
                  // console.log(payload);

                  adv_payload = {}
                  adv_payload['voltage'] =  1 + 0.01*payload[1]
                  adv_payload['status_flags'] = payload[2]
                  adv_payload['badge_id'] = payload[3]
                  adv_payload['project_id'] = payload[4]

                  // Check if the 1st bit is set
                  var sync_status = adv_payload['status_flags'] & 1
                  adv_payload['sync_status'] = sync_status

                  // Check if the 2nd bit is set:
                  var audio_status = adv_payload['status_flags'] & 2
                  adv_payload['audio_status'] = audio_status

                  // Check if the 3rd bit is set:
                  var proximity_status = adv_payload['status_flags'] & 4
                  adv_payload['proximity_status'] = proximity_status

                  var mac = ""
                  for (var i = 10; i >=5; i--) {
                    mac += (payload[i]).toString(16);
                    if (i>5) mac += ":";
                  }

                  // reverse?
                  adv_payload['mac'] = mac
                }
              }

          // advance to next field
          index += field_len-1;
        }
      console.log(adv_payload);
      return adv_payload;
    },


    onScanComplete: function scanCompleted() {
        app.scanning = false;
        $("#scanning").addClass("hidden");
        if (! app.group) {
            return;
        }
        app.markActiveUsers();
        mainPage.displayActiveBadges();
    },
    onScanUpdate: function scanUpdated(activeBadge,voltage) {
        if (! app.group) {
            return;
        }

        // update members
        for (var i = 0; i < app.group.members.length; i++) {
            var member = app.group.members[i];
            if (activeBadge == member.badgeId) {
                if ((!app.exploreModec) && typeof member.active === "undefined") {
                    member.active = true;
                }
                member.voltage = voltage;
                mainPage.displayActiveBadges();
                return;
            }
        }

        // normally we wouldnt do anything if the found MAC didnt match a MAC in the group,
        //   but in explore mode we will simply add that MAC to our `fake` group
        if (app.exploreMode) {
            var newMember;
            if ( FREE_MEET) {
//              $.get("http://api.randomuser.me/?seed="+activeBadge+"?inc=name,", function(response) {
//                console.log(JSON.stringify(response))
//                var owner = response.results[0].name.first + " " + response.results[0].name.last
//                newMember = new GroupMember({name:owner, key: activeBadge, badge:activeBadge});
//                newMember.active = false;
//                newMember.voltage = voltage;
//                app.group.members.push(newMember);
//                console.log("Discovered", newMember);
//                $(".devicelist").append($("<li onclick='app.toggleActiveUser(\"{key}\")' class=\"item\" data-name='{name}' data-device='{badgeId}' data-key='{key}'><span class='name'>{name}</span><i class='icon ion-battery-empty battery-icon' /></li>".format(newMember)));
//                mainPage.displayActiveBadges();
//              })
              if (app.project && activeBadge in app.project.badge_map) {
                var member = app.project.badge_map[activeBadge]
                newMember = new GroupMember({name:member.name, key: member.key, badge:activeBadge});
                newMember.active = false;
                newMember.voltage = voltage;
                app.group.members.push(newMember);
                console.log("Discovered", newMember);
                $(".devicelist").append($("<li onclick='app.toggleActiveUser(\"{key}\")' class=\"item\" data-name='{name}' data-device='{badgeId}' data-key='{key}'><span class='name'>{name}</span><i class='icon ion-battery-empty battery-icon' /></li>".format(newMember)));
                mainPage.displayActiveBadges();
              }
            }
            else {
              newMember = new GroupMember({name:activeBadge, key: activeBadge, badge:activeBadge});
              newMember.active = FREE_MEET;
              newMember.voltage = voltage;
              app.group.members.push(newMember);
              console.log("Discovered", newMember);
              $(".devicelist").append($("<li onclick='app.toggleActiveUser(\"{key}\")' class=\"item\" data-name='{name}' data-device='{badgeId}' data-key='{key}'><span class='name'>{name}</span><i class='icon ion-battery-full battery-icon' /></li>".format(newMember)));
              mainPage.displayActiveBadges();
          }
      }

    },
    stopScan: function scanStopped() {
        app.scanning = false;
        $("#scanning").addClass("hidden");
        qbluetoothle.stopScan();
    },
    markActiveUsers: function() {
        if (! app || ! app.group || app.exploreMode) {
            return;
        }
        for (var i = 0; i < app.group.members.length; i++) {
            var member = app.group.members[i];
            if (!member.manualDisable) {
              member.active = app.activeBadges.indexOf(member.badgeId) != -1;
            }
            else {
              member.active = false
            }
        }
    },
    toggleActiveUser: function(key) {
        console.log("Toggling", key)
        for (var i = 0; i < app.group.members.length; i++) {
            var member = app.group.members[i];
            if (member.key === key) {
                member.active = !member.active;
                member.manualDisable = !member.active
                member.active &= !!~app.activeBadges.indexOf(member.badgeId);
                if(app.meeting) {
                  if (member.active) {
                    app.meeting.members.push(member)
                    member.badge.startRecording()
                    app.meeting.logMeetingMemberAdd(member)
                  } else {
                    for (var j = 0; j < app.meeting.members.length; j++) {
                      if (app.meeting.members[j].key === key) {
                        app.meeting.logMeetingMemberRemove(member)
                        app.meeting.members.splice(j, 1)
                        break;
                      }
                    }
                  }
                  app.meeting.updateMeeting()
                  console.log("initing charts with ", app.meeting.members)
                  meetingPage.initCharts()
                }
                mainPage.displayActiveBadges();
                return;
            }

        }

    },
    clearScannedBadges: function() {
        //
        // in exploreMode, rather than clearing weather or not we have seen
        //  a particular badge, we forget all the badges and allow us to
        //  see what badges are near us again
        //
        if (app.exploreMode) {
            app.group = new Group({name:"Explored Group",
                                    key:"Explore",
                                    visualization_ranges:[{start:0,
                                                          end:Infinity}],
                                    members:[]
                                   });
            $(".devicelist").empty();
        }
        app.activeBadges = [];
        app.markActiveUsers();
    },
    getStatusForEachMember: function() {
        if (! app || ! app.group) {
            return;
        }
        $.each(app.group.members, function(index, member) {
            app.getStatusForMember(member);
        });
    },
    getStatusForMember: function(member) {
        if (member.active) {
            member.badge.queryStatus(
                function callback(data) {
                    member.voltage = data.voltage;
                    mainPage.displayActiveBadges();
                },
                function failure() {
                    member.voltage = null;
                    mainPage.displayActiveBadges();
                }
            );
        }
    },
    startAllDeviceRecording: function() {
        if (! app.meeting) {
            return;
        }
        console.log("Starting recording on all meeting badges!");
        for (var i = 0; i < app.meeting.members.length; ++i) {
            var badge = app.meeting.members[i].badge;
            badge.startRecording();
        }
    },
    stopAllDeviceRecording: function() {
        if (! app.meeting) {
            return;
        }
        console.log("Stopping recording on all meeting badges!");
        for (var i = 0; i < app.meeting.members.length; ++i) {
            var badge = app.meeting.members[i].badge;
            badge.stopRecording();
        }
    },


    /**
     * Navigation
     */
    showPage: function(page) {
        if (app.activePage) {
            app.activePage.onHide();
        }
        app.activePage = page;
        $(".page").removeClass("active");
        $("#" + page.id).addClass("active");
        page.onShow();
    },
    showMainPage: function() {
        this.showPage(mainPage);
    },

    /**
     * Watchdog
     * This is the main loop of the meeting, which checks each of the badges for new data
     */
    watchdogStart: function() {
        // console.log("Starting watchdog");
        clearInterval(app.watchdogTimer);
        app.watchdogTimer = setInterval(function(){ app.watchdog() }, WATCHDOG_SLEEP);
    },
    watchdogEnd: function() {
        // console.log("Ending watchdog");
        if (app.watchdogTimer) {
            clearInterval(app.watchdogTimer);
        }
    },
    watchdog: function() {

        if (! app.meeting) {
            return;
        }

        // Iterate over badges
        for (var i = 0; i < app.meeting.members.length; ++i) {
            var badge = app.meeting.members[i].badge;
            badge.recordAndQueryData();
            //badge.scanAndQueryScan();
        }
    },
};



/***********************************************************************
 * File System
 * This wraps the filesystem in mutexes and flags. Only access files through this object!
 */

window.fileStorage = {
    locked:false,
    save: function (name, data, deferred) {
        deferred = deferred || $.Deferred();
        if (window.fileStorage.locked) {
            setTimeout(function() {window.fileStorage.save(name, data, deferred)}, 100);
            return deferred.promise();
        }
        window.fileStorage.locked = true;

        var fail = function (error) {
            window.fileStorage.locked = false;
            deferred.reject(error);
        };

        var gotFileSystem = function (fileSystem) {
            fileSystem.getFile(name, {create: true, exclusive: false}, gotFileEntry, fail);
        };

        var gotFileEntry = function (fileEntry) {
            fileEntry.createWriter(gotFileWriter, fail);
        };

        var gotFileWriter = function (writer) {
            writer.onwrite = function () {
                window.fileStorage.locked = false;
                deferred.resolve();
            };
            writer.onerror = fail;
            writer.seek(writer.length);
            writer.write(data);
        }

        window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, gotFileSystem, fail);
        return deferred.promise();
    },

    load: function (name, deferred) {
        var deferred = deferred || $.Deferred();
        if (window.fileStorage.locked) {
            setTimeout(function() {window.fileStorage.load(name, deferred)}, 100);
            return deferred.promise();
        }
        window.fileStorage.locked = true;

        var fail = function (error) {
            window.fileStorage.locked = false;
            deferred.reject(error);
        };

        var gotFileSystem = function (fileSystem) {
            fileSystem.getFile(name, { create: false, exclusive: false }, gotFileEntry, fail);
        };

        var gotFileEntry = function (fileEntry) {
            fileEntry.file(gotFile, fail);
        };

        var gotFile = function (file) {
            reader = new FileReader();
            reader.onloadend = function (evt) {
                var data = evt.target.result;
                window.fileStorage.locked = false;
                deferred.resolve(data);
            };

            reader.readAsText(file);
        }

        window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, gotFileSystem, fail);
        return deferred.promise();
    },

    list: function (name, deferred) {
        var deferred = deferred || $.Deferred();
        if (window.fileStorage.locked) {
            setTimeout(function() {window.fileStorage.list(name, deferred)}, 100);
            return deferred.promise();
        }
        window.fileStorage.locked = true;

        var fail = function (error) {
            window.fileStorage.locked = false;
            deferred.reject(error);
        };

        var gotFileSystem = function (fileSystem) {
            var directoryReader = fileSystem.createReader();
            directoryReader.readEntries(function success(entries) {
                window.fileStorage.locked = false;
                deferred.resolve(entries)
            }, fail);
        };

        window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory + name, gotFileSystem, fail);
        return deferred.promise();
    },

    delete: function (name) {
        var deferred = $.Deferred();

        var fail = function (error) {
            deferred.reject(error);
        };

        var gotFileSystem = function (fileSystem) {
            fileSystem.getFile(name, { create: false, exclusive: false }, gotFileEntry, fail);
        };

        var gotFileEntry = function (fileEntry) {
            fileEntry.remove();
        };

        window.resolveLocalFileSystemURI(cordova.file.externalDataDirectory, gotFileSystem, fail);
        return deferred.promise();
    }
};


/********************************
 * Utility Functions and library initializations
 */


function Countdown(id, initial_time, callback) {
  this.clock = document.getElementById(id);
  this.minutesSpan = this.clock.querySelector('.minutes');
  this.secondsSpan = this.clock.querySelector('.seconds');
  this.endtime = +(new Date()) + initial_time

  this.getTimeRemaining = function() {
    var t = this.endtime - +(new Date());
    var seconds = Math.floor((t / 1000) % 60);
    var minutes = Math.floor((t / 1000 / 60));
    return {
      'total': t,
      'minutes': minutes,
      'seconds': seconds
    };
  }

  this.extendClock = function(seconds) {
    this.endtime += seconds*1000;
    console.log("extending by", seconds, "to", this.endtime/1000)
    this.updateClock();
  }.bind(this);

  this.end = function() {
    this.endtime = 0;
    this.updateClock(true);
  }.bind(this);


  this.updateClock = function(forced_end) {
    var remaining = this.getTimeRemaining();

    this.minutesSpan.innerHTML =  remaining.minutes;
    this.secondsSpan.innerHTML = ('0' + remaining.seconds).slice(-2);

    if (remaining.total <= 0) {
      clearInterval(this.timeinterval);
      callback(!!forced_end, remaining.total)
    }
  }.bind(this);

  this.updateClock();
  this.timeinterval = setInterval(this.updateClock, 1000);
}



function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function getInitials(str) {
    return str.replace(/\W*(\w)\w*/g, '$1').toUpperCase();
}

jQuery.fn.extend({
    clock: function () {
        var start = new Date().getTime();
        $.each(this, function() {
            var $this = $(this);
            var clock = this;
            function setText() {
                var now = new Date().getTime();
                var timediff = Math.floor((now - start) / 1000);
                var hours = Math.floor(timediff / 3600);
                var minutes = pad(Math.floor(timediff % 3600 / 60), 2);
                var seconds = pad(Math.floor(timediff % 60), 2);
                $this.text("{0}:{1}:{2}".format(hours, minutes, seconds));
            };
            if (clock.interval) {
                clearInterval(clock.interval);
            }
            clock.interval = setInterval(function() {
                if (this == null) {
                    clearInterval(clock.interval);
                    return;
                }
                setText();
            }.bind(this), 1000);
            setText();
        });
        return this;
    }})


toastr.options = {
    "closeButton": false,
    "positionClass": "toast-bottom-center",
    "preventDuplicates": true,
    "showDuration": "200",
    "hideDuration": "500",
    "timeOut": "1000",
}

if (!String.prototype.format) {
    String.prototype.format = function() {
        var str = this.toString();
        if (!arguments.length)
            return str;
        var args = typeof arguments[0],
            args = (("string" == args || "number" == args) ? arguments : arguments[0]);
        for (arg in args)
            str = str.replace(RegExp("\\{" + arg + "\\}", "gi"), args[arg]);
        return str;
    }
}


//var projectJSON = JSON.parse(localStorage.getItem(LOCALSTORAGE_PROJECT))
//console.log(JSON.stringify(project))
//if (project) {
//  $("#device-uuid").text(project.name)
//}


document.addEventListener('deviceready', function() {
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            xhr.setRequestHeader("X-APPKEY", APP_KEY);
            xhr.setRequestHeader("X-HUB-UUID", device.uuid);

        }
    });


    app.initialize() },
 false);

