import { createHash } from "crypto";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { basename, dirname, resolve } from "path";

function getChecksum(content: Buffer) {
    return createHash("md5").update(content).digest("hex");
}

const getFileList = (dirName: string): string[] => {
    let files: string[] = [];
    const items = readdirSync(dirName, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory()) {
            files = [
                ...files,
                ...(getFileList(`${dirName}/${item.name}`)),
            ];
        } else {
            files.push(`${dirName}/${item.name}`);
        }
    }

    return files;
};

function binaryBufferCheck(buffer: Buffer): boolean {
    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        if (byte === 0x00) {
            return true;
        }
        if (byte <= 0x08 || byte === 0x0b || byte === 0x0c || (byte >= 0x0e && byte <= 0x1f)) {
            return true;
        }
    }
    return false;
}

interface TreeNode {
    file: CacheFile;
    children: TreeNode[];
    parent: TreeNode | null;
    change: boolean;
}

interface CacheFile {
    route: string;
    path: string;
    checksum: string;
    content: Buffer;
}

export class Graph {
    private matrix: number[][];
    private files: CacheFile[];
    private indexes: Map<string, number> = new Map();
    private depRegex = /.(?<=['"])(\.\/|\/|\.\.\/).+?(?=['"])./g;

    constructor(files: any[]) {
        this.matrix = [];
        for (let i = 0; i < files.length; i++) {
            this.matrix.push(new Array(files.length).fill(0));
        }

        this.files = files.map(f => ({ ...f, checksum: getChecksum(f.content) }));

        this.files.forEach((f, i) => this.indexes.set(f.route, i));
        this.files.forEach(f => this.addFile(f, [f]));

    }

    private replacer(key: string, value: any) {
        if (key == "parent") {
            return undefined;
        } else if (key == "content") {
            return undefined; 
        } else if (key == "change") {
            return undefined;
        } else {
            return value
        }
    }

    private treeToArray(tree: TreeNode) {
        if (tree.children.length == 0) {
            return [tree];
        }

        let trees = [tree];

        for (let i = 0; i < tree.children.length; i++) {
            trees.push(...this.treeToArray(tree.children[i]));
        }

        return trees;
    }

    private traverseBackAndSetChange(list: TreeNode | null) {
        if (!list) return;

        let current: TreeNode | null = list;
        while (current) {
            current.change = true;
            current = current.parent;
        }
    }

    private detectChanges(tree: TreeNode, cached: TreeNode) {
        const arrayForm = this.treeToArray(tree)
        const cacheArrayForm = this.treeToArray(cached);
        for (const i in cacheArrayForm) {
            const normForm = arrayForm[i];
            const cacheForm = cacheArrayForm[i];
            // @ts-ignore it is
            normForm.file.reUse = cacheForm.file.reUse;
            if (normForm.file.checksum != cacheForm.file.checksum) {
                normForm.change = true;
                this.traverseBackAndSetChange(normForm.parent);
            } else {
                normForm.change = false;
            }
        }
    }
    private getReuse(tree: TreeNode): any[] {
        if (tree.children.length == 0) {
            return !tree.change ? [tree.file] : [];
        }

        let out = [];

        if (!tree.change) out.push(tree.file);

        for (let i = 0; i < tree.children.length; i++) {
            out.push(...this.getReuse(tree.children[i]));
        }

        return out;
    }

    private needsChange(tree: TreeNode): any[] {
        if (tree.children.length == 0) {
            return tree.change ? [tree.file] : [];
        }

        let out = [];

        if (tree.change) out.push(tree.file);

        for (let i = 0; i < tree.children.length; i++) {
            out.push(...this.needsChange(tree.children[i]));
        }

        return out;
    }

    private getRoutes(tree: TreeNode) {
        if (tree.children.length == 0) {
            return [tree.file.route]
        }

        let files = [tree.file.route];

        for (let i = 0; i < tree.children.length; i++) {
            files.push(...this.getRoutes(tree.children[i]))
        }

        return files;
    }

    private genCacheTree(indexes: string[]) {
        const registeredRoutes = [];
        const cacheReady = [];
        const trees = [];

        for (let i = 0; i < this.matrix.length; i++) {
            trees.push(this.traverse(i));
        }

        for (let i = 0; i < trees.length; i++) {
            if (indexes.indexOf(basename(trees[i].file.route)) != -1) {
                registeredRoutes.push(...this.getRoutes(trees[i]));
                cacheReady.push(trees[i]);
            }
        }
 
        for (let i = 0; i < trees.length; i++) {
            if (!registeredRoutes.includes(trees[i].file.route)) {
                registeredRoutes.push(...this.getRoutes(trees[i]));
                cacheReady.push(trees[i]);
            }
        }

        return cacheReady;
    }

    dumpToFile(name: string, indexes: string[]) {
        const out = this.genCacheTree(indexes);
        writeFileSync(name, JSON.stringify(out, this.replacer));
    }

    getChangedFiles(name: string, indexes: string[]) {
        const input: TreeNode[] = JSON.parse(readFileSync(name, {encoding: "utf-8"}));
        const trees = this.genCacheTree(indexes);
        for (const tree of trees) {
            const found = input.find(tr => tr.file.route == tree.file.route);
            if (found) {
                this.detectChanges(tree, found)
            }
        }

        const changed = [];
        const notChanged = [];

        for (const tree of trees) {
            changed.push(...this.needsChange(tree));
            notChanged.push(...this.getReuse(tree));
        }

        return {
            reuse: notChanged,
            changed
        };
    }

    traverse(index: number) {
        return buildTree(index, this.matrix, this.files);
    }

    private addFile(file: CacheFile, finished: CacheFile[] = []) {
        if (binaryBufferCheck(file.content)) return;
        const content = file.content.toString();
        const deps = content.match(this.depRegex);

        const index = this.indexes.get(file.route);
        if (typeof index == "undefined") return;

        if (deps) {
            for (const dep of deps) {
                const path = dep.slice(1, -1);
                // for index
                const absolutePath = resolve(dirname(file.route), path);
                const xIndex = this.indexes.get(absolutePath);
                if (typeof xIndex == "undefined") continue;

                if (!finished.includes(this.files[xIndex])) {
                    this.matrix[index][xIndex] = 1;
                    finished.push(this.files[xIndex]);
                    this.addFile(this.files[xIndex], finished);
                    finished.splice(finished.indexOf(this.files[xIndex]), 1);
                }
            }
        }
    }
}

function buildTree(index: number, matrix: number[][], files: CacheFile[]): TreeNode {
    const root: TreeNode = { file: files[index], children: [], parent: null, change: true };
    const traversed = new Set([index]);
    const stack = [{ node: root, index: index }];

    while (stack.length > 0) {
        // @ts-ignore stfu
        const { node, index } = stack.pop();
        const parent = findParent(root, files[index]);
        node.parent = parent; 
        for (let adjacent = 0; adjacent < matrix.length; adjacent++) {
            if (matrix[index][adjacent] && !traversed.has(adjacent)) {
                traversed.add(adjacent);
                const child: TreeNode = { file: files[adjacent], children: [], parent: node, change: true };
                node.children.push(child);
                stack.push({ node: child, index: adjacent });
            }
        }
    }

    return root;
}

function findParent(node: TreeNode, parentFile: CacheFile): TreeNode | null {
    if (node.file === parentFile) {
        return null;
    }
    for (const child of node.children) {
        if (child.file === parentFile) {
            return node;
        }
        const found = findParent(child, parentFile);
        if (found) {
            return found;
        }
    }
    return null;
}

/*

const files = getFileList("public").map(f => ({ route: f.slice(6), path: resolve(f) })).map(f => ({...f, content: readFileSync(f.path)}));

const g = new Graph(files);

console.log(g.getChangedFiles("./cache.json", ["index.html", "index.svelte"]));
*/
