"use strict";
/**
 * Represents a connected player
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var Game_1 = __importDefault(require("./Game"));
var crypto_1 = require("crypto");
var Player = /** @class */ (function () {
    function Player() {
        var _this = this;
        this.game = null;
        this.socket = null;
        this.alive = false;
        this.heartbeat = null;
        this.session = crypto_1.randomBytes(20).toString("hex");
        this.state = {
            position: "lobby",
            gameCode: null,
            name: "",
            guessing: false,
            host: false,
        };
        // Handle game joining and leaving
        this.handleMessage = function (data) {
            var _a;
            var message = JSON.parse(data.toString());
            if (!message || message.scope !== "global")
                return;
            switch (message.action) {
                case "leave": {
                    _this.setGame(null);
                    break;
                }
                case "join": {
                    var game = Game_1.default.instances.get(message.code);
                    if (game) {
                        _this.setGame(game);
                    }
                    else {
                        (_a = _this.socket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({
                            "error-when": "join",
                            error: "A game with that code does not exist",
                        }));
                    }
                    break;
                }
                case "set-name": {
                    _this.setState({
                        name: message.name,
                    });
                    break;
                }
                case "create": {
                    var game = new Game_1.default();
                    game.addPlayer(_this);
                    _this.setGame(game);
                }
            }
        };
        // Register in the local session pool, new connections can present this session id to reconnect if they disconnect
        Player.instances.set(this.session, this);
    }
    Player.prototype.setState = function (state) {
        var _a, _b;
        // Progressively update state (like react does)
        this.state = __assign(__assign({}, this.state), state);
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({
            action: "state-update",
            state: this.state,
        }));
        // Tell the game (if connected) to broadcast the new state to everyone
        (_b = this.game) === null || _b === void 0 ? void 0 : _b.broadcastStates();
    };
    Player.prototype.setSocket = function (socket) {
        var _this = this;
        this.socket = socket;
        if (this.socket !== null) {
            // Set up listeners
            this.socket.on("close", function () { return _this.setSocket(null); });
            this.socket.on("pong", function () { return (_this.alive = true); });
            this.socket.on("message", this.handleMessage);
            this.alive = true;
            // Set up the heartbeat
            this.heartbeat = setInterval(function () {
                var _a, _b;
                // If they haven't responded since the last heartbeat the connection is broken
                if (!_this.alive) {
                    (_a = _this.socket) === null || _a === void 0 ? void 0 : _a.terminate();
                    _this.setSocket(null);
                }
                _this.alive = false;
                (_b = _this.socket) === null || _b === void 0 ? void 0 : _b.ping();
            }, 10 * 1000);
            // Update them on their player state
            this.socket.send(JSON.stringify({
                action: "state-update",
                state: this.state,
            }));
        }
        else {
            // Stop pinging them
            if (this.heartbeat !== null)
                clearInterval(this.heartbeat);
            // Notice we're not deleting the player from the game, in case they reconnect,
            // the alive property on the player will indicate whether there is a socket currently connected
        }
    };
    /**
     * Appropriately leaves that body
     * @param game New game or null if leaving
     */
    Player.prototype.setGame = function (game) {
        var _a;
        if (game !== null) {
            this.setState({
                position: "game",
                gameCode: game.code,
            });
            game.addPlayer(this);
        }
        else {
            this.setState({
                position: "lobby",
            });
        }
        (_a = this.game) === null || _a === void 0 ? void 0 : _a.removePlayer(this);
        this.game = game;
    };
    Player.instances = new Map();
    return Player;
}());
exports.default = Player;
