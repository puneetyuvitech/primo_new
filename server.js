// import WebSocket from 'ws'

// // Create a WebSocket server on port 5173
// const socket = new WebSocket.Server({ port: 5173 })

// socket.on('connection', (ws) => {
//   console.log('Client connected')

//   // Send a message to the client upon connection
//   ws.send(JSON.stringify({ message: 'Welcome to WebSocket server!' }))

//   // Handle messages from the client
//   ws.on('message', (message) => {
//     console.log('Received:', message)

//     // Broadcast the received message to all connected clients
//     socket.clients.forEach((client) => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(message)
//       }
//     })
//   })

//   // Handle client disconnection
//   ws.on('close', () => {
//     console.log('Client disconnected')
//   })
// })

// console.log('WebSocket server is running on ws://localhost:5173')

// websocket-client.js
const WebSocket = require('ws')

// Replace with your WebSocket server URL
const WEBSOCKET_URL = 'ws://localhost:5173'

// Create a new WebSocket client instance
const socket = new WebSocket(WEBSOCKET_URL)

// Event listener for when the connection is established
socket.on('open', () => {
  console.log('WebSocket connected')

  // Send an initial message to the server
  socket.send('Hello from client!')
})

// Event listener for when a message is received from the server
socket.on('message', (data) => {
  console.log(`Received message from server: ${data}`)
})

// Event listener for when the connection is closed
socket.on('close', () => {
  console.log('WebSocket connection closed')
})

// Event listener for when an error occurs
socket.on('error', (error) => {
  console.error('WebSocket error:', error)
})
