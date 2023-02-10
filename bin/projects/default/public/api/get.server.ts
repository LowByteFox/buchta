import { Request, Response } from "buchta";

export default function (req: Request, res: Response) {
    res.send("Hello World!");
}