import ValidateSchema from 'validate'

export default class SocketHandler {
    constructor(events, options = {}) {
        this.events = events;
        this.onEvents = [];
        this.debug = options.debug ?? false;
        for(const event in events) {
            const eventObject = events[event];
            
            if(
                typeof eventObject.onSocket === 'object' &&
                eventObject.onSocket != null &&
                !Array.isArray(eventObject.onSocket)
            ) {
                for(const additionalEventName in eventObject.onSocket) {
                    const additionalEventObject = eventObject.onSocket[additionalEventName];
                    this.addEvent(additionalEventName, additionalEventObject);
                }
            }

            if(eventObject.onSocketEvent) {
                this.addEvent(event, eventObject);
            }
        }
        return this;
    }
    addEvent(name, obj) {
        const data = {};

        if(typeof obj === 'function') {
            data['onSocketEvent'] = obj;
        }
        else {
            data = obj;
        }

        this.onEvents.push({ 'event': name, ...data });
    }
    async handleConnection(socket) {

        socket.__handlingSocketEvent = {};

        for(const eventObject of this.onEvents) {
            let { event, validate, businessLogic, preSocketEvent, onSocketEvent, postSocketEvent } = eventObject;

            const onEvent = async (data, cb) => {
                if(this.debug) console.log('[SocketHandler]: new socket event', event, data);

                if(typeof data === 'function') {
                    cb = data;
                }
                if(typeof cb !== 'function') {
                    cb = () => console.error(new Error(`[SocketHandler]: You called the callback, but the callback was not passed on the client side on event '${event}'!`));
                }

                const clientCb = cb;
                cb = (error, ...args) => {
                    if(error instanceof Error) {
                        console.error(new Error(`[SocketHander]: The error looks like a server error! Never send server errors to the client - for security! The client will receive an error in the form of the string 'server_error'! Your error of '${event}' event:`), error);
                        return clientCb('server_error');
                    }
                    clientCb(error, ...args);
                }

                if(validate != null) {
                    if(!(validate instanceof ValidateSchema)) {
                        validate = eventObject['validate'] = new ValidateSchema(validate);
                    }
                    const validateSchema = validate;
                    const validateErrors = validateSchema.validate(data);
                    if(Array.isArray(validateErrors) && validateErrors.length) {
                        return cb(validateErrors[0].message);
                    }
                }

                try {
                    if(
                        (businessLogic === true && socket.__handlingSocketEvent[event] === true) ||
                        (businessLogic === 'all' && Object.keys(socket.__handlingSocketEvent).length > 0) ||
                        (Array.isArray(businessLogic) && Object.keys(socket.__handlingSocketEvent).some(eventName => businessLogic.includes(eventName)))
                    ) {
                        if(this.debug) console.log('[SocketHandler]: business logic error for event', event, data);
                        return cb('previous_process_was_running');
                    }

                    socket.__handlingSocketEvent[event] = true;

                    if(typeof preSocketEvent === 'function') {
                        await preSocketEvent(socket, data);
                    }

                    let response;
                    await onSocketEvent(socket, data, (...args) => response = args);
                    
                    if(typeof postSocketEvent === 'function') {
                        await postSocketEvent(socket, data);
                    }

                    cb(...response);

                } catch(error) {
                    console.error(new Error(`[SocketHander]: A error that you didn't catch has been caught! The client will receive the string 'server_error' as an error! At best, you should catch the errors yourself and send them to the client! Your error:`), error);
                    cb('server_error');
                }

                delete socket.__handlingSocketEvent[event];
            }
            
            if(event === 'connect' || event === 'connection') {
                await onEvent();
            }
            else {
                socket.on(event, onEvent);
            }
        }
    }
}