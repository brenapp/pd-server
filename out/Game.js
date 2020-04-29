"use strict";
/**
 * Abstracts around a game
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = require("crypto");
var Game = /** @class */ (function () {
    function Game() {
        this.code = crypto_1.randomBytes(2).toString("hex").toUpperCase();
        this.players = new Set();
        Game.instances.set(this.code, this);
    }
    // Player management
    Game.prototype.addPlayer = function (player) {
        // Set the player as host if they're the first one here
        if (this.players.size < 1) {
            player.setState({
                guessing: true,
                host: true,
            });
        }
        this.players.add(player);
        this.broadcastStates();
    };
    Game.prototype.removePlayer = function (player) {
        // If they're the host reassign
        if (player.state.host) {
            player.setState({
                host: false,
            });
            __spread(this.players.values())[0].setState({
                host: true,
            });
        }
        this.players.delete(player);
        this.broadcastStates();
    };
    Game.prototype.broadcast = function (data) {
        var e_1, _a;
        var _b;
        try {
            for (var _c = __values(this.players), _d = _c.next(); !_d.done; _d = _c.next()) {
                var player = _d.value;
                (_b = player.socket) === null || _b === void 0 ? void 0 : _b.send(JSON.stringify(__assign({ action: "broadcast" }, data)));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    // For whenever state changes
    Game.prototype.broadcastStates = function () {
        var states = __spread(this.players).map(function (player) { return player.state; });
        this.broadcast({
            broacastType: "state-update",
            states: states,
        });
    };
    Game.instances = new Map();
    return Game;
}());
exports.default = Game;
