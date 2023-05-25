import { BunPlugin } from "bun";
import { Buchta, BuchtaPlugin } from "./buchta";

export class PluginManager {
    private bundlerBunPlugins: BunPlugin[] = [];
    private serverBunPlugins: BunPlugin[] = [];
    private plugins: Map<string, BuchtaPlugin> = new Map();
    private registers: Map<string, string> = new Map();
    private s: Buchta;
    private currentPlugin: string = "null";

    constructor(server: Buchta) {
        this.s = server;
    }

    addPlugin(data: BuchtaPlugin) {
        if (this.plugins.has(data.name)) {
            this.s.logger.error(`Plugin "${data.name}" is already loaded!`)
            return false;
        }

        for (const plug of data.dependsOn ?? []) {
            if (!this.plugins.has(plug)) {
                this.s.logger.error(`Plugin "${data.name}" requires plugin "${plug}"!`)
                return false;
            }
        }

        for (const plug of data.conflictsWith ?? []) {
            if (this.plugins.has(plug)) {
                this.s.logger.error(`Plugin "${data.name}" conflicts with plugin "${plug }"!`)
                return false;
            }
        }

        this.plugins.set(data.name, data);
        this.currentPlugin = data.name

        return true;
    }

    pluginRegisterAction(type: string) {
        this.registers.set(type, this.currentPlugin);
    }

    checkAvailableRegister(type: string) {
        return this.registers.has(type);
    }

    getRegisterOwner(type: string) {
        return this.registers.get(type);
    }

    setBundlerPlugin(plug: BunPlugin) {
        this.bundlerBunPlugins.push(plug);
    }

    getBundlerPlugins() {
        return this.bundlerBunPlugins;
    }

    setServerPlugin(plug: BunPlugin) {
        this.serverBunPlugins.push(plug);
    }

    injectPlugins() {
        for (const plug of this.serverBunPlugins) {
            Bun.plugin(plug)
        }
    }
}

