export type handler = (route: string, path: string, ...args: any[]) => string;
export type ssrPageBuildFunction = (originalRoute: string, route: string, csrHtml: string, modFile: string) => Promise<string>;

export class PageHandler {
    private handlers: Map<string, handler> = new Map();
    private ssrCache: Map<string, string> = new Map();
    private ssrHandler: Map<string, ssrPageBuildFunction> = new Map();

    callHandler(extension: string, route: string, path: string, ...args: any[]): string | null {
        const func = this.handlers.get(extension);
        if (!func) {
            //throw new Error(`Page handler for extension "${extension}" doesn't exist!`);
            return null;
        }

        return func(route, path, ...args);
    }

    assignHandler(extension: string, handler: handler) {
        this.handlers.set(extension, handler);
    }

    getSSRCache(route: string): string | null {
        return this.ssrCache.get(route) ?? null;
    }

    setSSRCache(route: string, code: string) {
        this.ssrCache.set(route, code);
    }

    assignSSRHandler(extension: string, handler: ssrPageBuildFunction) {
        this.ssrHandler.set(extension, handler);
    }

    callSSRHandler(extension: string, originalRoute: string, route: string, csrHtml: string, modFile: string): Promise<string | null> {
        const func = this.ssrHandler.get(extension);
        if (!func) {
            // (`SSR Page handler for route "${originalRoute}" doesn't exist!`);
            return Promise.resolve(null);
        }

        return func(originalRoute, route, csrHtml, modFile);
    }
}
