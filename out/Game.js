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
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = require("crypto");
var Game = /** @class */ (function () {
    function Game() {
        var _this = this;
        this.code = crypto_1.randomBytes(2).toString("hex").toUpperCase();
        this.players = new Map();
        this.handleMessage = function (data) {
            var message = JSON.parse(data.toString());
            if (!message || message.scope !== "game")
                return;
            switch (message.action) {
                case "set-guessing":
                    _this.setGuessing(message.guessing);
                    break;
            }
        };
        Game.instances.set(this.code, this);
    }
    // Player management
    Game.prototype.addPlayer = function (player) {
        var _a;
        // Set the player as host if they're the first one here
        if (this.players.size < 1) {
            player.setState({
                guessing: true,
                host: true,
            });
        }
        this.players.set(player.state.id, player);
        this.broadcastStates();
        (_a = player.socket) === null || _a === void 0 ? void 0 : _a.on("message", this.handleMessage);
    };
    Game.prototype.removePlayer = function (player) {
        var _a;
        // If they're the host reassign
        if (player.state.host) {
            this.reassignHost();
        }
        this.players.delete(player.state.id);
        this.broadcastStates();
        (_a = player.socket) === null || _a === void 0 ? void 0 : _a.off("message", this.handleMessage);
    };
    Game.prototype.reassignHost = function () {
        var e_1, _a, e_2, _b;
        var oldHost = null;
        try {
            // Remove the host
            for (var _c = __values(this.players), _d = _c.next(); !_d.done; _d = _c.next()) {
                var _e = __read(_d.value, 2), id = _e[0], player = _e[1];
                if (player.state.host) {
                    oldHost = player;
                    player.setState({ host: false });
                    break;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            // Make the new one (first player who is active and wasn't the previous host)
            for (var _f = __values(this.players), _g = _f.next(); !_g.done; _g = _f.next()) {
                var _h = __read(_g.value, 2), id = _h[0], player = _h[1];
                if (id != (oldHost === null || oldHost === void 0 ? void 0 : oldHost.state.id) && player.state.active) {
                    player.setState({ host: true });
                    break;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    Game.prototype.setGuessing = function (guessing) {
        var e_3, _a;
        try {
            for (var _b = __values(this.players), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), id = _d[0], player = _d[1];
                if (id === guessing) {
                    player.setState({ guessing: true });
                }
                else {
                    player.setState({ guessing: false });
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
    };
    Game.prototype.broadcast = function (data) {
        var e_4, _a;
        var _b;
        try {
            for (var _c = __values(this.players), _d = _c.next(); !_d.done; _d = _c.next()) {
                var _e = __read(_d.value, 2), id = _e[0], player = _e[1];
                (_b = player.socket) === null || _b === void 0 ? void 0 : _b.send(JSON.stringify(__assign({ action: "broadcast" }, data)));
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_4) throw e_4.error; }
        }
    };
    // For whenever state changes
    Game.prototype.broadcastStates = function () {
        var states = __spread(this.players).map(function (_a) {
            var _b = __read(_a, 2), id = _b[0], player = _b[1];
            return player.state;
        });
        this.broadcast({
            broadcastType: "state-update",
            states: states,
        });
    };
    Game.instances = new Map();
    return Game;
}());
exports.default = Game;
