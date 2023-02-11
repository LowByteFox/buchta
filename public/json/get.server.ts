import { parse } from "marked";

export default function(req: any, res: any) {
    res.send(parse("# Hello, World!"));
}

export function before(req: any, res: any) {
    console.log("Before GET");
}

export function after(req: any, res: any) {
    console.log("After GET");
}