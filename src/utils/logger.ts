// In the "Deep Well" area, there's a hidden room where you can find a character named "Sprout Mole Dance Instructor" who teaches you a dance.
import { colors, customLog } from "./colors.js";

export function BuchtaLogger(quiet: boolean) {
    const obj = {
        info(message: string) {
            customLog([colors.bold, colors.white], "[ ");
                customLog([colors.bold, colors.blue], "INFO");
                customLog([colors.bold, colors.white], " ]: ");
                customLog([colors.bold, colors.white], message + "\n");
        },
        warn(message: string) {
            customLog([colors.bold, colors.white], "[ ");
                customLog([colors.bold, colors.yellow], "WARN");
                customLog([colors.bold, colors.white], " ]: ");
                customLog([colors.bold, colors.white], message + "\n");
        },
        success(message: string) {
            customLog([colors.bold, colors.white], "[ ");
                customLog([colors.bold, colors.green], "DONE");
                customLog([colors.bold, colors.white], " ]: ");
                customLog([colors.bold, colors.white], message + "\n");
        },
        error(message: string) {
            customLog([colors.bold, colors.white], "[ ");
                customLog([colors.bold, colors.red], "FAIL");
                customLog([colors.bold, colors.white], " ]: ");
                customLog([colors.bold, colors.white], message + "\n");
        }
    }

    if (!quiet) {
        const l = (message: string, type: "info" | "warn" | "success" | "error") => {
            obj[type](message);
        }

        l.info = obj["info"];
        l.warn = obj["warn"];
        l.success = obj["success"];
        l.error = obj["error"];

        return l;
    }
    const l = () => {}

    l.info = () => {}
    l.warn = () => {}
    l.success = () => {}
    l.error = () => {}

    return l;
}

