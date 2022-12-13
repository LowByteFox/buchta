import { Buchta } from "./buchta";

const app = new Buchta();

// setting up tag and scheme for Swagger
app.swagger.addTag("pet", "Pet info");
app.swagger.addScheme("http");

app.run(3000, () => {
    // setup swagger after the server has started running at route /swagger/
    app.swagger.setup("/swagger/");
});