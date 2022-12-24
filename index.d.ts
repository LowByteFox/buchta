import { Buchta, get_version } from "./src/buchta";
import { BuchtaRequest } from "./src/request";
import { BuchtaResponse } from "./src/response";
declare module "buchta" {
    export { Buchta, get_version, BuchtaRequest, BuchtaResponse };
}