import { BuchtaRequest } from "../../../src/request";
import { BuchtaResponse } from "../../../src/response";

export default function (req: BuchtaRequest, res: BuchtaResponse) {
    res.send(`I am ${req.params.get("name")}\n`);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
}
