
export default {
    port: 3000,
    
    // @ts-ignore yes there is import.meta.dir
    rootDirectory: import.meta.dir + "/public",

    cache: true,
    
    routes: {
        // if your route is /index.html the route will change to / and the file will be index.html
        fileName: "index"
    }
}