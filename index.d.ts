import { Buchta } from "./types/buchta";
import { BuchtaRequest } from "./types/request";
import { BuchtaResponse } from "./types/response";

declare module "buchta" {
    export { Buchta, BuchtaRequest, BuchtaResponse };
}