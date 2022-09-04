# Buchta
## Minimalistic yet powerful http library for Bun

![Buchta logo](./buchta.png "Buhcta Logo")

## Get Started
```bash
bun create Fire-The-Fox/buchta <project-name>
cd <project-name>
bun run src/example.ts
```

Buchta should always be run where `buchta.config.json` is<br>
in `buchta.config.json` it's recommended to set `webRootPath` and `cacheRootPath` as an absolute path

### ⚠️ For people downloading buchta through `bun add buchta`
After you have downloaded buchta from npm, copy `buchta.config.json` from `node_modules/buchta/`


## Example 
```ts
import { Buchta } from "buchta";

const app = new Buchta();
app.justShut(true);   // makes it quiet
app.enableDebug(true);  // transpiled files won't go to cache
app.setMarkdownCSS(await app.loadFile("/markdown/markdown.css"));
app.setReactCSS(await app.loadFile("/react/react.css"));

app.get("/", (req) => {
    return JSON.stringify(Object.fromEntries(req["query"]));
});

app.get("/re*act/", () => {
    return app.reactSinglePage("/react/index.jsx");
});

app.get("/asm/", () => {
    return app.loadFile("./asm/index.html");
});

app.get("/jquery/:data", () => {
    return app.loadFile("./jquery/index.html");
});

app.get("/markdown/", () => {
    return app.markdownSinglePage("/markdown/page.md");
});

app.get("/svelte/", () => {
    return app.loadFile("/svelte/index.html");
});

app.run();
```

## Updates
Say hello to `Svelte`. To get started with svelte run `bun run svelte-init`<br>
To run example server run `bun run example`