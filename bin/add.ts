import { existsSync, mkdirSync, writeFileSync } from "fs";
import { BuchtaCLI, BuchtaPluginTemplate } from "./buchta";

export function addFile(this: BuchtaCLI) {

    const methods = ["get", "post", "put", "delete"];

    if (this.args.length < 2) {
        console.log("Error: Not enough arguments!\n");
        return 0;
    }

    if (this.args[1] == "--force") {
        console.log("Error: Please specify \"--force\" at the end!\n");
        return 0;
    }

    switch (this.args[0]) {
        case "template":
            const data: BuchtaPluginTemplate = this.getPluginTemplate(this.args[1]);
            if (!data) {
                console.log(`Error: Plugin "${this.args[1]}" doesn't provide any template!\n`);
                return 0;
            }
            
            if (!existsSync("templates"))
                mkdirSync("templates");
            
            if (existsSync("templates/" + data.filename) && !this.args.includes("--force")) {
                console.log(`Error: Plugin Template "${this.args[1]}" already exists! Remove it or pass "--force" argument\n`);
                return 0;
            }

            writeFileSync("templates/" + data.filename, data.content);

            console.log(`Info: Template "${data.filename}" was created!\n`);
            break;
        case "plugin":
            if (!existsSync("plugins"))
                mkdirSync("plugins");
            
            if (existsSync("plugins/" + this.args[1] + ".ts") && !this.args.includes("--force")) {
                console.log(`Error: Plugin "${this.args[1]}" already exists! Remove it or pass "--force" argument\n`);
                return 0;
            }

            writeFileSync("plugins/" + this.args[1] + ".ts", `
import { Buchta, BuchtaCLI } from "buchta";

export function ${this.args[1]}() {
    return function (this: Buchta | BuchtaCLI) {

    }
}
`);
            console.log(`Info: Plugin "${this.args[1]}.ts" was created!\n`);
            break;
        case "api":
            if (!this.args[1].endsWith("/")) {
                console.log("Error: Make sure your file name ends with / because this needs directory name!\n");
                return 0;
            }
            let current: string | null = null;

            while (!current || !methods.includes(current)) {
                methods.forEach(m => console.log(m));
                current = prompt("\nPlease select HTTP method:");

                if (!methods.includes(current)) {
                    console.log(`HTTP method "${current}" was not found!\n`);
                }
            }
            
            const method = current;

            while (!current || !/^(Y|N|Yes|No)$/i.exec(current)) {
                // @ts-ignore it is there
                current = prompt("Add middleware?");

                if (!/^(Y|N|Yes|No)$/i.exec(current)) {
                    console.log(`Value "${current}" is invalid!\n`);
                }
            }

            const path = process.cwd() + "/public/";

            let code = `
import { BuchtaRequest, BuchtaResponse } from "buchta";

export default function(req: BuchtaRequest, res: BuchtaResponse) {
    // TODO: what will be executed by the server
}
`
            if (/(y|Yes)/i.exec(current)) {
                code += `
export function before(req: BuchtaRequest, res: BuchtaResponse) {
    // TODO: what will happen before the handler
}

export function after(req: BuchtaRequest, res: BuchtaResponse) {
    // TODO: what will happen after the handler
}
`
            }

            if (!existsSync(path + this.args[1]))
                mkdirSync(path + this.args[1], {recursive: true});
            
            if (existsSync(`${path}${this.args[1]}/${method}.server.ts`) && !this.args.includes("--force")) {
                console.log("Error: File exists, remove it or pass \"--force\" argument");
                return 0;
            }

            writeFileSync(`${path}${this.args[1]}/${method}.server.ts`, code);
            console.log(`Info: Api function "${this.args[1]}${method}.server.ts" was created!\n`);
            break;
        case "middleware":
            if (!this.args[1].endsWith("/")) {
                console.log("Error: Make sure your file name ends with / because this needs directory name!\n");
                return 0;
            }

            const middlewarePath = process.cwd() + "/middleware/";

            if (!existsSync(middlewarePath + this.args[1]))
                mkdirSync(middlewarePath + this.args[1], {recursive: true});
            
            if (existsSync("middleware/" + this.args[1] + "middleware.ts") && !this.args.includes("--force")) {
                console.log(`Error: Middleware "${this.args[1]}" already exists! Remove it or pass "--force" argument\n`);
                return 0;
            }

            writeFileSync("middleware/" + this.args[1] + "middleware.ts", `
import { BuchtaRequest, BuchtaResponse } from "buchta";

export function before(req: BuchtaRequest, res: BuchtaResponse) {
    // TODO: what will happen before the handler
}

export function after(req: BuchtaRequest, res: BuchtaResponse) {
    // TODO: what will happen after the handler
}
`);
            console.log(`Info: Middleware "${this.args[1]}middleware.ts" was created!\n`);
            break;
        case "composable":
            if (!existsSync("composables"))
                mkdirSync("composables");
            
            if (existsSync("composables/" + this.args[1] + ".ts") && !this.args.includes("--force")) {
                console.log(`Error: Composable "${this.args[1]}" already exists! Remove it or pass "--force" argument\n`);
                return 0;
            }

            const composablePath = process.cwd() + "/composables/";

            writeFileSync(`${composablePath}${this.args[1]}.ts`, `
export default function() {
    return "\${name}"
}
`.replace("${name}", this.args[1]));
            console.log(`Info: Composable "${this.args[1]}.ts" was created!\n`);
            break;
        default:
            console.log(`Error: Unknown option "${this.args[1]}"!\n`);
            this.help()
    }
}