# Buchta
## Powerful http framework for Bun

![Buchta logo](./buchta.png "Buchta Logo")

## Get Started

* `buchta` executable needs nodejs to be installed
* if you won't select anything as starting framework, fix buchta.config.json so the json will be valid 
```bash
bun create Fire-The-Fox/buchta-template <project-name>
cd <project-name>
bun run buchta init # create base for project
bun run buchta serve # starts buchta minimal server
```

* If you don't want buchta to cache, set DEBUG env to true ( DEBUG=true bun run buchta serve )

# Changes
Welcome **Vue** <br>
100% Of Buchta code was rewritten <br>
Improved BuchtaRouter code, performance is good <br>
Implemented automatic routing <br>
Buchta has it's own executable `buchta` <br>
Improved cache <br>
Now Requests are wrapped by `BuchtaRequest` and Responses by `BuchtaResponse` <br>
<br>

# Removed/Unused
`BuchtaLogger` won't be used for some time<br>
Routes now doesn't support regex <br>
<br>

## Example
```ts
import { Buchta } from "buchta";

// Buchta will create routes, just empty folder where are your app files ( default is public )
const app = new Buchta();

app.get("/", (_req, res) => {
    res.send("hi");
});

app.get("/id/:id/", (req, res) => {
    res.send(`${req.params.get("id")} ${req.query.get("name")}`);
})

app.post("/json/", async (req, res) => {
    // In Bun 0.1.12 and 0.1.13 is issue with `.json()` and `.text()`
    res.send(JSON.stringify(await req.originalReq.json()));
});

app.run();
```
To run it
```bash
bun run <file>
```
