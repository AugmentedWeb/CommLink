# CommLink

CommLink is an open source library for userscripts that enables cross-window communication via the userscript storage. It provides a simple and efficient way to send and receive messages between different instances of a userscript running in separate browser windows.

## Installation

To use CommLink in your userscript, you need to add the following lines to the userscript header,
```js
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @require     https://greasyfork.org/scripts/470418-commlink-js/code/CommLinkjs.js?version=1217207
```

> **Warning** DO NOT REQUIRE ANY FILES FROM THIS REPOSITORY DIRECTLY! CommLink is currently not in its final form and the logic might change in the future. Only use the version controlled GreasyFork URL to require CommLink for now. Thank you so much for your understanding.

## Usage

I'm so sorry, but I am too lazy to write documentation right now. You can check the examples to get an idea.

CommLink is currently just a byproduct of the A.C.A.S project. I wouldn't use CommLink for your personal large-scale projects.

## Examples

### Site #1

```js
const CommLink = new CommLinkHandler(`frontend_${commLinkInstanceID}`, {
    'singlePacketResponseWaitTime': 1500,
    'maxSendAttempts': 3,
    'statusCheckInterval': 1,
    'silentMode': false
});

// manually register a command so that the variables are dynamic
CommLink.commands['createInstance'] = async () => {
    return await CommLink.send('mum', 'createInstance', {
        'domain': window.location.hostname.replace('www.', ''),
        'instanceID': commLinkInstanceID,
        'chessVariant': getSiteChessVariant(),
        'playerColor': getPlayerColorVariable()
    });
}

CommLink.registerSendCommand('ping', { commlinkID: 'mum', data: 'ping' });
CommLink.registerSendCommand('pingInstance', { data: 'ping' });
CommLink.registerSendCommand('log');
CommLink.registerSendCommand('updateBoardOrientation');
CommLink.registerSendCommand('updateBoardFen');
CommLink.registerSendCommand('calculateBestMoves');

CommLink.registerListener(`backend_${commLinkInstanceID}`, packet => {
    try {
        switch(packet.command) {
            case 'ping':
                return `pong (took ${Date.now() - packet.date}ms)`;
            case 'getFen':
                return new FenUtils().getFen();
            case 'removeSiteMoveMarkings':
                removeSiteMoveMarkings();
                return true;
            case 'markMoveToSite':
                markMoveToSite(packet.data);
                return true;
        }
    } catch(e) {
        return null;
    }
});

// [other code] //

CommLink.commands.log(`Hello World!`);
```

### Site #2 file #1

```js
const MainCommLink = new USERSCRIPT.CommLinkHandler('mum', {
    'singlePacketResponseWaitTime': 1500,
    'maxSendAttempts': 3,
    'statusCheckInterval': 1
});

MainCommLink.registerListener('mum', packet => {
    try {
        switch(packet.command) {
            case 'ping':
                return `pong (took ${Date.now() - packet.date}ms)`;
            case 'createInstance':
                log.info('Received request to create another engine instance!');

                const data = packet.data;

                console.log(data);

                createInstance(data.domain, data.instanceID, data.chessVariant, data.playerColor);

                return true;
        }
    } catch(e) {
        console.error(e);
        return null;
    }
});
```

### Site #2 file #2

```js
this.CommLink = new USERSCRIPT.CommLinkHandler(`backend_${this.instanceID}`, {
    'singlePacketResponseWaitTime': 1500,
    'maxSendAttempts': 3,
    'statusCheckInterval': 1
});

this.CommLink.registerSendCommand('ping');
this.CommLink.registerSendCommand('getFen');
this.CommLink.registerSendCommand('removeSiteMoveMarking');
this.CommLink.registerSendCommand('markMoveToSite');

this.CommLinkReceiver = this.CommLink.registerListener(`frontend_${this.instanceID}`, packet => {
    try {
        if(this.instanceReady)
            return this.processPacket(packet);

        this.unprocessedPackets.push(packet);

        return true;
    } catch(e) {
        console.error('Instance:', this.domain, this.instanceID, e);
        return null;
    }
});
```

## Compatibility

CommLink relies on userscript grants such as GM_getValue, GM_setValue, GM_deleteValue, and GM_listValues to access the userscript storage. Please ensure that your userscript has the necessary grants for CommLink to function correctly.

If any of the required grants are missing, CommLink will display an alert message
