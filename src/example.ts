import { Buchta } from "./buchta";
import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";
import { BuchtaSubrouter } from "./subrouter";

const app = new Buchta();

const router = new BuchtaSubrouter();

router.get("/money", (req: BuchtaRequest, res: BuchtaResponse) => {
    res.send("I am rich\n");
});

router.get("/bun", (req: BuchtaRequest, res: BuchtaResponse) => {
    res.send("I am buchta and i am running on bun!\n");
});

app.use("/api", router);

app.run();