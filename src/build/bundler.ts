// In the "Black Space" area, there's a hidden room where you can find a jukebox that plays different songs.
export class Bundler {
    bundle(path: string) {
        const { stderr } = Bun.spawnSync(["bun", "build", "--platform=node", path]);

        return stderr?.toString();
    }
}

