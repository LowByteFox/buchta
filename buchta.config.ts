import { swagger } from "./src/plugins/swagger"

export default {
    rootDirectory: import.meta.dir + "/public",

    // TODO: cache needs implementation
    cache: true,
    
    routes: {
        // if your route is /index.html the route will change to / and the file will be index.html
        fileName: "index"
    },

    // TODO: make plugins work using configuration files
    plugins: [swagger]
}