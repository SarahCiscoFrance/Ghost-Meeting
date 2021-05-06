/**
 * Topic: Releasing the room when no one is attending
 * Author: rudferna@cisco.com
 * Team: collaboration FRANCE
 * Version: 1.2
 * Date: 28/04/2021
 */


const xapi = require('xapi');

/* 
 * ********************************
 * EDIT THIS SECTION BELOW 
 * ********************************
 */


/* 1. Set the thresholds. They define how much time it needs to pass before a room is booked or released
 * Tip: For huddle spaces those numbers are usually smaller, while for bigger boardrooms we recommend larger thresholds
 */
const MIN_BEFORE_BOOK = 1; // in minutes 
const MIN_BEFORE_RELEASE = 1; // in minutes 


/* 2. You can enable presence detection that is based from ultrasound sensor on the Cisco device. 
 * Tip: Detection via ultrasound can be useful when lighting conditions are not perfect for
 * image recognition. Downside is that it can be quite sensitive and can cause false positive
 * detections. It's best to test it and see if it works for your office environment
 */
const USE_ULTRASOUND = false;

/* 3. At what level is the human voice audible
 * Below you can set this level
 */
const SOUND_LEVEL = 50;


/* 
 * *********************************
 * *********************************
 * *********************************
 *  DO NOT CHANGE BELOW THIS LINE 
 * *********************************
 * *********************************
 * *********************************
 */

var end_timeout;
var delete_timeout;
var bookingIsActive = false;
var listenerShouldCheck = true;
let bookingId;
let meetingId;

class PresenceDetector {
    /* * Presence detector class handling all the logic * to detect presence on Cisco equipment */
    constructor() {
        this._data = {
            peopleCount: 0,
            peoplePresence: false,
            inCall: false,
            presenceSound: false,
            sharing: false,
        };
        // flags for full/empty room timers 
        this._lastFullTimer = 0;
        this._lastEmptyTimer = 0;
        this._roomIsFull = false;
        this._roomIsEmpty = false;
    }

    async enableDetector() {
        /*
         * Enabling detection on Cisco equipment
         */
        console.log("Enabling presence detection...");
        if (!USE_ULTRASOUND) {
            console.log("Ultrasound detection disabled!");
        }
        xapi.config.set('HttpClient Mode', 'On');
        xapi.config.set('RoomAnalytics PeopleCountOutOfCall', 'On');
        xapi.config.set('RoomAnalytics PeoplePresenceDetector', 'On');
        console.log("Success, presence detection enabled");
    }

    _getData(command) {
        return xapi.status.get(command).catch((error) => {
            console.warning("Couldn't run the command:", command, " Error: ", error);
            return -1
        })
    }
    _isRoomOccupied() {
        /*
         * Logic that returns a boolean if room is occupied combining all types of enabled presence detection
         */
        console.log("# of people:" + this._data.peopleCount + "| Ultrasound presence detected: " + this._data.peoplePresence + "| Call in progress: " + this._data.inCall + "| Sound level above " + SOUND_LEVEL + ": " + this._data.presenceSound + "| Sharing (Sending or Receiving): " + this._data.sharing);
        console.log("IS OCCUPIED: " + (this._data.peopleCount || (USE_ULTRASOUND && this._data.peoplePresence) || this._data.inCall || this._data.presenceSound || this._data.sharing))
        return this._data.peopleCount || (USE_ULTRASOUND && this._data.peoplePresence) || this._data.inCall || this._data.presenceSound || this._data.sharing;
    }
    _processPresence() {
        /* 
         *  Logic for the presence information gathered from 
         *  the Cisco equipment.
         */
        if (this._isRoomOccupied()) {
            if (this._lastFullTimer == 0) {
                console.log("Room occupancy detected - starting timer...");
                this._lastFullTimer = Date.now();
                this._lastEmptyTimer = 0;
            } else if (Date.now() > (this._lastFullTimer + MIN_BEFORE_BOOK * 60000)) {
                this._roomIsFull = true;
                this._roomIsEmpty = false;
                this._lastFullTimer = Date.now();
                console.log("Should update room status - occupied");
            }
        } else {
            if (this._lastEmptyTimer == 0) {
                console.log("Room empty detected - starting timer...");
                this._lastEmptyTimer = Date.now();
                this._lastFullTimer = 0;
            } else if (Date.now() > (this._lastEmptyTimer + MIN_BEFORE_RELEASE * 60000) && !this._roomIsEmpty) {
                this._roomIsFull = false;
                this._roomIsEmpty = true;
                console.log("Should update room status - empty");
            }
        }

        if (this._roomIsEmpty) {
            if (listenerShouldCheck) {
                listenerShouldCheck = false;
                console.warn("Room is empty start countdown for delete booking");
                this._startCountdown();
            }
        }
    }

