/**
 * Abstracts around a game
 */

import WebSocket from "ws";
import { randomBytes } from "crypto";
import Player from "./Player";

type ClientMessagesGame = {
  scope: "game";
  action: "set-guessing";
  guessing: string;
};

export default class Game {
  code = randomBytes(2).toString("hex").toUpperCase();
  static instances = new Map<string, Game>();

  players: Map<string, Player> = new Map<string, Player>();

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

    this.players.set(player.state.id, player);
    this.broadcastStates();
    player.socket?.on("message", this.handleMessage);
  }

  removePlayer(player: Player) {
    // If they're the host reassign
    if (player.state.host) {
      this.reassignHost();
    }

    this.players.delete(player.state.id);
    this.broadcastStates();
    player.socket?.off("message", this.handleMessage);
  }

  reassignHost() {
    let oldHost: Player | null = null;

    // Remove the host
    for (const [id, player] of this.players) {
      if (player.state.host) {
        oldHost = player;
        player.setState({ host: false });
        break;
      }
    }

    // Make the new one (first player who is active and wasn't the previous host)
    for (const [id, player] of this.players) {
      if (id != oldHost?.state.id && player.state.active) {
        player.setState({ host: true });
        break;
      }
    }
  }

  setGuessing(guessing: string) {
    for (const [id, player] of this.players) {
      if (id === guessing) {
        player.setState({ guessing: true });
      } else {
        player.setState({ guessing: false });
      }
    }
  }

  handleMessage = (data: WebSocket.Data) => {
    const message: ClientMessagesGame = JSON.parse(data.toString());
    if (!message || message.scope !== "game") return;

    switch (message.action) {
      case "set-guessing":
        this.setGuessing(message.guessing);
        break;
    }
  };

  broadcast(data: { broadcastType: string; [key: string]: any }) {
    for (const [id, player] of this.players) {
      player.socket?.send(JSON.stringify({ action: "broadcast", ...data }));
    }
  }

  // For whenever state changes
  broadcastStates() {
    const states = [...this.players].map(([id, player]) => player.state);
    this.broadcast({
      broadcastType: "state-update",
      states,
    });
  }
}
