import { Transpiler, TranspilerHandler } from "./transpiler";
import { EventManager } from "../utils/events";
import { getFiles, makeDir } from "../utils/fs";
import { PathResolver, TranspiledFile } from "../utils/paths";
import { basename, dirname, normalize } from "node:path";
import { writeFileSync } from "node:fs";
import { PageHandler, PageHandlerFunc, SSRPageHandlerFunc } from "../utils/pages";
import { Bundler } from "./bundler";
import { BunPlugin } from "bun";

export interface BuildFile {
    route: string;
    path: string;
}

export interface BuildPage {
    route: string;
    html: string;
    dependencies: string[];
    originalRoute: string;
}

export interface SSRPage {
    route: string;
    func: SSRPageHandlerFunc;
}

export interface BundledCode {
    text: string;
    path: string;
}

export interface Leftover {
    route: string;
    path: string;
    originalRoute: string;
}

export class Mediator extends EventManager {
    // build required fields
    private files: BuildFile[] = [];
    private resolvers: Record<string, string> = {};
    private pages: string[] = []
    private ssrPages: Map<string, any> = new Map();
    private bundled: string[] = []

    // transpiled files
    private transpiled: Map<BuildFile, TranspiledFile> = new Map();
    private ssrTranspiled: Map<BuildFile, any> = new Map();

    // helper classes
    private pathResolver?: PathResolver;
    private transpiler: Transpiler = new Transpiler();
    private pageHandler = new PageHandler();
    private bundler = new Bundler();

    // behaviour config
    private rootDir: string;
    private ssrEnabled: boolean;

    // useful paths
    private outputPath: string;
    private ssrOutputPath: string;

    constructor(rootDir: string, ssr = false) {
        super();
        this.rootDir = rootDir;
        this.ssrEnabled = ssr;
        this.outputPath = this.rootDir + "/.buchta/output/";
        this.ssrOutputPath = this.rootDir + "/.buchta/output-ssr/";
    }

    prepare(directories = ["public"]) {
        makeDir(this.rootDir + "/.buchta/output/");
        if (this.ssrEnabled)
            makeDir(this.rootDir + "/.buchta/output-ssr/");

        let length = directories.length;
        for (let i = 0; i < length; i++) {
            let dir = directories[i];
            let cachedPath = this.rootDir + '/' + dir;

            let files = getFiles(cachedPath);
            let filesLength = files.length;

            for (let j = 0; j < filesLength; j++) {
                this.files.push({
                    route: files[j].slice(cachedPath.length),
                    path: files[j]
                });
            }
        }
        this.emit("afterPreparation", this.files);
        this.pathResolver = new PathResolver(this.rootDir, this.resolvers, this.files);
    }

    async transpileFile(file: BuildFile, SSR = false) {
        const code = await this.transpiler.compile(file, this.ssrEnabled, this.ssrEnabled && SSR);
        const resolved = this.pathResolver!.resolveDeps(file, code);
        if (!SSR)
            this.transpiled.set(file, resolved);
        else
            this.ssrTranspiled.set(file, resolved);
        this.emit("fileTranspiled", file, SSR);
    }

    async transpileEverything() {
        let length = this.files.length;
        for (let i = 0; i < length; i++) {
            await this.transpileFile(this.files[i]);
        }

        if (this.ssrEnabled) {
            for (let i = 0; i < length; i++) {
                await this.transpileFile(this.files[i], true);
            }
        }

        this.emit("afterTranspilation", this.transpiled, this.ssrTranspiled);
    }

    saveFile(file: BuildFile) {
        let transpiled = this.transpiled.get(file)!;
        let out = normalize(this.outputPath + transpiled.route);
        makeDir(dirname(out));
        writeFileSync(out, transpiled.content);

        if (this.ssrEnabled) {
            let ssrOut = normalize(this.ssrOutputPath + transpiled.route);
            transpiled = this.ssrTranspiled.get(file);
            makeDir(dirname(ssrOut));
            writeFileSync(ssrOut, transpiled.content);
        }
    }

    saveEverything() {
        let length = this.files.length;
        for (let i = 0; i < length; i++) {
            this.saveFile(this.files[i]);
        }
    }

