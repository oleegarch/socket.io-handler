import { createServer } from 'http'
import { Server } from 'socket.io'
import socketHandler from './socketHandler.js'

export const httpServer = createServer()
export const io = new Server(httpServer)
io.on('connection', socketHandler.handleConnection)

export default io