import { access } from "fs/promises";
import { accessSync } from "fs";

export async function fileExist(fileName: string) {
    try {
        await access(fileName);
        return true;
    } catch {
        return false;
    }
}

export function fileExistSync(fileName: string) {
    try {
        accessSync(fileName);
        return true;
    } catch {
        return false;
    }
}