    _startCountdown() {
        console.log("No presence Detected");
        displayTextOnScreen("Warning", "The current booking : " + bookingId + "<br> will be deleted in 15 secondes");

        setTimeout(() => {
            xapi.command("UserInterface Message Prompt Display", {
                Text: "Delete the current booking ?",
                FeedbackId: 'alert_response',
                'Option.1': 'DONT DELETE !',
            }).catch((error) => {
                console.error(error);
            });
            delete_timeout = setTimeout(() => {
                console.log("No presence Detected so the booking has been removed from this device");
                xapi.Command.UserInterface.Message.Prompt.Clear({
                    FeedbackId: "alert_response"
                });
                xapi.Command.UserInterface.Message.Alert.Clear({ });
                xapi.Command.Bookings.Respond({Type: "Decline", MeetingId: meetingId});
                bookingId = null;
                bookingIsActive = false;
                this._lastFullTimer = 0;
                this._lastEmptyTimer = 0;
                this._roomIsFull = false;
                this._roomIsEmpty = false;
            }, 15000);
        }, 5000);
    }

    _checkPresenceAndProcess() {
        this._processPresence();
    }

    async updatePresence() {
        /* 
         * Polling the Cisco information
         * and getting presence information
         */
        const callsData = this._getData('SystemUnit State NumberOfActiveCalls');
        const presenceData = this._getData('RoomAnalytics PeoplePresence');
        const peopleCountData = this._getData('RoomAnalytics PeopleCount Current');
        const soundData = this._getData('RoomAnalytics Sound Level A');
        const presentationData = this._getData('Conference Presentation Mode');

        Promise.all([callsData, presenceData, peopleCountData, soundData, presentationData]).then(results => {
            const numCalls = parseInt(results[0]);
            const presence = results[1] === 'Yes' ? true : false;
            const peopleCount = parseInt(results[2]);
            const soundLevel = parseInt(results[3]);
            const presentationMode = results[4] === 'Off' ? false : true;
            this._data.peopleCount = peopleCount === -1 ? 0 : peopleCount;
            this._data.peoplePresence = presence;
            this._data.sharing = presentationMode;
            if (!USE_ULTRASOUND) {
                // if ultrasound is disabled we set people presence 
                // based only of image reconigition 
                this._data.peoplePresence = this._data.peopleCount ? true : false;
            }
            // process conference calls 
            if (numCalls > 0) {
                this._data.inCall = true;
                this._data.peoplePresence = true;
                // if in call we set that people are present
            } else {
                this._data.inCall = false;
            }

            //process sound level
            if (soundLevel > SOUND_LEVEL) {
                this._data.presenceSound = true;
            } else {
                this._data.presenceSound = false;
            }
            this._processPresence();
        });
    }
}


function displayTextOnScreen(title, msg) {
    xapi.command("UserInterface Message Alert Display", {
        Title: title,
        Text: msg,
        Duration: 0
    });
}

