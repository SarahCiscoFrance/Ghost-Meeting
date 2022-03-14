# Ghost-Meeting
**Target :** Releasing the room when no one is attending.

This macro use the data collected by the Cisco Video Conferencing endpoints to determine if the room is really used during a meeting. When a booking start the macro starts to listen to the metrics update events.

The following metrics are used: 

**Active Call**       -> the number of calls in progress

**Presence**         -> presence detection

**People Count**      -> the number of people counted in the room

**Sound Level**       -> the sound level in the room

**Presentation Mode** -> the presentation mode (Off / Receiving / Sending)

## How to run 🔨

1. Clone this repo:

    ```sh
    git clone https://github.com/SarahCiscoFrance/Ghost-Meeting.git
    ```


2. Open a web browser pointing to the IP address of your room device, and sign into the web interface (you will need a user account with 'administrator' role), and go to the Macro Editor section. Then import the script named "ghost-meeting.js".
 
3. Also in the macro you have to set one of the 2 variables: const USE_PEOPLE_COUNT_ONLY OR const USE_PRESENCE_AND_COUNT to true to make it work


## Requirements

The device must have a calendar enabled.

