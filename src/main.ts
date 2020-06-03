/**
 * Sets up the websocket server, and facilitates connections between
 */

import WebSocket, { Server } from "ws";
import Game from "./Game";
import Player from "./Player";
import https from "https";
import fs from "fs";

import server from "./server";

server.on("error", console.log);

type ClientGreetingMessage =
  | {
      connection: "new";
    }
  | {
      connection: "restore";
      session: string;
    };

/**
 * Whenever a client connects, mediate it through creating a new session or restoring an old one,
 * and then ping and reassign
 */
server.on("connection", (socket, req) => {
  /* The first message establishes whether the client is new or returning
   * It takes the form
   * {
   *  "connection": "new" | "restore",
   *  "session": "" (only if connection is restore)
   * }
   **/

  console.log(`Client connected from ${req.socket.remoteAddress}`);

  socket.once("message", (data: WebSocket.Data) => {
    const message: ClientGreetingMessage = JSON.parse(data.toString());

    let player: Player;

    if (message.connection === "new") {
      player = new Player();
    } else if (message.connection === "restore") {
      // Try and find the session, and if it doesn't exist then make a new one
      player = Player.instances.get(message.session) || new Player();
    } else {
      socket.send(
        JSON.stringify({
          "error-when": "greeting",
          error: "Unable to parse greeting!",
        })
      );
      socket.terminate();
      return;
    }

    socket.send(
      JSON.stringify({
        action: "session-set",
        session: player.session,
      })
    );

    console.log(`ESTABLISH ${player.session}`);

    // Set the player
    player.setSocket(socket);
  });
});

server.on("listening", () =>
  console.log(
    "TOPTAL Server has been started! Listening for connections on port 8888"
  )
);
