import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, normalize } from "node:path";

export const esModuleRegex = /import.+(\{.*\}|\w+)\s+from\s+((['"])(((\.\/|\/|\.)[^\s])[\w./]+)\2(['"]))/g;
export const awaitImportRegex = /(const|var|let).+(\{.*\}|\w+).+\w+.+=\s+(await\s+)?import.*?\(((['"])(\.\/|\/|\.).+(['"]))\)/g;
export const cjsModuleRegex = /(const|var|let).+(\{.*\}|\w+).+\w+.+=\s+require.*?\(((['"])(\.\/|\/|\.).+(['"]))\)/g;

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
            for (const e of obj) {
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
                        if (file[0]?.match(/(.js|.ts|.jsx|.tsx)/g)) {
                            const fixed = file[0].slice(1);
                            if (fixed.startsWith("/")) {
                                let publicBase = process.cwd() + "/public";
                                publicBase += dirname(fixed);
                                console.log(publicBase);
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