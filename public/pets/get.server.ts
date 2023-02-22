import { BuchtaRequest } from "../../src/request";
import { BuchtaResponse } from "../../src/response";

export default function (req: BuchtaRequest, res: BuchtaResponse) {
    if (req.query?.get("name").match(/<.+>/g))
        res.send(`No XSS\n`);
    else
        res.send(`I am ${req.query?.get("name")}\n`);
        
    res.setHeader("Content-Type", "text/html; charset=utf-8");
}

// this data will be provided to plugins that expand setting up the routes ( e.g. Buchta.get, Buchta.post, etc. )
export const data = {
    summary: "Get pet",
    tags: ["pet"],
    description: "Get all pets",
    parameters: [
        {
            in: "query",
            name: "name",
            description: "Make pet say its name",
            required: true,
            schema: {
                type: "string",
            },
        }
    ],
    responses: {
        200: {
            description: "OK",
            schema: {
                type: "string",
            },
        },
    }
}