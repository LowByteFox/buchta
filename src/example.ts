import { Buchta } from "./buchta";

const app = new Buchta();

app.wsOnMessage((ws, msg) => {
    console.log(msg);
})

app.run();