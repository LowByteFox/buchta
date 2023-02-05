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