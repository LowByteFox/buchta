export class BuchtaRouter {
    private regexp = /(\/)[^:](.*?)(?=\/)/g;
    result: boolean;
    params: Map<string, string>;
    url: URL;
    base: string;
    query: Map<string, string>;
    fileName: string;

    constructor() {
        this.params = new Map<string, string>();
        this.result = false;
    }

    parseURLbase = (url: string) => {
        this.url = new URL(url);
        this.base = this.url.pathname;
        this.query = new Map<string, string>();
        this.url.searchParams.forEach((value: string, key: string) => {
            if (!this.query.has(key)) this.query.set(key, value);
        });
        this.fileName = this.base.split(".").pop();
    }

    private fixRoutePath = (route: string) => {
        let copy = route.replaceAll("//", "/");
        if (copy[copy.length-1] != "/") {
            copy += "/";
        }
        return copy;
    }

    private testArr = (arr: Array<string>) => {
        if (arr[0] == "") {
            arr.shift();
        }
        if (arr[arr.length-1] == "") {
            arr.pop();
        }
    }

    private parseOneLine = (params: Map<string, string>, test, dataPath, num, del) => {
        const temp1 = test[num].split(del);
        const temp2 = dataPath[num].split(del);
        for (let i = 0; i < temp1.length; i++) {
            params.set(temp1[i].replace(":", ""), temp2[i]);
        }
    }

    parseRoute = (template: string, path: string) => {
        this.params.clear();
        let copy = this.fixRoutePath(template);
        const matched = copy.match(this.regexp);
        const test = copy.split("/");
        this.testArr(test);

        const dataPath = this.fixRoutePath(path).split("/");
        this.testArr(dataPath);

        for (const element of matched) copy = copy.replace(element, "");

        if (copy[copy.length-1] == "/") copy = copy.slice(0, copy.length-1);


        const copyData = copy.split("/");
        this.testArr(copyData);

        const indexes = new Array<number>();

        for (const element of copyData) {
            indexes.push(test.indexOf(element));
        }

        this.result = true;
        for (let i = 0; i < test.length; i++) {
            const tempRegex = new RegExp(test[i]);
            if (indexes.includes(i)) {
                try {
                if (dataPath[i].includes("-")) {
                    this.parseOneLine(this.params, test, dataPath, i, "-");
                } else if (dataPath[i].includes(".")) {
                    this.parseOneLine(this.params, test, dataPath, i, ".");
                } else this.params.set(test[i].replace(":", ""), dataPath[i]);
            } catch {
                this.result = false;
                break;
            }

            } else if (!tempRegex.test(dataPath[i])) {
                this.result = false;
                break;
            }
        }
    }
}