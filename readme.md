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
import { Basket, Buchta } from "buchta";

const app = new Buchta();
app.enableDebug(true);

app.get("/", (_req, query: Basket) => {
    return JSON.stringify(Object.fromEntries(query));
});

app.get("/react/", () => {
    return app.loadFile("./react/react.html");
})

app.run();
```

### Updates
Added few file types for audio and video<br>
Implemented  `Internet Explorer stopper`