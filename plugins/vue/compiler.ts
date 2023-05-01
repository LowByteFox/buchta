import { readFileSync } from "fs"
import { basename } from "path"
import { compileScript, parse } from "vue/compiler-sfc"

const makeId = (length: number) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

const tsToJs = (code: string) => {
    const transpiler = new Bun.Transpiler({ loader: "ts" });
    return transpiler.transformSync(code, {});
}

export const compileVue = (path: string, ssrEnabled: boolean, currentlySSR: boolean) => {
    const content = readFileSync(path, {encoding: "utf-8"})
    const parsed = parse(content, {
        filename: basename(path),
    });

    if (parsed.descriptor.scriptSetup?.setup) {
        // vue 3
        let { content: code } = compileScript(parsed.descriptor, {
            id: "v" + makeId(7),
            inlineTemplate: true, // SSR friendly
            isProd: false, // TODO missing check
            templateOptions: {
                filename: basename(path),
                ssr: currentlySSR,
                ssrCssVars: []
            }
        });

        code = code.replace("export default ", "let sfc = ");
        code += ";\n";

        if (path.endsWith("index.vue")) {
            if (currentlySSR) {
                code += "export default sfc;"
                return tsToJs(code);
            }

            if (!ssrEnabled) {
                code = `import { createApp } from "vue";\n${code}\nconst a = createApp(sfc);\na.mount("#__buchta");`
                return tsToJs(code);
            } else {
                code = `import { createSSRApp } from "vue";\n${code}\nconst a = createSSRApp(sfc);\na.mount("#__buchta");`;
                return tsToJs(code);
            }
        }
    }
    // vue 2
}
