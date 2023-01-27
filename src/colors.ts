const ASCII = {
    reset: 0,
    bold: 1,
    underscore: 4,

    black: 30,
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    magenta: 35,
    cyan: 36,
    white: 37,

    bgBlack: 40,
    bgRed: 41,
    bgGreen: 42,
    bgYellow: 43,
    bgBlue: 44,
    bgMagenta: 45,
    bgCyan: 46,
    bgWhite: 47,
};

export const customLog = (modifiers: any[], text: string) => {
    let setting = "";
    for (const mod of modifiers) {
        setting += `\x1b[${mod}m`;
    }
    setting += text + "\x1b[0m";

    // @ts-ignore bun does have it
    process.stdout.write(setting);
}

export const colors = ASCII;