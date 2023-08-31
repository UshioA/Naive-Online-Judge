# Naive Client

A Client of Naive Online Judge, itself being an React App.

## Setup

You will need `caddy` to get this thing work. [How to install Caddy](https://caddyserver.com/docs/install)

To deploy, you need to first install `nodejs`, then run `npm install` to get your **`node_modules`**. Then you run `npm run build`, after that copy `Caddyfile` into `build` directory and  `cd` into it. In `build` directory you run `caddy start` to start the client.

## Caddyfile

You need to modify `Caddyfile` for using it yourself. We use reverse proxy for our backend, make sure you get it right. Also make sure you get you Client address right, which is on the first line.

Further infomation can be found in [caddy](https://caddyserver.com/docs/).
