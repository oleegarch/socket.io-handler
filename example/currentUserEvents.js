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