import { Buchta } from "./buchta";
import { swagger } from "./plugins/swagger";

const app = new Buchta();

// mixing ingredient `Swagger` into Buchta as if it was part of recipe
app.mixInto(swagger());

// setting up tag and scheme for Swagger
app.swagger.addTag("pet", "Pet info");
app.swagger.addScheme("http");

app.run(3000, () => {
    // setup swagger after the server has started running at route /swagger/
    app.swagger.setup("/swagger/");
});