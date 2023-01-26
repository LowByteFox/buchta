const func = async (req: any, res: any) => {
    const data = await req.json();
    console.log(data);

    res.sendJson(data);
}

export default func;

export function before(req: any, res: any) {
    console.log("Before");
}

export function after(req: any, res: any) {
    console.log("After");
}