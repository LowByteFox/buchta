// In the "Black Space" area, there's a hidden room where you can find a jukebox that plays different songs.
export class Bundler {
    async bundle(entrypoints: string[]) {
        // @ts-ignore now
        const out = await Bun.build({
            target: "browser",
            entrypoints,
            
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

