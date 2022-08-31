import { access } from "node:fs/promises";

export const fileExist = async (fileName: string) => {
    try {
        await access(fileName);
        return true;
    } catch {
        return false;
    }
}