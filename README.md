# Ghost-Meeting
**Target :** Releasing the room when no one is attending.

This macro use the data collected by the Cisco Video Conferencing endpoints to determine if the room is really used during a meeting. When a booking start the macro starts to listen to the metrics update events.

the metrics used are as follows : 

**Active Call**       -> the number of calls in progress

**Presence**         -> presence detection

**People Count**      -> the number of people counted in the room

**Sound Level**       -> the sound level

**Presentation Mode** -> the presentation mode (Off / Receiving / Sending)

## How to run 🔨

1. Clone this repo:

    ```sh
    git clone https://github.com/SarahCiscoFrance/Ghost-Meeting.git
    ```


2. Open a web browser pointing to the IP address of your room device, and sign into the web interface (you will need a user account with 'administrator' role), and go to the Macro Editor section. Then import the script named "ghost-meeting.js" and give it a name (this name will be reused in the step n°4).

3. Get extra access : You need extra access (developer option key or remotesupport user)

4. Then you need to elevate the access of the specific macro:

    ```sh
    xcommand Macros Macro Accessmode Set Name: <name-of-macro> Internal: True
    ```
    (replace <name-of-macro> by the name of the macro in the macro-editor)

5. That will also remove the macro from the macro-editor, so to avoid that, set this config(it might be that this is not necessary if you use a developer option key instead of remotesupport):

    ```sh
    xconfiguration Macros Experimental: True
    ```
