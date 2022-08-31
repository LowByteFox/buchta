import { Buchta } from "./buchta";

const app = new Buchta();

app.get("/", () => {
    return "<h1>Hello, world</h1>";
});

app.get("/react/", () => {
    return app.loadFile("./react/react.html");
})

app.run();