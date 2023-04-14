import { colors, customLog } from "./colors.js";

export class Logger {
    info(message: string) {
        customLog([colors.bold, colors.white], "[ ");
        customLog([colors.bold, colors.blue], "INFO");
        customLog([colors.bold, colors.white], " ]: ");
        customLog([colors.bold, colors.white], message);
    }
    warn(message: string) {
        customLog([colors.bold, colors.white], "[ ");
        customLog([colors.bold, colors.yellow], "WARN");
        customLog([colors.bold, colors.white], " ]: ");
        customLog([colors.bold, colors.white], message);
    }
    success(message: string) {
        customLog([colors.bold, colors.white], "[ ");
        customLog([colors.bold, colors.green], "DONE");
        customLog([colors.bold, colors.white], " ]: ");
        customLog([colors.bold, colors.white], message);
    }
    error(message: string) {
        customLog([colors.bold, colors.white], "[ ");
        customLog([colors.bold, colors.red], "ERROR");
        customLog([colors.bold, colors.white], " ]: ");
        customLog([colors.bold, colors.white], message);
    }
}
