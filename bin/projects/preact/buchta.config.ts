import { preact } from "buchta/plugins/preact.js";

export default {
    port: 3000,

    // @ts-ignore yes there is import.meta.dir
    rootDirectory: import.meta.dir,

    plugins: [preact(opts)]
}