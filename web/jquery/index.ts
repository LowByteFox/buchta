import jquery from "jQuery";
import { BuchtaRouter } from "/buchta-router.ts";

const router = new BuchtaRouter();

router.parseURLbase(window.location.href);
router.parseRoute("/jquery/:data/", router.base);
console.log(router.params);
console.log(router.query);

jquery("#root").text(`${JSON.stringify(Object.fromEntries(router.params))}
${JSON.stringify(Object.fromEntries(router.query))}`)