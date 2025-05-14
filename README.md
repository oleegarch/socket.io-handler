# @oleegarch/socket.io-handler

A lightweight and flexible wrapper for structuring `socket.io` events as declarative objects.  
It allows you to organize your event logic cleanly, validate incoming data, prevent parallel event calls (anti-spam), and hook into `connect`/`disconnect` events.

---

## ✨ Features

- Declarative event definitions as plain objects
- Per-event validation using [`validate`](https://www.npmjs.com/package/validate)
- Built-in middleware support:
  - `preSocketEvent` – validate/authenticate before handling
  - `onSocketEvent` – actual event logic
  - `postSocketEvent` – optional post-processing
- Hooks into `connect`, `disconnect`, etc.
- Optional `businessLogic` flag to block parallel execution per socket & event
- Debugging support

---

## 🚀 Installation

```bash
npm install @oleegarch/socket.io-handler
```

---

## 📦 Usage Example
## io.js – Initialize socket.io and attach the handler

```js
import { createServer } from 'http';
import { Server } from 'socket.io';
import socketHandler from './socketHandler.js';

export const httpServer = createServer();
export const io = new Server(httpServer);

io.on('connection', socketHandler.handleConnection);

export default io;
```

## socketHandler.js – Combine events from multiple modules

```js
import SocketHandler from '@oleegarch/socket.io-handler'
import * as currentUserEvents from './currentUserEvents.js'
import * as settingsEvents from './settingsEvents.js'

const events = [
    ...currentUserEvents,
    ...settingsEvents
];

export default new SocketHandler(events, { debug: true });
```

## currentUserEvents.js – Example: Authenticated user event

```js
// auxiliary methods
export async function attachUserToSocket(socket) {
    /* example: */
    const userId = 123123;
    socket.user = await findUser(userId);
}
export async function tryAttachUserIfNeed(socket) {
    if(socket.user == null) {
        await attachUserToSocket(socket);
    }
}
export async function saveUser(socket) {
    /* example: */
    return await socket.user.save();
}

// the event returns the client's data from the database 
export const getCurrentUser = {

    // it is forbidden to execute this event more than once at the same time.
    businessLogic: true,

    // You can listen to any other events in any event object.
    // Here we will listen to the connect event and find the user's data automatically.
    // But this can also be done by calling the getCurrentUser event from the client and handle it in onSocketEvent handler
    onSocket: {
        async connect(socket) {
            try {
                await attachUserToSocket(socket);
            }
            catch(e) {
                socket.disconnect();
            }
        },
        disconnect(socket, data) {
            /* example: */
            console.log('socket disconnected', socket.id, data);
            clearUserFromCache();
        }
    },

    // use preSocketEvent handler for additional validating
    // if preSocketEvent does not catch errors, then onSocketEvent will be called below
    /* can be async */
    preSocketEvent(socket) {
        if(socket.user != null) {
            return cb('user_already_exists');
        }
    },

    // getCurrentUser is the name of the event, and onSocketEvent is the handler of this event.
    async onSocketEvent(socket, data, cb) {
        await attachUserToSocket(socket); // if an error occurs here, the client will receive a 'server_error' string, and the error will be in the console.
        cb(null, socket.user); // the first argument always indicates an error.
    }
};
```

## settingsEvents.js – Example: Validated event with post-processing

```js
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
```