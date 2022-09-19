import { BuchtaCache } from "./buchta-cache";
import { BuchtaLogger } from "./buchta-logger";

let svelteCompiler: NodeRequire;
try {
    svelteCompiler = require("svelte/compiler");
} catch {

}

let markdownTranspiler: NodeRequire;
try {
    markdownTranspiler = require("marked");
} catch {

}

let reactLib: NodeRequire;
try {
    reactLib = require("react");
} catch {

}

try {
    reactLib = require("preact");
} catch {

}

let vueLib: NodeRequire;
try {
    vueLib = require("vue");
} catch {

}

const jsxHtmlTemplate = (code: string) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    
</body>
<script type="module">
${code}
</script>
</html>
`}

const svelteHtmlTemplate = (code: string) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    
</body>
<script type="module">
${code}
const app = new App({target: document.body});
</script>
</html>
`;
}

const markdownHtmlTemplate = (code: string) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
${code}
</body>
</html>
`;
}

const vueHtmlTemplate = (code: string) => {
    // @ts-ignore
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
</body>
<script src="https://unpkg.com/vue@next"></script>
<script src="https://cdn.jsdelivr.net/npm/vue3-sfc-loader"></script>
<script>
    const options = {

    moduleCache: {
        vue: Vue,
    },

    getFile(url) {
        if ( url === './App.vue' )
          return Promise.resolve(\`${code.replaceAll("\/", "\\/")}\`);

        return fetch(url).then(response => response.ok ? response.text() : Promise.reject(response));
    },

    addStyle(styleStr) {
        const style = document.createElement('style');
        style.textContent = styleStr;
        const ref = document.head.getElementsByTagName('style')[0] || null;
        document.head.insertBefore(style, ref);
        },

        log(type, ...args) {
            console.log(type, ...args);
        }
    }

    const {loadModule, version} = window["vue3-sfc-loader"];

    const app = Vue.createApp({
        components: {
            'App': Vue.defineAsyncComponent(() => loadModule("./App.vue", options)),
        },
        template: "<App />"
    });

    app.mount(document.body);
</script>
</html>
`;
}


export class BuchtaTranspiler {
    private imports: Map<string, string>;
    private tsTranspiler = new Bun.Transpiler({loader: "ts"});
    private jsxTranspiler = new Bun.Transpiler({loader: "jsx"});
    private cacheMan: BuchtaCache;

    constructor(imports: Map<string, string>, cache: BuchtaCache) {
        this.imports = imports;
        this.cacheMan = cache;
    }

    transpileTs = async (code: string, filePath: string): Promise<string> => {
        let transpiled = await this.tsTranspiler.transform(code);
        this.cacheMan.handleCache(filePath, transpiled, "js");
        return new Promise(function(Resolve, Reject) {
            Resolve(transpiled);
            Reject("");
        });
    }

    transpileJsx = async (code: string, filePath: string): Promise<string> => {
        if (!reactLib) {
            console.log("Please install react");
            return "";
        }
        let transpiled = await this.jsxTranspiler.transform(code);
        transpiled += `\nfunction jsx(name, data, _g1, _g2, _g3, _g4) { return createElement(name, data); }`
        transpiled = this.patchScript(transpiled);
        if (filePath.match("App.jsx|App.tsx")) {
            transpiled = jsxHtmlTemplate(transpiled);
            this.cacheMan.handleCache(filePath, transpiled, "html");
        } else {
            this.cacheMan.handleCache(filePath, transpiled, "js");
        }
        return new Promise(function(Resolve, Reject) {
            Resolve(transpiled);
            Reject("");
        });
    }

    transpileSvelte = async (code: string, filePath: string): Promise<string> => {
        if (!svelteCompiler) {
            console.log("Please install svelte");
            return "";
        }
        let transpiled: string;
        const name = filePath.split("/").pop().split(".").shift();
        transpiled = svelteCompiler["compile"](code, {
            generate: "dom",
            css: true,
            name: name
        }).js.code;

        transpiled = this.patchScript(transpiled);

        if (name == "App") {
            transpiled = svelteHtmlTemplate(transpiled);
            this.cacheMan.handleCache(filePath, transpiled, "html");
        } else {
            this.cacheMan.handleCache(filePath, transpiled, "js");
        }
        return new Promise(function(Resolve, Reject) {
            Resolve(transpiled);
            Reject("");
        });
    }

    transpileMarkdown = async (code: string, filePath: string): Promise<string> => {
        if (!markdownTranspiler) {
            return "";
        }
        let transpiled = markdownTranspiler["parse"](code);
        if (filePath.match("App.md")) {
            transpiled = markdownHtmlTemplate(transpiled);
        }
        this.cacheMan.handleCache(filePath, transpiled, "html");
        return new Promise(function(Resolve, Reject) {
            Resolve(transpiled);
            Reject("");
        });
    }

    transpileVue = async (code: string, filePath: string): Promise<string> => {
        let transpiled = code;
        transpiled = this.patchScript(transpiled);
        if (filePath.match("App.vue")) {
            transpiled = vueHtmlTemplate(transpiled);
            this.cacheMan.handleCache(filePath, transpiled, "html");
        } else {
            this.cacheMan.handleCache(filePath, transpiled, "js");
        }
        return new Promise(function(Resolve, Reject) {
            Resolve(transpiled);
            Reject("");
        });
    }

    patchScript = (code: string): string => {
        const splited = code.split("\n");
        let i = 0;
        for (const element of splited) {
            for (const element2 in this.imports) {
            if (element.includes(element2) && element.match("import|require|from")) {
                    const start = element.search('"')+1;
                    const end = element.slice(start, element.length).search('"');
                    if (element.slice(start, start+end) == element2) {
                        splited[i] = splited[i].slice(0, start) + this.imports[element2] + splited[i].slice(start+end, element.length);
                    }
                }
            }
            i++;
        }
        return splited.join("\n");
    }
}