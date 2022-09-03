import { Buchta } from "./buchta";

const app = new Buchta();
app.justShut(true);
app.enableDebug(true);
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