# Buchta
## Huro.js framework

<img src="./buchta.png" alt="Buchta Logo" width="256"/>

## Get Started

```
bun run buchta init # create project template
bun run buchta serve # start built-in server
```

## Working with testing server
to have better docs readability
```
git clone https://github.com/Fire-The-Fox/buchta.git
cd buchta
bun install
bun add marked svelte
bun run src/example.ts
# open browser and type localhost:4000/
```

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

## Plugin API
The Plugin API is done!<br>
List of API methods<br>
`Buchta.`
* `assignAfterRouting`
* `assignExtHandler`
* `getDefaultFileName`
* `mixInto`
* `getRoot`
* `getPort`

## WS API
3 custom methods <br>

`Buchta.`
* `wsOnOpen`
* `wsOnMessage`
* `wsOnClose`

## Bundler
`BuchtaBundler` is a wrapper for Bun's bundler, a complex system made that works outside `bun dev`

## Bundler API
`Buchta.bundler.`
* `addCustomFile`
* `addPatch`

## Not done yet

Huro.js <br>

## Buchta now has official discord server
<a href="https://discord.gg/zqEDb54JBx">Join here!</a><br>
Discord server was made in a hurry, will be fixed!