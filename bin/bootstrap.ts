import { existsSync, mkdirSync, writeFileSync } from "fs";
import { chdir } from "process";
import { BuchtaCLI } from "./buchta";

export function bootstrapProject(this: BuchtaCLI) {
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

    if (this.args[1] == "--force") {
        console.log("Error: Please specify \"--force\" at the end!\n");
        return 0;
    }

    if (!existsSync(name)) {
        mkdirSync(name);
    }

    chdir(name);

    writeFileSync("buchta.config.ts", `export default {
    port: 3000,
    
    // @ts-ignore yes there is import.meta.dir
    rootDirectory: import.meta.dir,

    plugins: []
}
`);

    writeFileSync("package.json", `{
    "name": "${name}",
    "type": "module",
    "devDependencies": {
      "bun-types": "latest",
      "buchta": "latest"
    }
}
`);
    chdir("..");
    console.log("Project bootstrapped successfully!");
}