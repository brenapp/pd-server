/**
 * Creates an SSL test server
 */

import https from "https";
import fs from "fs";
import crypto from "crypto";
import { Server } from "ws";

const cert = fs.readFileSync(
  "/etc/letsencrypt/live/pd-api.bren.app/fullchain.pem"
);
const key = fs.readFileSync(
  "/etc/letsencrypt/live/pd-api.bren.app/privkey.pem"
);

const server = https.createServer({ cert, key });
const wss = new Server({ server });

server.listen(8888);

export default server;
