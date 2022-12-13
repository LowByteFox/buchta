# Buchta
## Huro.js framework

<img src="buchta.png" alt="Buchta Logo" width="256"/>

## Get Started

Buchta is under renovation, sorry<br>
<br>

# Changes v3 -> v4

## Performane

Returning simple 'hi': <br>
v3: 59k req/s<br>
v4: 106k req/s<br>
<br>
Parsing params and query: <br>
v3: 49k req/s<br>
v4: 90k req/s<br>
<br>
Parsing and returning the same json: <br>
v3: 52k req/s<br>
v4: 72k req/s<br>

## BuchtaRequest
BuchtaRequest is gone, `request` is casual `Request` with `params` and `query` added to it

## FS Routing
every `js` or `ts` file that folows this syntax `get.server.js`, `post.server.ts` will be executed on the server <br>
For more info, look into `public` folder

## Plugin support
Here we go, the fun part and most interesting part is here, Plugin API is still not finished, for now there are plugins made as examples

## Not done yet

Entire plugin API <br>
Huro.js <br>
WS API <br>
Bundler API <br>