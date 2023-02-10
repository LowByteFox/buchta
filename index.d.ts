import { Buchta, get_version } from "./src/buchta";
import { BuchtaRequest } from "./src/request";
import { BuchtaResponse } from "./src/response";
import { BuchtaSubrouter } from "./src/utils/subrouter";
import { BuchtaCLI, BuchtaQuestionType, BuchtaProjectOption, BuchtaPluginTemplate } from "./bin/buchta";

declare module "buchta" {
    export { Buchta, get_version, BuchtaRequest, BuchtaResponse, BuchtaSubrouter, BuchtaCLI, BuchtaQuestionType, BuchtaProjectOption, BuchtaPluginTemplate };
}