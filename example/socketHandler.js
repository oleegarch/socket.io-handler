import SocketHandler from '@oleegarch/socket.io-handler'
import * as currentUserEvents from './currentUserEvents.js'
import * as settingsEvents from './settingsEvents.js'

const events = [
    ...currentUserEvents,
    ...settingsEvents
];

export default new SocketHandler(events, { debug: true });