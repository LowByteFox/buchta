import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { basename, dirname, join, normalize, relative } from "path";
import { PathResolver } from "./utils/path_helper.js";
import { Transpiler, transpiler } from "./transpiler.js";
import { PageHandler, handler, ssrPageBuildFunction } from "./page_handler.js";
import { Bundler } from "./bundler.js";
import { TSDeclaration, TSGenerator, TSTree } from "./tsgen.js";
import { ServerPlugin } from "../PluginManager.js";
import { Cache } from "./cache/index.js";

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
    private typeImports: Map<string, {type: "types" | "path", value: string}[]> = new Map();
    private reUse: Map<string, string> = new Map();
    private cache: Cache | undefined;
    private lateInit = true;
    private transpileSSR;
    private indexes: string[] = [];

    globalDeclarations: (string | TSDeclaration)[] = [];
    moduleDeclarations: {name: string; content: (TSDeclaration|string)[], globals?: (TSDeclaration|string)[] }[] = [];
    references: {type: "types" | "path", value: string}[] = [];
    imports: string[] = [];

    constructor(rootPath: string, ssr = false) {
        this.rootPath = rootPath;
        this.ssrStep = ssr;
        this.transpileSSR = false;
    }

    prepare(dirs: string[] = ["public"]) {
        this.mkdir(".buchta/output/");
        if (this.ssrStep) this.mkdir(".buchta/output-ssr/");
        for (const d of dirs) {
            const arr: string[] = [];
            traverseDir(normalize(this.rootPath + `/${d}`), normalize(this.rootPath + `/${d}`), [arr]);

            const files = arr.map(i => ({ route: "/" + i, path: normalize(this.rootPath + `/${d}/` + i) }));

            this.files.push(...files);
        }
        if (existsSync(normalize(this.rootPath + "/.buchta/cache.json"))) {
            this.lateInit = false
        } 
    }

    async transpile() {
        if (!this.lateInit && !this.transpileSSR) {
            const newFiles = this.files.map(f => ({...f, content: readFileSync(f.path)}));
            this.cache = new Cache(newFiles);
            const out = this.cache.getChanges(normalize(this.rootPath + "/.buchta/cache.json"), this.indexes);
            for (const re of out.reuse) {
                this.reUse.set(re.route, re.reUse);
                for (const i in this.files) {
                    if (this.files[i].route == re.route) {
                        this.files.splice(parseInt(i), 1);
                    }
                }
            }

            for (const re of out.changed) {
                this.reUse.set(re.route, re.reUse);
            }
        }
        if (!this.called) {
            this.pathResolver = new PathResolver(this.rootPath, this.resolvers, [...this.files.map(i => i.route), ...Array.from(this.reUse.keys())], this.reUse);
            this.called = true;
        }
        for (const file of this.files) {
            const code = await this.transpiler.compile(file, this.ssrStep, this.transpileSSR);
            const resolved = this.pathResolver?.resolveDeps(file, code);
            if (!this.transpileSSR) {
                this.transpiled.push(resolved);
            } else {
                this.SSRd.set(resolved?.path ?? "", resolved);
            }
        }
        if (this.ssrStep && !this.transpileSSR) {
            this.transpileSSR = true;
            await this.transpile();
        } else if (this.transpileSSR) {
            this.transpileSSR = false;
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
                    const references = this.typeImports.get(ext);
                    ignoreExImports.push(ext);
                    tree.references = references;
                }

                const declaration = this.typeGens.get(ext);
                tree.modules?.push({
                    name: out.originalPath,
                    content: [declaration ?? ""]
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
                }, ...this.references],
                globals: this.globalDeclarations,
                modules: this.moduleDeclarations,
                imports: this.imports
            }
        })

        writeFileSync(normalize(this.rootPath + "/.buchta/buchta.d.ts"), this.tsgen.toString("/buchta.d.ts"));
        writeFileSync(normalize(this.rootPath + "/.buchta/tsconfig.json"), this.tsgen.tsconfigGen());
        this.mkdir(".buchta/types/");

        writeFileSync(normalize(this.rootPath + "/.buchta/types/pages.d.ts"), this.tsgen.toString("/types/pages.d.ts"));
    }

    async pageGen(plugins: ServerPlugin[]) {
        const outPath = this.rootPath + "/.buchta/output/";
        const ssrPath = this.rootPath + "/.buchta/output-ssr/";
        const generatedPages: any[] = [];
        const bundled: string[] = [];

        for (const input of this.transpiled) {
            this.pageSet(input, outPath, ssrPath, generatedPages, false);
        }

        for (const page of generatedPages) {
            for (const dep of page.deps) {
                if (bundled.indexOf(dep) == -1) {
                    const path = normalize(outPath + dep);
                    const bundlerOutput = await this.bundler.bundle([path], plugins);
                    if (bundlerOutput[0])
                        writeFileSync(outPath + dep, bundlerOutput[0]);
                }
            }

            writeFileSync(dirname(outPath + page.route) + "/index.html", page.code);
            this.pages.push(dirname(page.route));
        }

        if (this.lateInit) {
            // init the graph here
            const newFiles = this.files.map(f => ({...f, content: readFileSync(f.path), reUse: this.pathResolver?.getPath(f.route)}));
            this.cache = new Cache(newFiles);
            this.cache.saveCache(normalize(this.rootPath + "/.buchta/cache.json"), this.indexes);
        } else {
            const cacheGeneratedPages: any[] = [];
            for (const [route, newRoute] of this.reUse) {
                const out = this.pageSet({path: newRoute, originalPath: route}, outPath, ssrPath, cacheGeneratedPages, true);
                if (!out) {
                    this.transpiled.push({path: newRoute, originalPath: route, content: "cache"});
                }
            }

            if (!this.ssrStep) {
                for (const page of cacheGeneratedPages) {
                    this.pages.push(dirname(page.route));
                }
            } else {
                for (const page of cacheGeneratedPages) {
                    this.transpiled.push({path: page.route, originalPath: page.originalRoute, content: "cache" })
                }
            }

            this.cache?.saveCache(normalize(this.rootPath + "/.buchta/cache.json"), this.indexes);
        }
    }

    private pageSet(input: {originalPath: string, path: string}, outPath: string, ssrPath: string, generatedPages: any[], cache: boolean): boolean {
        const split = basename(normalize(input.originalPath)).split(".");
        const ext = split?.pop();
        if (!ext) return false;
        if (split.join(".") == "index") { 
            if (ext == "js" || ext == "ts") return false;
            const out: string | null = this.pageHandler.callHandler(ext, input.path, normalize(outPath + input.path), cache);
            if (!out) return false;
            const deps = this.pathResolver?.resolvePageDeps(out, input.path);

            if (this.ssrStep) {
                this.ssrPages.set(dirname(input.path), (_: string, route: string) => {
                    const cache = this.pageHandler.getSSRCache(route);
                    if (cache) return cache;

                    const ssrOut = this.pageHandler.callSSRHandler(ext, dirname(input.path), route, out, normalize(ssrPath + input.path));
                    if (!ssrOut) return "";
                    this.pageHandler.setSSRCache(route, ssrOut);
                    return ssrOut;
                });
            }

            if (generatedPages) {
                generatedPages.push({
                    code: out,
                    deps,
                    route: input.path,
                    originalRoute: input.originalPath
                });
            }
            return true;
        }
        return false;
    }

    configureSSR(srr: boolean) {
        this.ssrStep = srr;
    }

    setPageHandler(extension: string, handler: handler) {
        this.indexes.push(`index.${extension}`)
        this.pageHandler.assignHandler(extension, handler);
    }

    setSSRPageHandler(extension: string, handler: ssrPageBuildFunction) {
        this.pageHandler.assignSSRHandler(extension, handler);
    }

    declareTranspilation(target: string, result: string, handler: transpiler) {
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
                arr.push({route: page, path: normalize(this.rootPath + "/.buchta/output/" + page + "/index.html"), content: ""});
            }
        }

        return arr;
    }

    setTypeGen(extension: string, type: TSDeclaration | string) {
        this.typeGens.set(extension, type)
    }

    setTypeImports(extension: string, imports: {type: "types" | "path", value: string}[]) {
        this.typeImports.set(extension, imports);
    }
}
