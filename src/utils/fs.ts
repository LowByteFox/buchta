import { existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { dirname, normalize } from "path"

export const makeDir = (path: string) => {
    path = dirname(normalize(path + "/a"));
    if (!existsSync(path))
        mkdirSync(path, { recursive: true });
}

export const getFiles = (path: string, files: string[] = []) => {
    let localFiles = readdirSync(path);

    let length = localFiles.length;

    for (let i = 0; i < length; i++) {
        if (statSync(path + '/' + localFiles[i]).isDirectory())
            files = getFiles(path + '/' + localFiles[i], files);
        else
            files.push(path + '/' + localFiles[i])
    }

    return files;
} 
