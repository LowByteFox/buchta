
import { Request, Response } from "buchta";

export default function (req: Request, res: Response) {
    const query = {};
    for (const key of req.query.keys()) {
        query[key] = req.query.get(key);
    }
    res.sendJson(query);
}
