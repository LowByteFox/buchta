import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, normalize, relative } from "node:path";

export const esModuleRegex = /import.+(\{.*\}|\w+)\s+from\s+((['"])(((\.\/|\/|\.)[^\s])[\w./]+)\2(['"]))/g;
export const esNormalModule = /import.+(\{.*\}|\w+)\s+from\s+((['"]).+(['"]))/g;
export const awaitImportRegex = /.+(await\s+)?import.*?\(((['"])(\.\/|\/|\.).+(['"]))\).+/g;
export const cjsModuleRegex = /.+require.*?\(((['"])(\.\/|\/|\.).+(['"]))\).+/g;

export const hideImports = (code: string, onFind) => {
    return code.replace(esModuleRegex, (match) => {
        onFind(match);
        return "// " + match;
    }).replace(awaitImportRegex, (match) => {
        onFind(match);
        return "// " + match;
    }).replace(cjsModuleRegex, (match) => {
        onFind(match);
        return "// " + match;
    });
}

export const showImportsSSR = (code: string, patched: Map<string, string[]>, route: string, basePath: string): string => {
    if (patched.has(route)) {
        const obj = patched.get(route);
        let before = "";
        if (obj)
            for (let e of obj) {
                if (awaitImportRegex.exec(e)) {
                    code = code.replace(new RegExp("//.*" + awaitImportRegex.source), ((match) => {
                        return match.match(awaitImportRegex)?.[0] || "";
                    }));
                } else if (cjsModuleRegex.exec(e)) {
                    code = code.replace(new RegExp("//.*" + cjsModuleRegex.source), ((match) => {
                        return match.match(cjsModuleRegex)?.[0] || "";
                    }));
                } else {
                    const file = e.match(/['"].+?(?=['"])/);
                    if (file) {
                        if (file[0]?.match(/(.js|.ts)/g)) {
                            const fixed = file[0].slice(1);
                            if (fixed.startsWith("/")) {
                                let publicBase = process.cwd() + "/public";
                                const resolved = relative(dirname(route), fixed);
                                publicBase += dirname(route);
                                publicBase += "/" + resolved;

                                const ssrPath = normalize(basePath + "/" + dirname(route) + "/" + resolved);
                                if (!existsSync(dirname(ssrPath)))
                                    mkdirSync(dirname(ssrPath), {recursive: true});
                                
                                copyFileSync(publicBase, ssrPath);
                                e = e.replace(fixed, "./" + resolved);
                                // TODO Copy files that are being imported starting with / so that the SSR won't struggle trying to import
                            } else {
                                let currentFileBase = dirname(process.cwd() + "/public/" + route);
                                currentFileBase += "/" + fixed;
                                currentFileBase = normalize(currentFileBase);
                                
                                const ssrPath = normalize(basePath + "/" + dirname(route) + "/" + fixed);
                                if (!existsSync(dirname(ssrPath)))
                                    mkdirSync(dirname(ssrPath), {recursive: true});
                                
                                copyFileSync(currentFileBase, ssrPath);
                            }
                        }
                    }
                    before += `${e}\n`;
                }
            }
        return `${before}\n${code}`;
    }
    return code;
}