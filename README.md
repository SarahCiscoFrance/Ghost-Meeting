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


2. Open a web browser pointing to the IP address of your room device, and sign into the web interface (you will need a user account with 'administrator' role), and go to the Macro Editor section. Then import the script named "ghost-meeting.js" and give it a name (this name will be reused in the step n°5).

3. Connect to the device with ssh and set this config:
    ```sh
    xconfiguration RoomScheduler Allowroomresponse: True
    ```

**Note**

The xAPI to Decline a meeting in this Macro is currently a Public-Preview API. Until it is made Public you will need to obtain a Developer Option Key for your device to have access to the API.

This will only be needed while the API is in Public-Preview.

