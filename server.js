import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const app = express();
const server = createServer(app);
const io = new Server(server);
const allusers = {};

// file://path/to/your/system/path, fileURLToPath converts url to path, then dirname gives us the directory name
const __dirname = dirname(fileURLToPath(import.meta.url));

// exposing public directory to outside world
app.use(express.static("public"));

// handle incoming http request
app.get("/", (req, res) => {
  console.log("GET Request /");
  res.sendFile(join(__dirname + "/app/index.html"));
});

// handle socket connections
io.on("connection", (socket) => {
  console.log(
    `Someone connected to socket server whose socket id is ${socket.id}`
  );
  socket.on("join-user", (username) => {
    console.log(`${username} joined socket connection`);
    allusers[username] = { username, id: socket.id };
    // inform everyone that someone has joined
    io.emit("joined", allusers);
  });

  socket.on("offer", ({ from, to, offer }) => {
    console.log({ from, to, offer });
    io.to(allusers[to].id).emit("offer", { from, to, offer });
  });

  socket.on("answer", ({ from, to, answer }) => {
    io.to(allusers[from].id).emit("answer", { from, to, answer });
  });

  socket.on("call-rejected", ({ from, to }) => {
    io.to(allusers[from].id).emit("call-rejected", { from: to, to: from });
  });

  socket.on("end-call", ({ from, to }) => {
    io.to(allusers[to].id).emit("end-call", { from, to });
  });

  socket.on("call-ended", (caller) => {
    const [from, to] = caller;
    io.to(allusers[from].id).emit("call-ended", caller);
    io.to(allusers[to].id).emit("call-ended", caller);
  });

  socket.on("icecandidate", (candidate) => {
    console.log({ candidate });
    //broadcast candidate to other peers
    socket.broadcast.emit("icecandidate", candidate);
  });
});

server.listen(9000 /* port */, "0.0.0.0", () => {
  console.log("Server listening on all interfaces at port 9000");
});
