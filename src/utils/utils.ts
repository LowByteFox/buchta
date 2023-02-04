export const hideImports = (code: string, onFind) => {
    const esModuleRegex = /import.+(\{[\w\s,]+\}|\w+)\s+from\s+((['"])(((\.\/|\/|\.)[^\s])[\w./]+)\2(['"]))/g;
    const awaitImportRegex = /(const|var|let).+\w+.+=\s+(await\s+)?import\(((['"])(\.\/|\/|\.).+(['"]))\)/g;
    const cjsModuleRegex = /(const|var|let).+\w+.+=\s+require\(((['"])(\.\/|\/|\.).+(['"]))\)/g;

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