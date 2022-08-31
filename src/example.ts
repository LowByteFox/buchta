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