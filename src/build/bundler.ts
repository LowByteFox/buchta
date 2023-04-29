import { ServerPlugin } from "../PluginManager";

export class Bundler {
    async bundle(entrypoints: string[], plugins: ServerPlugin[]) {
        // @ts-ignore now
        const out = await Bun.build({
            entrypoints,
            plugins,
        })

        const outs = [];

        const { outputs, logs } = out;

        for (const output of outputs) {
            const { result } = output;
            outs.push(await result.text());
        }

        if (!logs)
            return outs;
        else
            console.log(logs);
        return [null];
    }
}

