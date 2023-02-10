// import { existsSync, mkdirSync, writeFileSync } from "fs";
// import { basename } from "path";
// import { chdir, exit } from "process";
// const VFS = require("./templateVFS").default;

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";
import { chdir } from "process";
import { BuchtaCLI, BuchtaProjectOption, BuchtaQuestionType } from "./buchta";

// let basePath = process.cwd();
// const templates = Object.keys(VFS).slice(1);
// let current: string | null = null;

// console.clear();

// mkdirSync(basePath + "/" + current);
// chdir(basePath + "/" + current);
// basePath += "/" + current;

// while (current && !templates.includes(current)) {
//     console.log("List of current available templates: \n");
//     console.log(templates.join(" "));
//     current = prompt("\nPlease type project template: ");
// }

// if (current == null) exit(1);

// for (const i in VFS["base"]) {
//     if (i == "dirs") {
//         VFS["base"][i].forEach(dir => {
//             if (!existsSync(basePath + dir))
//                 mkdirSync(basePath + dir)
//         });
//     } else {
//         const output = VFS["base"][i](basename(basePath));
//         if (!existsSync(basePath + i)) {
//             writeFileSync(basePath + i, output);
//         } else {
//             if (process.argv.includes("--force")) {
//                 writeFileSync(basePath + i, output);
//             } else {
//                 console.log(`File ${basePath + i} exists, skipping; use --force to overwrite`);
//             }
//         }
//     }
// }

// for (const i in VFS[current]) {
//     if (i == "dirs") {
//         VFS[current][i].forEach(dir => {
//             if (!existsSync(basePath + dir))
//                 mkdirSync(basePath + dir)
//         });
//     } else {
//         const output = VFS[current][i](basename(basePath));
//         if (!existsSync(basePath + i)) {
//             writeFileSync(basePath + i, output);
//         } else {
//             if (process.argv.includes("--force")) {
//                 writeFileSync(basePath + i, output);
//             } else {
//                 console.log(`File ${basePath + i} exists, skipping; use --force to overwrite`);
//             }
//         }
//     }
// }

// console.log(`\nCreate basic project structure from "${current}" template.`);
// console.log(`\n\nGet started: \ncd ${basename(basePath)} && bun install`);
// console.log("\nTo start server execute: bun run buchta serve");

export function initProject(this: BuchtaCLI) {
    if (this.args.length == 0) {
        console.log("Error: Missing project name!\n");
        return 0;
    }
    console.clear();
    const name = this.args.shift();
    if (name.includes("/")) {
        console.log("Error: Project name can't contain /\n");
        return 0;
    }

    if (existsSync(name) && !this.args.includes("--force")) {
        console.log("Error: Directory exists");
        return 0;
    }
    
    let current: string | null = null;
    const templates = [];

    for (const template of this.projectTemplates.keys()) {
        templates.push(template);
    }
    templates.splice(templates.indexOf("base"), 1);
    while (!current || !templates.includes(current)) {
        console.log("Project templates: \n");

        templates.forEach(t => console.log(t));
        console.log("");

        current = prompt("Type name of template:");

        if (!templates.includes(current)) {
            console.log(`Template "${current}" was not found!\n`);
        }
    }

    const files = this.projectTemplates.get(current);

    const opts = this.getTemplateOptions(current);
    
    const callback = this.getTemplateCallback(current);

    for (let [key, value] of opts) {
        // @ts-ignore it is there
        switch (value.type) {
            case BuchtaQuestionType.YES_OR_NO:
                current = null;
                while (!current || !/^(Y|N|Yes|No)$/i.exec(current)) {
                    // @ts-ignore it is there
                    current = prompt(value.pretty);

                    if (!/^(Y|N|Yes|No)$/i.exec(current)) {
                        console.log(`Value "${current}" is invalid!\n`);
                    }
                }
                break;
            case BuchtaQuestionType.SELECT:
                // @ts-ignore it is there
                while (!current || !value.selectData.includes(current)) {
                    // @ts-ignore it is there
                    current = prompt(value.pretty);

                    // @ts-ignore it is there
                    if (!value.selectData.includes(current)) {
                        console.log(`Value "${current}" is invalid!\n`);
                    }
                }
                break;
            case BuchtaQuestionType.TEXT_INPUT:
                // @ts-ignore it is there
                while (!current) {
                    // @ts-ignore it is there
                    current = prompt(value.pretty);
                }
                break;
        }
        // @ts-ignore it is there
        value.value = current;
        // @ts-ignore duh
        opts.set(key, value);
    }

    if (!existsSync(name)) {
        mkdirSync(name);
    }

    chdir(name);

    this.projectTemplates.get("base").forEach((content, path) => {
        if (content.includes("${name}")) {
            content = content.replaceAll("${name}", name);
        }

        if (!existsSync(process.cwd() + dirname(path))) {
            mkdirSync(process.cwd() + dirname(path), {recursive: true});
        }

        writeFileSync(process.cwd() + path, content);
    })

    files.forEach((content, path) => {
        if (content.includes("${name}")) {
            content = content.replaceAll("${name}", name);
        }

        if (!existsSync(process.cwd() + dirname(path))) {
            mkdirSync(process.cwd() + dirname(path), {recursive: true});
        }

        writeFileSync(process.cwd() + path, content);
    });

    callback?.(opts as Map<string, BuchtaProjectOption>);
    chdir("..");
}