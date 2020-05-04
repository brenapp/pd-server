/**
 * Creates an SSL test server
 */

import https from "https";
import fs from "fs";
import crypto from "crypto";
import { Server } from "ws";

let wss: Server;

if (process.env["DEV"]) {
  wss = new Server({ port: 8888 });
} else {
  const cert = fs.readFileSync(
    "/etc/letsencrypt/live/pd-api.bren.app/fullchain.pem"
  );
  const key = fs.readFileSync(
    "/etc/letsencrypt/live/pd-api.bren.app/privkey.pem"
  );

  const server = https.createServer({ cert, key });
  wss = new Server({ server });

  server.listen(8888);
}

export default wss;
