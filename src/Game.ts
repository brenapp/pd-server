/**
 * Abstracts around a game
 */

import WebSocket from "ws";
import { randomBytes } from "crypto";
import Player from "./Player";

type ClientMessagesGame = {};

export default class Game {
  code = randomBytes(2).toString("hex").toUpperCase();
  static instances = new Map<string, Game>();

  players: Set<Player> = new Set<Player>();

  constructor() {
    Game.instances.set(this.code, this);
  }

  // Player management
  addPlayer(player: Player) {
    // Set the player as host if they're the first one here
    if (this.players.size < 1) {
      player.setState({
        guessing: true,
        host: true,
      });
    }

    this.players.add(player);
    this.broadcastStates();
  }

  removePlayer(player: Player) {
    // If they're the host reassign
    if (player.state.host) {
      player.setState({
        host: false,
      });

      [...this.players.values()][0].setState({
        host: true,
      });
    }

    this.players.delete(player);
    this.broadcastStates();
  }

  broadcast(data: { broacastType: string; [key: string]: any }) {
    for (const player of this.players) {
      player.socket?.send(JSON.stringify({ action: "broadcast", ...data }));
    }
  }

  // For whenever state changes
  broadcastStates() {
    const states = [...this.players].map((player) => player.state);
    this.broadcast({
      broacastType: "state-update",
      states,
    });
  }
}
