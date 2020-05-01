/**
 * Represents a connected player
 */

import WebSocket from "ws";
import Game from "./Game";
import { randomBytes } from "crypto";

export interface PlayerState {
  position: "game" | "lobby";
  gameCode: string | null;
  name: string;

  guessing: boolean;
  host: boolean;

  active: boolean;
  id: string;

  // Null for the investigator or when not in a game, true/false for everyone else
  wordset: boolean | null;
}

export type ClientMessagesGlobal =
  | {
      scope: "global";
      action: "leave";
    }
  | {
      scope: "global";
      action: "join";
      code: string;
    }
  | {
      scope: "global";
      action: "set-name";
      name: string;
    }
  | {
      scope: "global";
      action: "create";
    };

export default class Player {
  game: Game | null = null;
  socket: WebSocket | null = null;

  alive = false;
  heartbeat: NodeJS.Timeout | null = null;

  session = randomBytes(20).toString("hex");
  static instances = new Map<string, Player>();

  state: PlayerState = {
    position: "lobby",
    gameCode: null,
    name: "",
    guessing: false,
    host: false,
    active: true,
    id: randomBytes(6).toString("hex"),
    wordset: null,
  };

  constructor() {
    // Register in the local session pool, new connections can present this session id to reconnect if they disconnect
    Player.instances.set(this.session, this);
  }

  // Handle game joining and leaving
  handleMessage = (data: WebSocket.Data) => {
    const message: ClientMessagesGlobal = JSON.parse(data.toString());
    if (!message || message.scope !== "global") return;

    switch (message.action) {
      case "leave": {
        this.setGame(null);
        break;
      }

      case "join": {
        const game = Game.instances.get(message.code);

        if (game) {
          this.setGame(game);
        } else {
          this.socket?.send(
            JSON.stringify({
              "error-when": "join",
              error: "A game with that code does not exist",
            })
          );
        }

        break;
      }

      case "set-name": {
        this.setState({
          name: message.name,
        });
        break;
      }

      case "create": {
        const game = new Game();
        game.addPlayer(this);

        this.setGame(game);
      }
    }
  };

  setState(state: Partial<PlayerState>) {
    // Progressively update state (like react does)
    this.state = { ...this.state, ...state };

    this.socket?.send(
      JSON.stringify({
        action: "state-update",
        state: this.state,
      })
    );

    // Tell the game (if connected) to broadcast the new state to everyone
    this.game?.broadcastStates();
  }

  setSocket(socket: WebSocket | null) {
    this.socket = socket;

    if (this.socket !== null) {
      // Set up listeners

      this.socket.on("close", () => this.setSocket(null));
      this.socket.on("pong", () => (this.alive = true));
      this.socket.on("message", this.handleMessage);

      this.alive = true;

      // Set up the heartbeat
      this.heartbeat = setInterval(() => {
        // If they haven't responded since the last heartbeat the connection is broken
        if (!this.alive) {
          this.socket?.terminate();
          this.setSocket(null);
        }

        this.alive = false;
        this.socket?.ping();
      }, 10 * 1000);

      // Set them to be alive
      this.setState({
        active: true,
      });

      // Update them on their player state
      this.socket.send(
        JSON.stringify({
          action: "state-update",
          state: this.state,
        })
      );

      // Update the game telling them that
    } else {
      // Stop pinging them
      if (this.heartbeat !== null) clearInterval(this.heartbeat);

      // Notice we're not deleting the player from the game, in case they reconnect,
      // the alive property on the player will indicate whether there is a socket currently connected
      this.setState({
        active: false,
      });

      // If the host goes inactive, reassign the host
      if (this.state.host) {
        console.log("Reassign host from player");
        this.game?.reassignHost();
      }
    }
  }

  /**
   * Appropriately leaves that body
   * @param game New game or null if leaving
   */
  setGame(game: Game | null) {
    if (game !== null) {
      this.setState({
        position: "game",
        gameCode: game.code,
      });

      game.addPlayer(this);
    } else {
      this.setState({
        position: "lobby",
        gameCode: null,
        host: false,
        guessing: false,
        wordset: null,
      });
    }

    this.game?.removePlayer(this);

    this.game = game;
  }
}
