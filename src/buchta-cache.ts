import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { fileExistSync } from "./buchta-utils";

export class BuchtaCache {
    private cacheDir: string;
    private cacheFiles: Map<string, string>;

    constructor(cacheDirPath: string) {
        this.cacheDir = cacheDirPath;
        this.cacheFiles = new Map<string, string>();
    }

    private recursiveCacheCreate = async (rootBase: string, extra="") => {
        const dirs = rootBase.split("/");
        dirs.shift();
        dirs.pop();

        let baseDir = this.cacheDir;
        if (!fileExistSync(baseDir)) {
            mkdirSync(baseDir);
        }

        baseDir += extra;
        if (!fileExistSync(baseDir)) {
            mkdirSync(baseDir);
        }

        for (const dir of dirs) {
            baseDir += `/${dir}/`;
            if (!fileExistSync(baseDir)) {
                mkdirSync(baseDir);
            }
        }
    }

    handleCache = (fileName: string, code: string, outputExt: string) => {
        const newFilePath = fileName.replace(new RegExp(`.${fileName.split(".").pop()}$`), "." + outputExt);
        this.recursiveCacheCreate(newFilePath);
        if (code != null) {
            if (!this.cacheFiles.has(fileName)) this.registerFile(fileName, code);
            if (!fileExistSync(`${this.cacheDir}/${newFilePath}`)) {
                this.dumpFile(newFilePath, code);
            }
        } else {
            if (this.cacheFiles.has(fileName)) {
                return this.cacheFiles.get(fileName);
            }
            if (fileExistSync(`${this.cacheDir}/${newFilePath}`)) {
                const loadedData = readFileSync(`${this.cacheDir}/${newFilePath}`, {encoding: "utf-8"});
                if (!this.cacheFiles.has(fileName)) this.registerFile(fileName, loadedData);
            }
            return null;
        }
    }

    private registerFile = (fileName: string, code: string) => {
        this.cacheFiles.set(fileName, code);
    }

    private dumpFile = (fileName: string, code: string) => {
        writeFileSync(`${this.cacheDir}/${fileName}`, code, {encoding: "utf-8"});
    }
}