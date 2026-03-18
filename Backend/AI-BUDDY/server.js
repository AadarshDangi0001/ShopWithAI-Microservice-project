import 'dotenv/config';
import app from './src/app.js';
import http from 'http';
import initializeSocketServer from './src/sockets/socket.server.js';

const httpServer = http.createServer(app);


initializeSocketServer(httpServer);

const PORT = process.env.PORT || 3005;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});