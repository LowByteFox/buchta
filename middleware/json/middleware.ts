// These middleware function should not overwrite

export function before(req: any, res: any) {
    console.log("Before XD");
}

export function after(req: any, res: any) {
    console.log("After XD");
}