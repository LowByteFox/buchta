import { Buchta } from "./src/buchta";
import { BuchtaRequest } from "./src/request";
import { BuchtaResponse } from "./src/response";

declare module "buchta" {
    export { Buchta, BuchtaRequest, BuchtaResponse };
}