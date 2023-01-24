import { Buchta } from "../src/buchta";
import { BuchtaRequest } from "../src/request";
import { BuchtaResponse } from "../src/response";

/**
 * Swagger plugin for Buchta
 * @param {string} route - route where will swagger sit
 */
export function swagger (route: string) {
    // page that will be rendered by the server
    const swaggerPage = (path: string, port: string) => {
        return `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta
              name="description"
              content="SwaggerUI"
            />
            <title>SwaggerUI</title>
            <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css" />
          </head>
          <body>
          <style>
          body {
            margin: 0;
            padding: 0;
          }
          </style>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js" crossorigin></script>
          <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-standalone-preset.js" crossorigin></script>
          <script>
            window.onload = () => {
              window.ui = SwaggerUIBundle({
                url: 'http://localhost:${port}${path}swagger.json',
                dom_id: '#swagger-ui',
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIStandalonePreset
                ],
                layout: "StandaloneLayout",
              });
            };
          </script>
          </body>
        </html>
        `;
    }

    const setRoute = route;

    return function (this: Buchta) {
        // assigning swagger object to Buchta instance, so it can be accessed from the outside
        this.swagger = {
            setup: (path: string) => {
                if (path) {
                    this.get(path, (_req: BuchtaRequest, res: BuchtaResponse) => {
                        res.send(swaggerPage(path, this.getPort()));
                        res.setHeader("Content-Type", "text/html");
                    });

                    this.get(path + "swagger.json", (_req: BuchtaRequest, res: BuchtaResponse) => {
                        res.sendJson(this.swagger.defs);
                    });
                }
            },
            defs: {
                swagger: "2.0",
                info: {
                    title: "Buchta Swagger Default",
                    version: "0.0.0",
                    description: "Default settings for Buchta Swagger",
                    termsOfService: "http://swagger.io/terms/",
                    contact: {
                        email: "gajdos.jan77@gmail.com"
                    }
                },
                tags: [],
                schemes: [],
                paths: {},
            },
            addTag: (name: string, description: string) => {
                this.swagger.defs.tags.push({ name, description });
            },
            addScheme: (scheme: string) => {
                this.swagger.defs.schemes.push(scheme);
            }
        }

        this.assignAfterRouting((options: any) => {
            this.swagger.defs.paths[options.path] = {};
            this.swagger.defs.paths[options.path][options.method] = options.data;
        })

        this.swagger.setup(setRoute);
    }
}