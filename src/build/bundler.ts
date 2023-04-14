export class Bundler {
    bundle(path: string) {
        const { stderr } = Bun.spawnSync(["bun", "build", "--platform=node", path]);

        return stderr?.toString();
    }
}

