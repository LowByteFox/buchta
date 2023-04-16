// If you sleep in Omori's bed multiple times, you'll start to have some strange dreams.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "fs";
import { basename, dirname, join, normalize, relative } from "path";
import { PathResolver } from "./utils/path_helper.js";
import { Transpiler } from "./transpiler.js";
import { PageHandler, handler, ssrPageBuildFunction } from "./page_handler.js";
import { Bundler } from "./bundler.js";
import { TSDeclaration, TSGenerator, TSTree } from "./tsgen.js";

function traverseDir(dirPath: string, baseDir: string, result: [string[]] = [[]]) {
    const files = readdirSync(dirPath);

    files.forEach(file => {
        const filePath = join(dirPath, file);

        if (statSync(filePath).isDirectory()) {
            traverseDir(filePath, baseDir, result);
        } else {
            const relativePath = relative(baseDir, filePath);
            result[0].push(relativePath);
        }
    });
}

export interface transpilationFile {
    route: string;
    path: string;
}

export class Mediator {
    private rootPath: string;
    private ssrStep = false;
    private pathResolver?: PathResolver;
    private files: transpilationFile[] = [];
    private transpiler: Transpiler = new Transpiler();
    private resolvers: Record<string, string> = {};
    private called = false;
    private transpiled: any[] = [];
    private SSRd: Map<string, any> = new Map();
    private ssrPages: Map<string, (originalRoute: string, route: string) => string> = new Map();
    private pageHandler = new PageHandler();
    private bundler: Bundler = new Bundler();
    private tsgen: TSGenerator = new TSGenerator();
    private pages: Array<string> = [];
    private typeGens: Map<string, TSDeclaration | string> = new Map();
    private typeImports: Map<string, string[]> = new Map();

    constructor(rootPath: string, ssr = false) {
        this.rootPath = rootPath;
        this.ssrStep = ssr;
        // @ts-ignore i don't want to setup types yet 
        globalThis.__BUCHTA_SSR = false;
    }

    prepare(dirs: string[] = ["public"]) {
        this.mkdir(".buchta/output/");
        if (this.ssrStep) this.mkdir(".buchta/output-ssr/");
        for (const d of dirs) {
            const arr: string[] = [];
            traverseDir(process.cwd() + `/${d}`, process.cwd() + `/${d}`, [arr]);

            const files = arr.map(i => { return { route: "/" + i, path: process.cwd() + "/public/" + i }});
            const filtered = files.filter(i => i.route.match(/.+\.server\.(js|ts)/) ? false : true);

            this.files.push(...filtered);
        }
    }
    
    transpile() {
        if (!this.called) {
            this.pathResolver = new PathResolver(this.resolvers, this.files.map(i => i.route));
            this.called = true;
        }
        for (const file of this.files) {
            const code = this.transpiler.compile(file);
            const resolved = this.pathResolver?.resolveDeps(file, code);
            // @ts-ignore types
            if (!globalThis.__BUCHTA_SSR) {
                this.transpiled.push(resolved);
            } else {
                this.SSRd.set(resolved?.path ?? "", resolved);
            }
        }
        // @ts-ignore types later
        if (this.ssrStep && !globalThis.__BUCHTA_SSR) {
            // @ts-ignore types later
            globalThis.__BUCHTA_SSR = true;
            this.transpile();
            // @ts-ignore types
        } else if (globalThis.__BUCHTA_SSR) {
            // @ts-ignore
            globalThis.__BUCHTA_SSR = false;
        }
    }

    toFS() {
        const outPath = this.rootPath + "/.buchta/output/";
        const ssrPath = this.rootPath + "/.buchta/output-ssr/";

        for (const output of this.transpiled) {
            const path = normalize(outPath + output.path);
            this.mkdir(".buchta/output/" + dirname(output.path).slice(1));
            writeFileSync(path, output.content);
        }

        if (this.ssrStep) {
            for (const [_, output] of this.SSRd) {
                const path = normalize(ssrPath + output.path);
                this.mkdir(".buchta/output-ssr/" + dirname(output.path).slice(1));
                writeFileSync(path, output.content);
            }
        }
    }

