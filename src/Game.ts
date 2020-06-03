/**
 * Abstracts around a game
 */

import WebSocket from "ws";
import { randomBytes } from "crypto";
import Player from "./Player";

type ClientMessagesGameHost =
  | {
      scope: "game";
      action: "set-guessing";
      guessing: string;
    }
  | {
      scope: "game";
      action: "boot-inactive";
    }
  | {
      scope: "game";
      action: "select-word";
    }
  | {
      scope: "game";
      action: "reset-game";
    };

type ClientMessagesGameAll =
  | {
      scope: "game";
      action: "set-own-word";
      word: string;
    }
  | {
      scope: "game";
      action: "guess-liar";
      id: string;
    };

export default class Game {
  // Random 4-digit number
  code = Math.floor(1000 + Math.random() * 9000).toString();
  static instances = new Map<string, Game>();

  players: Map<string, Player> = new Map<string, Player>();
  host: Player | null = null;
  guessing: Player | null = null;

  words: Map<string, Player> = new Map<string, Player>();
  selectedWord: string | null = null;

  round = 1;

  // Keep track of points
  points: { [player: string]: number } = {};

  constructor() {
    Game.instances.set(this.code, this);
  }

  // Player management
  addPlayer(player: Player) {
    // If we're missing a host set it
    if (!this.host) {
      player.setState({ host: true });
      player.socket?.on("message", this.handleMessageHost);
      this.host = player;
    }

    // If no one is guessing set it
    if (!this.guessing) {
      player.setState({ guessing: true, wordset: null });
      this.guessing = player;
    } else {
      player.setState({ wordset: false });
    }

    // Set their score to 0
    this.points[player.state.id] = 0;

    this.players.set(player.state.id, player);
    this.broadcastStates();
    player.socket?.on("message", this.handleMessageAll(player));
  }

  removePlayer(player: Player) {
    // If they're the host reassign
    if (player.state.host) {
      console.log("Reassign host from game");
      this.reassignHost();
    }

    this.players.delete(player.state.id);
    this.broadcastStates();
    player.socket?.off("message", this.handleMessageAll(player));
  }

  reassignHost() {
    console.log("Reassign host");
    let oldHost: Player | null = null;

    this.host = null;

    // Remove the host
    for (const [id, player] of this.players) {
      if (player.state.host) {
        oldHost = player;
        player.setState({ host: false });
        player.socket?.off("message", this.handleMessageHost);
        break;
      }
    }

    // Make the new one (first player who is active and wasn't the previous host)
    for (const [id, player] of this.players) {
      if (id != oldHost?.state.id && player.state.active) {
        player.setState({ host: true });
        player.socket?.on("message", this.handleMessageHost);
        this.host = player;
        break;
      }
    }

    // If there are no active players in a game, we are going to delete it and boot everyone back to the lobby
    if (this.host === null) {
      Game.instances.delete(this.code);

      for (const [id, player] of this.players) {
        player.setGame(null);
      }
    }
  }

  setGuessing(guessing: string) {
    for (const [id, player] of this.players) {
      if (id === guessing) {
        player.setState({ guessing: true });
        this.guessing = player;
      } else {
        player.setState({ guessing: false });
      }
    }
  }

  bootInactive() {
    for (const [id, player] of this.players) {
      if (!player.state.active) player.setGame(null);
    }
  }

  handleMessageHost = (data: WebSocket.Data) => {
    const message: ClientMessagesGameHost = JSON.parse(data.toString());
    if (!message || message.scope !== "game") return;

    switch (message.action) {
      case "set-guessing":
        this.setGuessing(message.guessing);
        break;
      case "boot-inactive":
        this.bootInactive();
        break;

      case "select-word":
        const words = [...this.words.keys()];
        this.selectedWord = words[Math.floor(words.length * Math.random())];

        // Broadcast the selected word
        this.broadcastStates();

        break;

      case "reset-game":
        this.words.clear();

        // Cycle through who's guessing
        const players = [...this.players.values()];

        for (const [i, player] of Object.entries(players)) {
          player.setState({
            wordset: false,
            guessing: this.round % players.length === +i,
          });
        }

        // Next round
        this.round++;

        this.selectedWord = null;

        this.broadcast({
          broadcastType: "game-reset",
          round: this.round,
        });
        this.broadcastStates();

        break;
    }
  };

  handleMessageAll = (player: Player) => {
    return (data: WebSocket.Data) => {
      const message: ClientMessagesGameAll = JSON.parse(data.toString());
      console.log("Handle message all", player.state.name, message);
      if (!message || message.scope !== "game") return;

      switch (message.action) {
        case "set-own-word":
          this.words.set(message.word, player);
          player.setState({
            wordset: true,
          });
          break;
        case "guess-liar":
          this.handleGuess(message.id);
          break;
      }
    };
  };

  handleGuess(guess: string) {
    const player = this.players.get(guess);
    const correct =
      player &&
      player.state.id === this.words.get(this.selectedWord as string)?.state.id;

    // Handle point changes
    this.points[guess]++;

    if (correct && this.guessing !== null) {
      this.points[this.guessing.state.id]++;
    }

    // Broadcast the result
    this.broadcast({
      broadcastType: "guess-result",
      correct,
      guess: this.players.get(guess)?.state.name,
      truth: this.words.get(this.selectedWord as string)?.state.name,
      points: this.points,
    });

    this.broadcastStates();
  }

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

      // Game state
      selectedWord: this.selectedWord,
      points: this.points,
      round: this.round,
    });
  }
}
