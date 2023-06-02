import { Buchta, BuchtaConfig, BuchtaPlugin } from "./src/buchta";
import devServer, { earlyHook } from "./src/server/dev.ts";
import { BuchtaLogger } from "./src/utils/logger.ts";

declare module "buchta" {
    export { Buchta, BuchtaConfig, BuchtaPlugin,
        devServer, earlyHook, BuchtaLogger
    };
}
