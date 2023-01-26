export default function(req: any, res: any) {
    res.send("xd");
}

export function before(req: any, res: any) {
    console.log("Before GET");
}

export function after(req: any, res: any) {
    console.log("After GET");
}