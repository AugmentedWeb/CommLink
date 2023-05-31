/* CommLink.js
 - Version: 1.0.1
 - Author: Haka
 - Description: A userscript library for cross-window communication via the userscript storage
 - GitHub: https://github.com/AugmentedWeb/CommLink
 */

class CommLinkHandler {
    constructor(commlinkID, configObj) {
        this.commlinkID = commlinkID;
        this.singlePacketResponseWaitTime = configObj?.singlePacketResponseWaitTime || 1500;
        this.maxSendAttempts = configObj?.maxSendAttempts || 3;
        this.statusCheckInterval = configObj?.statusCheckInterval || 1;
        this.silentMode = configObj?.silentMode || false;

        this.commlinkValueIndicator = 'commlink-packet-';
        this.commands = {};
        this.listeners = [];

        const missingGrants = ['GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_listValues']
            .filter(grant => !GM_info.script.grant.includes(grant));

        if(missingGrants.length > 0 && !this.silentMode) {
            alert(`[CommLink] The following userscript grants are missing: ${missingGrants.join(', ')}. CommLink will not work.`);
        }

        this.getStoredPackets()
          .filter(packet => Date.now() - packet.date > 2e4)
          .forEach(packet => this.removePacketByID(packet.id));
    }

    setIntervalAsync(callback, interval = this.statusCheckInterval) {
        let running = true;

        async function loop() {
            while(running) {
                try {
                    await callback();

                    await new Promise((resolve) => setTimeout(resolve, interval));
                } catch (e) {
                    continue;
                }
            }
        };

        loop();

        return { stop: () => running = false };
    }

    getUniqueID() {
        return ([1e7]+-1e3+4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        )
    }

    getCommKey(packetID) {
        return this.commlinkValueIndicator + packetID;
    }

    getStoredPackets() {
        return GM_listValues()
            .filter(key => key.includes(this.commlinkValueIndicator))
            .map(key => GM_getValue(key));
    }

    addPacket(packet) {
        GM_setValue(this.getCommKey(packet.id), packet);
    }

    removePacketByID(packetID) {
        GM_deleteValue(this.getCommKey(packetID));
    }

    findPacketByID(packetID) {
        return GM_getValue(this.getCommKey(packetID));
    }

    editPacket(newPacket) {
        GM_setValue(this.getCommKey(newPacket.id), newPacket);
    }

    send(platform, cmd, d) {
        return new Promise(async resolve => {
            const packetWaitTimeMs = this.singlePacketResponseWaitTime;
            const maxAttempts = this.maxSendAttempts;

            let attempts = 0;

            for (;;) {
                attempts++;

                const packetID = this.getUniqueID();
                const attemptStartDate = Date.now();

                const packet = { sender: platform, id: packetID, command: cmd, data: d, date: attemptStartDate };

                if(!this.silentMode)
                    console.log(`[CommLink Sender] Sending packet! (#${attempts} attempt):`, packet);

                this.addPacket(packet);

                for (;;) {
                    const poolPacket = this.findPacketByID(packetID);
                    const packetResult = poolPacket?.result;

                    if (poolPacket && packetResult) {
                        if(!this.silentMode)
                            console.log(`[CommLink Sender] Got result for a packet (${packetID}):`, packetResult);

                        resolve(poolPacket.result);

                        attempts = maxAttempts; // stop main loop

                        break;
                    }

                    if (!poolPacket || Date.now() - attemptStartDate > packetWaitTimeMs) {
                        break;
                    }

                    await new Promise(res => setTimeout(res, this.statusCheckInterval));
                }

                this.removePacketByID(packetID);

                if (attempts == maxAttempts) {
                    break;
                }
            }

            return resolve(null);
        });
    }

    registerSendCommand(name, obj) {
        this.commands[name] = async data => await this.send(obj?.commlinkID || this.commlinkID , name, obj?.data || data);
    }

    registerListener(sender, commandHandler) {
        const listener = {
            sender,
            commandHandler,
            intervalObj: this.setIntervalAsync(this.receivePackets.bind(this), this.statusCheckInterval),
        };

        this.listeners.push(listener);
    }

    receivePackets() {
        this.getStoredPackets().forEach(packet => {
            this.listeners.forEach(listener => {
                if(packet.sender === listener.sender && !packet.hasOwnProperty('result')) {
                    const result = listener.commandHandler(packet);

                    packet.result = result;

                    this.editPacket(packet);

                    if(!this.silentMode) {
                        if(packet.result == null)
                            console.log('[CommLink Receiver] Possibly failed to handle packet:', packet);
                        else
                            console.log('[CommLink Receiver] Successfully handled a packet:', packet);
                    }
                }
            });
        });
    }

    kill() {
        this.listeners.forEach(listener => listener.intervalObj.stop());
    }
}
