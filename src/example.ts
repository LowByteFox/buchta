import { Buchta } from "./buchta";

const app = new Buchta();
app.enableDebug(true);

app.get("/", (req) => {
    return JSON.stringify(Object.fromEntries(req["query"]));
});

app.get("/idk/:appId", (req) => {
    return JSON.stringify(Object.fromEntries(req["params"]));
}, true);

app.get("/react/", () => {
    return app.loadFile("./react/react.html");
})

app.get("/asm/", () => {
    return app.loadFile("./asm/index.html");
})

app.get("/jquery/", () => {
    return app.loadFile("./jquery/index.html");
})

app.run();