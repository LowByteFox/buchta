import { Graph } from "./Graph"

export class Cache {
    private graph: Graph;

    constructor(files: any[]) {
        this.graph = new Graph(files);
    }

    saveCache(path: string, indexes: string[]) {
        this.graph.dumpToFile(path, indexes);
    }

    getChanges(path: string, indexes: string[]) {
        return this.graph.getChangedFiles(path, indexes);
    }
}
