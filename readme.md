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

app.run();
```

## Updates
Every route now uses new routing system, similar to express.js<br>
When dealing with react, html is not needed<br>
Same thing applies to markdown<br>
To make `Buchta` quiet, call `justShut` method with value `true`<br>
Both markdown and react pages which doesn't have html part, can also have css injected<br>
`BuchtaRouter` is supported even in webbrowser, but you need to modify some stuff