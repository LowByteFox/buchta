import { symlinkSync } from "fs";
import { resolve } from "path";

const path = resolve(import.meta.dir, '..');

symlinkSync(`${path}/src/plugins/`, `${path}/plugins`);