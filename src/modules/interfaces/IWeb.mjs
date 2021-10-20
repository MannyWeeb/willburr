import express from "express";
import path from "path";

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

        //Autosave, idk why I have this but ehh..
        setInterval(()=> {
            this.app.save(null, ()=>{
                console.log(`Data saved on ${new Date().toTimeString()}`);
            });
        },60000);

        this.webServer = new Web("willburr-web", config["willburr-web"].port || 80);

        let { server } = this.webServer;

        server.use(express.json());
        server.use(express.urlencoded({ extended: false }));

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
            server.use("/fh", express.static("static/filehub"));
            server.get("/fh/*", (_, res) => {
                res.sendFile(path.resolve("static/filehub/index.html"));
            });
        }

        server.use(express.static("static/willburr-web"));
        server.use("/", this.handleAPI());

        this.webServer.run((data, err) => {
            if (data) {
                const { elapsed } = data;
                utils.simpleSuccess({
                    header: `${this.webServer.name} is now running on port ${this.webServer.port}`,
                    message: `Elapsed Time: ${elapsed}s.`
                });
            } else {
                utils.simpleError({ error: "Willburr-Web failed to run.", reason: err || null });
            }
        });
    }

    handleAPI() {
        let _sr = (response, res, err) => {
            this.app.save(null,()=>{
                response.status(!err ? 200 : 400).json({
                    result: res,
                    error: err
                });
            });
        }

        let paramFunctions = {
            "toggleServer" : ["action", "target"],
            "createServer" : ["name", "port"],
            "deleteServer" : ["name"],
            "createString" : ["name", "server", "directory"],
            "deleteString" : ["name", "server"]
        }

        return express.Router().post("/", (req, res) => {
            const { action, params } = req.body;
            const { servers, strings } = this.app;
            if (action) {
                if(Object.keys(paramFunctions).indexOf(action) !== -1){
                    const [ allowedParams, paramKeys ] = [paramFunctions[action], Object.keys(params)];
                    let missing = allowedParams.filter((v)=> paramKeys.indexOf(v) === -1);
                    if(missing.length > 0){
                        _sr(res, null, `Parameter${allowedParams.length > 1 ? "s" : ""} not supplied: ${missing}`);
                        return;
                    }
                }
                switch (action) {
                    case "getData"      : _sr(res, { servers, strings }); break;
                    case "toggleServer" : {
                        const { action, target } = params;
                        const { servers } = this.app;

                        let validAction = ["run", "stop"].indexOf(action.toLowerCase());

                        if (!action && !validAction) {
                            _sr(res, null, "Missing or invalid field 'action' in request body.");
                        } else if (!servers[target]) {
                            _sr(res, null, `Server \'${target}\' was not found.`);
                        } else {
                            let _server = servers[target];
                            _server[action]((_, err) => {
                                _sr(res, _server , err);
                            });
                        }
                    } break;
                    case "createServer" : {
                        let { name, port } = params;
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
                            _sr(res, { server });
                        } else {
                            _sr(res, null, errors);
                        }
                    } break;
                    case "deleteServer" : {
                        const { name } = params;
                        let server = this.app.servers[name];
                        if (!server) {
                            _sr(res, null, `Server \'${name}\' does not exist`);
                        } else {
                            server.stop(() => {
                                delete this.app.servers[name];
                                _sr(res, true);
                            });
                        }
                    }break;
                    case "createString" : {
                        const { server, name, directory } = params;
                        let _server = this.app.servers[server];

                        if (!_server){
                            _sr(res, null, `Server \'${server}\' does not exist.`);
                        }else{
                            let temp = { directory, indexFile : ["index.htm", "index.html"] };
                            _server.addString({[name] : temp})
                            .then(()=> _sr(res,temp), (v)=> _sr(res,null, v));
                        }
                    }break;
                    case "deleteString" : {
                        const { server, name } = params;
                        let _server = this.app.servers[server];

                        if(_server){
                            if(_server.removeString(name)){
                                delete _server.strings[name];
                                _sr(res, true);
                            }else{
                                _sr(res, null, `Endpoint \'${name}\' does not exist within Server \'${server}\'`);
                            }
                            
                        }else _sr(res, null, `Server \'${server}\' does not exist`);
                    }break;
                    default : {
                        _sr(res, null, `Unknown action named \'${action}\'.`);
                    }
                }
            } else {
                _sr(res, null, "Missing \'action\' field within the request body.");
            }
        });
    }
}