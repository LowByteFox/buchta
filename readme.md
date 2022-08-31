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
in `buchta.config.json` it's recommended for you to set `webRootPath` and `cacheRootPath` as absolute path

## Example 
```ts
import { Basket, Buchta } from "./buchta";

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
