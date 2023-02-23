import { BuchtaCLI } from "../bin/buchta";
import { Buchta } from "../src/buchta";

export function livereload() {
    return function(this: Buchta | BuchtaCLI) {
        if (this instanceof Buchta) {
            if (this.buildMode) return;
            this.livereload = {
                clients: [],
                onUpdate: [],
                registerOnUpdate: function(f: (file: string) => void) {
                    this.onUpdate.push(f);
                }
            }

            this.wsOnOpen(function(client) {
                this.livereload.clients.push(client);
            })
        }
    }
}