    typeGen() {
        const ignoreExImports: string[] = [];

        const tree: TSTree = {
            imports: [],
            modules: []
        }

        for (const out of this.transpiled) {
            if (this.pathResolver?.hasTSDeclaration(out.originalPath)) {
                if (out.originalPath.endsWith("ts") || out.originalPath.endsWith("js")) continue;
                const ext = out.originalPath.split(".").pop();

                if (!ignoreExImports.includes(ext)) {
                    const imports = this.typeImports.get(ext);
                    ignoreExImports.push(ext);
                    tree.imports?.push(...imports ?? "");
                }

                const declaration = this.typeGens.get(ext);
                tree.modules?.push({
                    name: out.originalPath,
                    content: [declaration ?? "", {name: "myFunc", id: "function", func: {returnType: `"${out.originalPath}"`}}]
                });
            }
        }

        this.tsgen.declarations.push({
            path: "/types/pages.d.ts",
            tree
        })

        this.tsgen.declarations.push({
            path: "/buchta.d.ts",
            tree: {
                references: [{
                    type: "path",
                    value: "types/pages.d.ts"
                }]
            }
        })

        writeFileSync(normalize(this.rootPath + "/.buchta/buchta.d.ts"), this.tsgen.toString("/buchta.d.ts"));

        this.mkdir(".buchta/types/");

        writeFileSync(normalize(this.rootPath + "/.buchta/types/pages.d.ts"), this.tsgen.toString("/types/pages.d.ts"));
    }

    pageGen() {
        const outPath = this.rootPath + "/.buchta/output/";
        const ssrPath = this.rootPath + "/.buchta/output-ssr/";
        const generatedPages: any[] = [];
        const bundled: string[] = [];

        for (const input of this.transpiled) {
            const orig = this.pathResolver?.getOriginalPath(input.path);
            if (!orig) continue;
            const split = basename(orig).split(".");
            const ext = split?.pop();
            if (!ext) continue;
            if (split.join(".") == "index") { 
                if (ext == "js" || ext == "ts") continue;
                const out: string | null = this.pageHandler.callHandler(ext, input.path, outPath + input.path);
                if (!out) continue;
                const deps = this.pathResolver?.resolvePageDeps(out, input.path);

                this.ssrPages.set(dirname(input.path), (originalRoute: string, route: string) => {
                    const cache = this.pageHandler.getSSRCache(route);
                    if (cache) return cache;

                    const ssrOut = this.pageHandler.callSSRHandler(ext, originalRoute, route, out, ssrPath + input.path);
                    this.pageHandler.setSSRCache(route, ssrOut);
                    return ssrOut;
                });

                generatedPages.push({
                    code: out,
                    deps,
                    route: input.path,
                });
            }
        }

        for (const page of generatedPages) {
            page.deps.forEach((dep: string) => {
                if (bundled.indexOf(dep) == -1) {
                    const bundle = this.bundler.bundle(normalize(outPath + dep)) ?? "";
                    writeFileSync(outPath + dep, bundle);
                    bundled.push(dep);
                }
            });

            writeFileSync(dirname(outPath + page.route) + "/index.html", page.code);
            this.pages.push(dirname(page.route));
        }
        // INFO: if build system is in SSR mode, these pages will instead of loading files run specified functions and ignore every index.html file
    }

    configureSSR(srr: boolean) {
        this.ssrStep = srr;
    }

    setPageHandler(extension: string, handler: handler) {
        this.pageHandler.assignHandler(extension, handler);
    }

    setSSRPageHandler(extension: string, handler: ssrPageBuildFunction) {
        this.pageHandler.assignSSRHandler(extension, handler);
    }

    // TODO: change this: any to this: Buchta
    declareTranspilation(target: string, result: string, handler: (this: any, route: string, path: string) => string) {
        this.resolvers[target] = result;
        this.transpiler.setTranspiler(target, handler);
    }

    private mkdir(path: string) {
        path = normalize(this.rootPath + "/" + path) + "/";
        if (!existsSync(path))
            mkdirSync(path, { recursive: true });
    }

    pageRouteGen(): {route: string; content: string | Function; path?: string; originalPath: string}[] {
        const arr: any[] = [];

        for (const t of this.transpiled) {
            arr.push({route: t.path, content: t.content, path: normalize(this.rootPath + "/.buchta/output/" + t.path), originalPath: t.originalPath});
        }
        if (this.ssrStep) {
            for (const [route, page] of this.ssrPages) {
                arr.push({route: route, content: page});
            }
        } else {
            for (const page of this.pages) {
                arr.push({route: page, content: normalize(this.rootPath + "/.buchta/output/" + page + "/index.html")});
            }
        }
        return arr;
    }

    setTypeGen(extension: string, type: TSDeclaration | string) {
        this.typeGens.set(extension, type)
    }

    setTypeImports(extension: string, imports: string[]) {
        this.typeImports.set(extension, imports);
    }
}