async function beginDetection() {
    /* * Entry point for the macro */

    const presence = new PresenceDetector();
    await presence.enableDetector(); // we set the interval to poll Cisco equipment for the // presence information

    xapi.Status.Bookings.Current.Id.on(async currentBookingId => { //when meeting start
            await presence.updatePresence(); // initialize data
            console.log("Booking " + currentBookingId + " detected");
            bookingIsActive = true;
            bookingId = currentBookingId;
            listenerShouldCheck = true;
            xapi.Command.Bookings.Get({
                Id: currentBookingId
            }).then(booking => {
                meetingId = booking.Booking.MeetingId;
                end_timeout = setTimeout(() => {
                    bookingIsActive = false;
                    listenerShouldCheck = false;
                    bookingId = null;
                    meetingId = null;
                    presence._lastFullTimer = 0;
                    presence._lastEmptyTimer = 0;
                    presence._roomIsFull = false;
                    presence._roomIsEmpty = false;
                    console.log("Booking " + currentBookingId + " ended Stop Checking");
                }, new Date(booking.Booking.Time.EndTime) - new Date().getTime()); //when the booking end the variable bookingIsActive is set to false
            }).catch((err) => {
                //console.log(err);
                bookingIsActive = false;
                listenerShouldCheck = false;
                bookingId = null;
                presence._roomIsFull = false;
                presence._roomIsEmpty = false;
              });
    });


    //Active Call
    xapi.Status.SystemUnit.State.NumberOfActiveCalls.on(numberOfcall => {
        if (bookingIsActive) {
            console.log("Number of active call: " + numberOfcall);
            if (parseInt(numberOfcall) > 0) {
                presence._data.inCall = true;
                presence._data.peoplePresence = true;
                // if in call we set that people are present
            } else {
                presence._data.inCall = false;
            }
            if (listenerShouldCheck) {
                presence._checkPresenceAndProcess();
            }
        }
    });

    //Presence
    xapi.Status.RoomAnalytics.PeoplePresence.on(presenceValue => {
        if (bookingIsActive) {
            console.log("Presence: " + presenceValue);
            presenceValue = presenceValue === 'Yes' ? true : false;
            if (!USE_ULTRASOUND) {
                // if ultrasound is disabled we set people presence 
                // based only of image reconigition 
                presenceValue = presence._data.peopleCount ? true : false;
            }
            presence._data.peoplePresence = presenceValue;
            if (listenerShouldCheck) {
                presence._checkPresenceAndProcess();
            }
        }
    });


    //People Count
    xapi.Status.RoomAnalytics.PeopleCount.Current.on(nb_people => {
        if (bookingIsActive) {
            console.log("Poeple count: " + nb_people);
            nb_people = parseInt(nb_people);
            presence._data.peopleCount = nb_people === -1 ? 0 : nb_people;
            if (!USE_ULTRASOUND) {
                // if ultrasound is disabled we set people presence 
                // based only of image reconigition 
                if (nb_people > 0) {
                    presence._data.peoplePresence = true;
                } else {
                    presence._data.peoplePresence = false;
                }
            }
            if (listenerShouldCheck) {
                presence._checkPresenceAndProcess();
            }
        }
    });

    //Sound Level
    xapi.Status.RoomAnalytics.Sound.Level.A.on(level => {
        if (bookingIsActive) {
            console.log("Sound level: " + level);
            level = parseInt(level);
            if (level > SOUND_LEVEL) {
                presence._data.presenceSound = true;
            } else {
                presence._data.presenceSound = false;
            }
            if (listenerShouldCheck) {
                presence._checkPresenceAndProcess();
            }
        }
    });

    //Close Proximity
    xapi.Status.RoomAnalytics.Engagement.CloseProximity.on(value => {
        if (bookingIsActive) {
            console.log("Close Proximity Presence: " + value);
            value = value === 'True' ? true : false;
            presence._data.closeProximity = value;
            if (listenerShouldCheck) {
                presence._checkPresenceAndProcess();
            }
        }
    });

    //Presentation Mode (Off/Receiving/Sending)
    xapi.Status.Conference.Presentation.Mode.on(mode => {
        if (bookingIsActive) {
            console.log("Presentation Mode: " + mode);
            mode = mode === 'Off' ? false : true;
            presence._data.sharing = mode;
            if (listenerShouldCheck) {
                presence._checkPresenceAndProcess();
            }
        }
    });


    xapi.event.on('UserInterface Message Prompt Response', (event) => {
        switch (event.FeedbackId) {
            case 'alert_response':
                switch (event.OptionId) {
                    case '1':
                        //To stop timeout and not delete current booking even if no presence is detected
                        clearTimeout(delete_timeout);
                        xapi.Command.UserInterface.Message.Alert.Clear({ });
                        listenerShouldCheck = true;
                        presence._data.peoplePresence = true;
                        presence._data.closeProximity = true;
                        presence._roomIsEmpty = false;
                        presence._roomIsFull = true;
                        break;
                    default:
                        break;
                }
                break;
            default:
                break;
        }
    });

}


/**
 * START Detection
 */
beginDetection();