    async generatePage(transpiled: TranspiledFile): Promise<BuildPage | undefined> {
        const splited = basename(transpiled.originalRoute).split(".");
        const ext = splited.pop();
        if (!ext) return;
        if (splited.join(".") == "index") {
            if (ext == "js" || ext == "ts") return;

            this.emit("beforePagePageBuild", transpiled);

            const csrHTML = this.pageHandler.callHandler(ext, transpiled.route, normalize(this.outputPath + transpiled.route));

            if (!csrHTML) return;

            const dependencies = this.pathResolver!.resolvePageDeps(csrHTML, transpiled.route);
            
            if (this.ssrEnabled) {
                this.ssrPages.set(transpiled.originalRoute,
                                  this.generateSSRFunction(ext, transpiled.originalRoute, csrHTML, normalize(this.ssrOutputPath + transpiled.route))
                                 );
            }

            const page: BuildPage = {
                html: csrHTML,
                dependencies,
                route: transpiled.route,
                originalRoute: transpiled.originalRoute
            }

            this.emit("afterPagePageBuild", transpiled, page);

            return page;
        }
    }

    async generatePages() {
        let pages: (BuildPage | SSRPage | Leftover)[] = [];
        for (let [_, transpiled] of this.transpiled) {
            let out = await this.generatePage(transpiled);
            if (out) {
                pages.push(out);
            }
        }
        this.emit("afterPageGen", pages);
        return pages;
    }

    async bundlePage(page: BuildPage, plugins: BunPlugin[]) {
        let length = page.dependencies.length;
        let outputs: BundledCode[] = [];
        for (let i = 0; i < length; i++) {
            if (this.bundled.indexOf(page.dependencies[i]) == -1) {
                let path = normalize(this.outputPath + page.dependencies[i]);
                let output = await this.bundler.bundle([path], plugins);
                if (output[0]) 
                    outputs.push({
                        text: output[0],
                        path: normalize(this.outputPath + page.dependencies[i])
                    });
            }
        }

        return outputs;
    }

    async bundlePages(pages: BuildPage[], plugins: BunPlugin[]) {
        let length = pages.length;
        for (let i = 0; i < length; i++) {
            let bundledDeps = await this.bundlePage(pages[i], plugins);
            let bundledLength = bundledDeps.length;
            for (let j = 0; j < bundledLength; j++) {
                writeFileSync(bundledDeps[j].path, bundledDeps[j].text);
            }
            writeFileSync(dirname(this.outputPath + pages[i].route) + "/index.html", pages[i].html);
            this.pages.push(dirname(pages[i].route));
        }
        this.emit("afterPageGen", this.pages, this.ssrPages);
    }

    private generateSSRFunction(extension: string, originalRoute: string, html: string, fileToImport: string) {
        return async (_: string, route: string) => {
            const cache = this.pageHandler.getSSRCache(route);
            if (cache) return cache;

            const out = await this.pageHandler.callSSRHandler(extension, originalRoute, route, html, fileToImport);
            if (!out) {
                this.pageHandler.setSSRCache(route, html);
                return html;
            }
            this.pageHandler.setSSRCache(route, out);
            return out;
        }
    }

    getSSRPages() {
        let out: SSRPage[] = [];
        for (let [key, func] of this.ssrPages) {
            out.push({
                route: key,
                func
            });
        }
        return out;
    }

    getLeftovers() {
        let out: Leftover[] = [];
        for (const [_, val] of this.transpiled) {
            out.push({
                path: normalize(this.outputPath + val.route),
                route: val.route,
                originalRoute: val.originalRoute
            })
        }
        return out;
    }

    // API
    addTranspiler(source: string, target: string, handler: TranspilerHandler) {
        this.resolvers[source] = target;
        this.transpiler.setTranspiler(source, handler);
    }

    addPageHandler(source: string, handler: PageHandlerFunc) {
        this.pageHandler.assignHandler(source, handler);
    }

    addSSRPageHandler(source: string, handler: SSRPageHandlerFunc) {
        this.pageHandler.assignSSRHandler(source, handler);
    }
}
