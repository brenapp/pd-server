"use strict";
/**
 * Sets up the websocket server, and facilitates connections between
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = require("ws");
var Player_1 = __importDefault(require("./Player"));
var server = new ws_1.Server({
    port: 8888,
});
/**
 * Whenever a client connects, mediate it through creating a new session or restoring an old one,
 * and then ping and reassign
 */
server.on("connection", function (socket, req) {
    /* The first message establishes whether the client is new or returning
     * It takes the form
     * {
     *  "connection": "new" | "restore",
     *  "session": "" (only if connection is restore)
     * }
     **/
    console.log("Client connected from " + req.socket.remoteAddress);
    socket.once("message", function (data) {
        var message = JSON.parse(data.toString());
        var player;
        if (message.connection === "new") {
            player = new Player_1.default();
        }
        else if (message.connection === "restore") {
            // Try and find the session, and if it doesn't exist then make a new one
            player = Player_1.default.instances.get(message.session) || new Player_1.default();
        }
        else {
            socket.send(JSON.stringify({
                "error-when": "greeting",
                error: "Unable to parse greeting!",
            }));
            socket.terminate();
            return;
        }
        socket.send(JSON.stringify({
            action: "session-set",
            session: player.session,
        }));
        // Set the player
        player.setSocket(socket);
    });
});
server.on("listening", function () {
    return console.log("TOPTAL Server has been started! Listening for connections on port 8888");
});
