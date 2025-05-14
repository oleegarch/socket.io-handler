import { tryAttachUserIfNeed, saveUser } from './currentUserEvents.js'

// Let's imagine that our application has sounds and music, and this method will change the volume.
export const changeVolume = {
    businessLogic: true,

    // validate schema object for https://www.npmjs.com/package/validate
    validate: {
        settingsName: {
            type: String,
            enum: ['sounds', 'music'],
            required: true
        },
        value: {
            type: Number,
            size: { min: 0, max: 100 },
            required: true
        }
    },

    preSocketEvent: tryAttachUserIfNeed, // use preSocketEvent handler for additional validating
    postSocketEvent: saveUser, // if onSocketEvent is processed successfully and cb is called without error, then if there is an error in postSocketEvent, the error will be sent to the client, not the result.

    onSocketEvent(socket, data, cb) {
        // example of change volume settings
        const { settingsName, value } = data;
        /* example: */
        socket.user.settings[settingsName] = value;

        // send updated settings in user in second argument
        return cb(null, socket.user.settings);
    }
};