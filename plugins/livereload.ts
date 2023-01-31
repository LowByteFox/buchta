import { Buchta } from "../src/buchta";

export function livereload() {
    return function(this: Buchta) {
        this.livereload = {
            clients: []
        }

        this.wsOnOpen((client) => {
            this.livereload.clients.push(client)
        })
    }
}