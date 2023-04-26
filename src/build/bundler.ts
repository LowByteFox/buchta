import { ServerPlugin } from "../PluginManager";

export class Bundler {
    async bundle(entrypoints: string[], plugins: ServerPlugin[]) {
        // @ts-ignore now
        const out = await Bun.build({
            target: "browser",
            entrypoints,
            plugins,
        })

        const outs = [];

        const { outputs } = out;

        for (const output of outputs) {
            const { result } = output;
            outs.push(await result.text());
        }

        return outs;
    }
}

