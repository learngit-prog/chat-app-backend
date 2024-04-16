const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*"
    }
});

const roomData = {};

app.get("/", (req, res) => {
    res.send("You are connectd to the server ");
});

io.on('connection', (socket) => {
    console.log("A user connected.");

    socket.on("join", (roomId, userName) => {
        socket.join(roomId);
        roomData[socket.id] = { userName, roomId };
        const allUsers = getUsersInRoom(roomId);
        io.sockets.in(roomId).emit("newjoin", userName, allUsers, socket.id);
    });

    // Handle cursor movements
    socket.on("cursorMove", (cursorPosition, roomId) => {
        socket.to(roomId).emit("cursorMove", cursorPosition);
    });

    socket.on("codechange", (c, roomId) => {
        socket.to(roomId).emit("codechange", c);
    });

    socket.on("inputchange", (c, roomId) => {
        socket.to(roomId).emit("inputchange", c);
    });

    socket.on("langchange", (lang, userName, roomId) => {
        socket.to(roomId).emit("langchange", lang, userName);
    });

    socket.on("sync", (editorData, inputData, lang, id) => {
        io.to(id).emit("codechange", editorData);
        io.to(id).emit("inputchange", inputData);
        io.to(id).emit("langchange", lang);
    });

    socket.on("disconnect", () => {
        console.log("A user is disconnecting");
        const userData = roomData[socket.id];
        if (userData) {
            const { roomId, userName } = userData;
            socket.leave(roomId);
            delete roomData[socket.id];
            socket.to(roomId).emit("leave", userName);
        }
    });
});

function getUsersInRoom(roomId) {
    const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
    if (socketsInRoom) {
        return [...socketsInRoom].map(id => roomData[id].userName);
    }
    return [];
}

const port = process.env.PORT || 4000;
http.listen(port, () => {
    console.log("Server started on ", port);
});
