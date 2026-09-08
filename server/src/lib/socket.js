const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

// Every authenticated socket joins a room named after its user id, so the
// webhook handler can push a balance update to exactly one user without
// tracking individual socket ids.
function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: "*" } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
