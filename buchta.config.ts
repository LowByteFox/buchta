import { swagger } from "./src/plugins/swagger";
import { typescript } from "./src/plugins/typescript";
import { markdown } from "./src/plugins/markdown";

export default {
    port: 3000,
    // @ts-ignore yes there is import.meta.dir
    rootDirectory: import.meta.dir + "/public",

    // TODO: cache needs implementation
    cache: true,
    
    routes: {
        // if your route is /index.html the route will change to / and the file will be index.html
        fileName: "index"
    },

    ws: {
        enable: true  
    },

    plugins: [swagger("/swag/"), typescript(), markdown()]
}