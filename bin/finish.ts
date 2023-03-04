import { existsSync, mkdirSync, writeFileSync } from "fs";
import { basename, dirname } from "path";
import { BuchtaCLI } from "./buchta";

enum BuchtaQuestionType {
    YES_OR_NO = 16514,
    TEXT_INPUT,
    SELECT
}

interface BuchtaProjectOption {
    pretty: string;
    value?: string;
    type: BuchtaQuestionType;
    selectData?: string[];
}

interface BuchtaPluginTemplate {
    filename: string;
    content: string;
}

export function finishBootstrap(this: BuchtaCLI) {
    const name = basename(process.cwd());

    let current: string | null = null;
    const templates = [];

    for (const template of this.projectTemplates.keys()) {
        templates.push(template);
    }
    templates.splice(templates.indexOf("base"), 1);

    while (!current || !/^(Y|N|Yes|No)$/i.exec(current)) {
        // @ts-ignore it is there
        current = prompt("This will wipe current temporary project! Continue?");

        if (!/^(Y|N|Yes|No)$/i.exec(current)) {
            console.log(`Value "${current}" is invalid!\n`);
        }
    }

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
}