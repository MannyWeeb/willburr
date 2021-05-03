import express from "express";
import bodyParser from "body-parser";

import Web from "../structs/Web.mjs";
import { utils } from "./IConsole.mjs";
import config from "../../../config.json";
import App from "../../App.mjs";


//Routers (for web-modules)
import filehubRouter from "../../routers/filehub.mjs";

export default class IWeb {

    constructor() {
        this.app = new App();

        this.app.load(null, () => {
            //Default profile loaded.  
        });

        this.webServer = new Web("willburr-web", config["willburr-web"].port || 80);

        let { server } = this.webServer;

        server.use(bodyParser.json());
        server.use(bodyParser.urlencoded({ extended: false }));

        //Temp
        server.use((req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "*");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            req.next();
        });


        //Module Routers:
        const moduleConfig = config["willburr-web"].modules;

        if (moduleConfig.filehub.enabled) {
            const ROOT = moduleConfig.filehub.rootDir;
           
            server.use("/fh/api", filehubRouter);
            server.use("/fh/static/thumb", express.static(`${ROOT}/thumbcache`));
            server.use("/fh/static/content", express.static(`${ROOT}`));
            
            server.use("/fh" , express.static("static/filehub"));
            server.get("/fh/*",(req,res)=>{
                res.sendFile(path.resolve("static/filehub/index.html"));
            });
            
        }

        server.use(express.static("static/willburr-web"));
        server.use("/api", this.handleAPI());


        this.webServer.run((success, data) => {
            if (success) {
                utils.simpleSuccess({
                    header: `${this.webServer.name} is now running on port ${this.webServer.port}`,
                    message: `Elapsed Time: ${data.elapsed}s.`
                });
            } else {
                utils.simpleError(data);
            }
        });

    }

    handleAPI() {
        let api = express.Router();

        api.get("/getData", (_, res) => {
            const { servers, strings } = this.app;

            res.status(200).json({
                servers,
                strings,
            });
        });

        api.post("/serverControl", (req, res) => {
            const { action, target } = req.body;

            const { servers } = this.app;

            if (!action || (action !== "run" && action !== "stop")) {
                res.status(400).json({ error: "Missing Field", message: "Missing or invalid Field 'action' in request body" });
                return;
            }

            if (!servers[target]) {
                res.status(404).json({ error: "NOT_FOUND", message: `Server ${target} was not found.` });
            } else {
                let _server = servers[target];

                _server[action]((success, result) => {
                    if (action === "stop") {
                        this.app.save(null, () => {
                            res.status(success ? 200 : 400).json({ server: _server, result });
                        });

                    } else {
                        res.status(success ? 200 : 400).json({ server: _server, result });
                    }
                });
            }
        });

        api.post("/server", (req, res) => {
            let { name, port } = req.body;

            let errors = [];

            if (!name || !port) {
                errors.push("Required fields are missing (name,port)");
            } else {
                port = Number(port);

                if (this.app.servers[name.trim()]) errors.push("Server name is already taken!");

                if (port == NaN) errors.push("Port should be a number!");

                if (!(port >= 0 && port <= 65535)) errors.push("Out of range! please use any port between 0 to 65535.");
            }

            if (errors.length === 0) {
                let server = new Web(name, port, new Set());
                this.app.servers[name] = server;
                res.status(200).json({ server });
            } else {
                res.status(400).json({ errors });
            }

        });
        ;
        api.delete("/server", (req, res) => {
            const { name } = req.body;
            let server = this.app.servers[name];
            if (!server) {
                res.status(400).json({
                    error: "Server not found",
                    reason: !name ? "No server name supplied" : `Server ${name} does not exist`
                })
            } else {
                server.stop(() => {
                    delete this.app.servers[name];
                    res.status(200).send("Success");
                });
            }
        });

        api.post("/string", (req, res) => {
            const { server, name, directory } = req.body;

            let _server = this.app.servers[server];

            try {

                if (!_server) throw (`Host Server does not exist or was left blank.`);

                if (!name) throw (`Endpoint name cannot be empty!`);

                if (!directory) throw (`Static directory should not be null!`);

                let endpoint = {};

                endpoint[name] = { directory, indexFile: ["index.htm", "index.html"] }

                if (_server.addString(endpoint)) {
                    res.status(200).send(endpoint);
                } else {
                    throw (`Duplicate endpoint name found.`);
                }

            } catch (err) {
                res.status(400).json({
                    error: `Failed to create endpoint /${name}`,
                    reason: err
                })
            }
        });

        api.delete("/string", (req, res) => {
            const { server, name } = req.body;

            try {
                let _server = this.app.servers[server];

                if (!_server) {
                    throw (!server ? "No server name supplied" : `Server ${server} does not exist`);
                }

                if (!name) {
                    throw ("Endpoint name cannot be null!");
                }

                if (_server.strings[name]) {
                    delete _server.strings[name];
                    res.status(200).send("success");
                } else {
                    throw (`Server ${server} does not have an endpoint named ${name}`);
                }

            } catch (err) {
                res.status(400).json({
                    error: `Failed to create endpoint`,
                    reason: err
                });
            }
        });

        return api;
    }

}



