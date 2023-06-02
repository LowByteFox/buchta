import { readFileSync } from "fs"
import { basename } from "path"
import { compileScript, compileStyle, compileTemplate, parse, rewriteDefault } from "vue/compiler-sfc"

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

const idStore = new Map<string, string>();

export const compileVue = (
    path: string,
    ssrEnabled: boolean,
    currentlySSR: boolean,
    imports: string[],
    clientPlugins: Map<string, string>,
    clientComponents: Map<string, string>) => {

    const content = readFileSync(path, {encoding: "utf-8"});
    const parsed = parse(content, {
        filename: basename(path),
    });

    let id = idStore.get(path) ?? "v" + makeId(5);
    idStore.set(path, id);

    let isProd = process.env.NODE_ENV == "development" ? false : true;

    let code = "";

    let styles = [];

    if (parsed.descriptor.scriptSetup?.setup) {
        // vue setup
        let { content: code2 } = compileScript(parsed.descriptor, {
            id,
            inlineTemplate: true, // SSR friendly
            isProd, 
            templateOptions: {
                filename: basename(path),
                ssr: currentlySSR,
                ssrCssVars: []
            }
        });

        code = code2.replace("export default ", "let sfc = ");
        code += ";\n";

    } else {
        // vue without setup

        let template = compileTemplate({
            isProd,
            ssr: currentlySSR,
            id,
            filename: basename(path),
            ssrCssVars: [],
            source: parsed.descriptor.template?.content ?? "",
            scoped: true
        })

        let script = compileScript(parsed.descriptor, {
            id
        })

        code = rewriteDefault(script.content, "sfc");
        code += template.code.replace("export function", "function");

        if (currentlySSR) {
            code += "\nsfc.ssrRender = ssrRender;\n";
        } else {
            code += "\nsfc.render = render;\n";
        }
    }

    for (const i in parsed.descriptor.styles) {
        styles.push(compileStyle({
            id,
            source: parsed.descriptor.styles[i].content,
            filename: basename(path),
            isProd,
            scoped: parsed.descriptor.styles[i].scoped
        }).code);
    }

    if (styles.length > 0) {
        if (!currentlySSR) {
            code += `const style${id} = document.createElement("style");\nstyle${id}.innerHTML = \`${styles.join("\n")}\`;\ndocument.head.appendChild(style${id});\n`;
        }
    }

    const codeImports = imports.join("\n");
    let plugins = "";
    let components = "";

    for (const [name, config] of clientPlugins) {
        plugins += `a.use(${name}, ${config});\n`;
    }

    for (const [name, comp] of clientComponents) {
        components += `a.component("${name}", ${comp});`;
    }

    if (path.endsWith("index.vue")) {
        if (currentlySSR) {
            code += "export default sfc;"
            return tsToJs(code);
        }

        if (!ssrEnabled) {
            code = `import { createApp } from "vue";\n${codeImports}${code}\nconst a = createApp(sfc);\n${components}${plugins}a.mount("#__buchta");`
            return tsToJs(code);
        } else {
            code = `import { createSSRApp } from "vue";\n${codeImports}${code}\nconst a = createSSRApp(sfc);\n${components}${plugins}a.mount("#__buchta");`;
            return tsToJs(code);
        }
    } else {
        code += "export default sfc;";
        return tsToJs(code);
    }
}
