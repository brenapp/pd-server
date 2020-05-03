/**
 * Creates an SSL test server
 */

import https from "https";
import fs from "fs";
import crypto from "crypto";

const cert = fs.readFileSync(
  "/etc/letsencrypt/live/pd-api.bren.app/fullchain.pem"
);
const key = fs.readFileSync(
  "/etc/letsencrypt/live/pd-api.bren.app/privkey.pem"
);

const server = https.createServer({ cert, key }, function (req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");

  res.write(crypto.randomBytes(20));
  res.end();
});

server.listen(8888);
