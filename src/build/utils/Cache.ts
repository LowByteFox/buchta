import { Database } from "bun:sqlite";
import { createHash } from "crypto";
import { normalize } from "path";

export class Cache {
    private db: Database;
    add;
    update;

    constructor(rootDir: string) {
        this.db = new Database(normalize(`${rootDir}/.buchta/buildCache.sqlite`));
        this.db.run("CREATE TABLE IF NOT EXISTS cache (route TEXT PRIMARY KEY, hash VARCHAR(32), path TEXT)");
        this.add = this.db.prepare("INSERT INTO cache (route, hash, path) VALUES ($route, $hash, $path)");
        this.update = this.db.prepare("UPDATE cache SET hash = $hash WHERE route = $route")
    }

    getCache(route: string) {
        return this.db.query(`SELECT * FROM cache WHERE route = '${route}'`).all();
    }

    getChecksum(content: Buffer) {
        return createHash("md5").update(content).digest("hex");
    }

    checkForUpdate(route: string, content: Buffer) {
        const row: any[] = this.getCache(route);
        if (!row || row.length == 0)
            return false;

        if (row[0].hash != this.getChecksum(content))
            return true;
        return false;
    }

    checkCache(route: string, content: Buffer): boolean {
        const row: any[] = this.getCache(route);
        if (!row || row.length == 0)
            return false;

        if (row[0].hash == this.getChecksum(content))
            return true;
        return false;
    }
}
