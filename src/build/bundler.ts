import { BunPlugin } from "bun";

export class Bundler {
    async bundle(entrypoints: string[], plugins: BunPlugin[]) {
        let out = await Bun.build({
            entrypoints,
            plugins,
        });

        let outs = [];

        const { outputs, logs } = out;

        for (let output of outputs) {
            outs.push(await output.text());
        }

        if (logs.length == 0)
            return outs;
        else
            console.log(logs.join("\n"));
        return [];
    }
}

