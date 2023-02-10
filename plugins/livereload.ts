import { BuchtaCLI } from "../bin/buchta";
import { Buchta } from "../src/buchta";

export function livereload() {
    return function(this: Buchta | BuchtaCLI) {
        if (this instanceof Buchta) {
            this.livereload = {
                clients: []
            }

            this.wsOnOpen(function(client) {
                this.livereload.clients.push(client)
            })
        }
    }
}