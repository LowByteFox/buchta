import { Buchta } from "./buchta";
import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";
import { BuchtaSubrouter } from "./utils/subrouter";

const app = new Buchta({});

const router = new BuchtaSubrouter();

router.get("/bun", (req: BuchtaRequest, res: BuchtaResponse) => {
    res.send(`I am subroute handler at ${req.url}\n`);
}).post("/post", (req: BuchtaRequest, res: BuchtaResponse) => {
    res.send("Post\n");
});

router.putInto(app, "/api");
app.use("/api2", router);

app.run();