import { PluginBuilder, } from "bun";

export interface ServerPlugin {
    name: string;
    setup: (build: PluginBuilder) => Promise<void>
}

export class PluginManager {
    private bundlerBunPlugins: ServerPlugin[] = [];
    private serverBunPlugins: ServerPlugin[] = [];

    setBundlerPlugin(plug: ServerPlugin) {
        this.bundlerBunPlugins.push(plug);
    }

    getBundlerPlugins() {
        return this.bundlerBunPlugins;
    }

    setServerPlugin(plug: ServerPlugin) {
        this.serverBunPlugins.push(plug);
    }

    injectPlugins() {
        for (const plug of this.serverBunPlugins) {
            Bun.plugin(plug)
        }
    }
}
