import { existsSync, mkdirSync, writeFileSync } from "fs";
import { basename } from "path";
import { chdir, exit } from "process";
const VFS = require("./templateVFS").default;

let basePath = process.cwd();
const templates = Object.keys(VFS).slice(1);
let current: string | null = null;

while (!current) {
    console.clear();
    current = prompt("Type name of project: ");
    if (current?.includes("/")) {
        console.log("/ in project name is not allowed!");
        continue;
    } 
    if (existsSync(basePath + "/" + current)) {
        console.log(`Directory with name "${current}" exists! Specify a new name!`);
    }
}

mkdirSync(basePath + "/" + current);
chdir(basePath + "/" + current);
basePath += "/" + current;

while (current && !templates.includes(current)) {
    console.log("List of current available templates: \n");
    console.log(templates.join(" "));
    current = prompt("\nPlease type project template: ");
}

if (current == null) exit(1);

for (const i in VFS["base"]) {
    if (i == "dirs") {
        VFS["base"][i].forEach(dir => {
            if (!existsSync(basePath + dir))
                mkdirSync(basePath + dir)
        });
    } else {
        const output = VFS["base"][i](basename(basePath));
        if (!existsSync(basePath + i)) {
            writeFileSync(basePath + i, output);
        } else {
            if (process.argv.includes("--force")) {
                writeFileSync(basePath + i, output);
            } else {
                console.log(`File ${basePath + i} exists, skipping; use --force to overwrite`);
            }
        }
    }
}

for (const i in VFS[current]) {
    if (i == "dirs") {
        VFS[current][i].forEach(dir => {
            if (!existsSync(basePath + dir))
                mkdirSync(basePath + dir)
        });
    } else {
        const output = VFS[current][i](basename(basePath));
        if (!existsSync(basePath + i)) {
            writeFileSync(basePath + i, output);
        } else {
            if (process.argv.includes("--force")) {
                writeFileSync(basePath + i, output);
            } else {
                console.log(`File ${basePath + i} exists, skipping; use --force to overwrite`);
            }
        }
    }
}

console.log(`\nCreate basic project structure from "${current}" template.`);
console.log(`\n\nGet started: \ncd ${basename(basePath)} && bun install`);
console.log("\nTo start server execute: bun run buchta serve");