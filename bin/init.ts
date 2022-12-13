import { existsSync, mkdirSync, writeFileSync } from "fs";

const basePath = process.cwd();

writeFileSync(basePath + "/buchta.config.ts", `
export default {
    port: 3000,
    
    // @ts-ignore yes there is import.meta.dir
    rootDirectory: import.meta.dir + "/public",

    cache: true,
    
    routes: {
        // if your route is /index.html the route will change to / and the file will be index.html
        fileName: "index"
    }
}
`);

if (!existsSync(basePath + "/public"))
    mkdirSync(basePath + "/public");

if (!existsSync(basePath + "/public/api"))
    mkdirSync(basePath + "/public/api");

writeFileSync(basePath + "/public/index.html", `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buchta</title>
</head>
<body>
    <h1>Hello World!</h1>
</body>
</html>
`);

writeFileSync(basePath + "/public/api/get.server.ts", `
import { Request, Response } from "buchta";

export default function (req: Request, res: Response) {
    res.send("Hello World!");
}
`);

writeFileSync(basePath + "/public/api/post.server.ts", `
import { Request, Response } from "buchta";

export default function (req: Request, res: Response) {
    const query = {};
    for (const key of req.query.keys()) {
        query[key] = req.query.get(key);
    }
    res.sendJson(query);
}
`);