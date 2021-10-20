import Web from "./modules/structs/Web.mjs";
import chalk from "chalk";
import fs from "fs";


//Persistence
const CONFIG_FILE = "src/profiles/state.json";
const CONFIG_DIR = "src/profiles";

export default class App {

    constructor() {
        this.servers = {};
        this.strings = {};
    }

    load(fileDir, callback) {
        const filePath = fileDir || CONFIG_FILE;

        //Previously accessible by the whole class.. load() is the sole user of this function so I'll be placing it here for now.
        let parseServers = (config, callback) => {
            //NOTE: setting this to true will toggle this method to reject all incoming values once a duplicate value is found.(Might be a bit too indiscriminate.. up to you though...)
            const noDuplicate = false;

            try {
                const stamp = Date.now();
                const entries = Object.keys(this.servers);

                let _require = (name, type, fields) => {
                    let nullFields = [];
                    for (const f in fields) {
                        if (fields[f] === null || fields[f] === undefined) {
                            nullFields.push(f);
                        }
                    }
                    if (nullFields.length !== 0) throw { error: "Parsing failed", reason: `Missing properties in object ${name} of type ${type}, Here are the missing fields : [${nullFields}].` }
                }

                let serverCounter = Object.values(this.servers).length;
                let stringCounter = Object.values(this.strings).length;

                let serverRejects = 0;
                let stringRejects = 0;

                //Parse servers array
                for (const server of config.servers) {
                    //Checks for any duplicate already loaded in the global datastore.
                    if (Object.entries(this.servers).length !== 0) {
                        for (const _server of entries) {
                            if (server.name === _server) {
                                if (noDuplicate) throw { error: "Duplicate value found in global datastore.", reason: "Two or more server entries were found to have identical names." };
                                serverRejects++;
                                continue;
                            }
                            if (server.port === entries[_server].port) {
                                if (noDuplicate) throw { error: "Duplicate value found in global datastore.", reason: "Two or more server entries were found to have identical ports." };
                                serverRejects++;
                                continue;
                            }
                        }
                    }

                    const { name, port, strings, startStamp, endStamp, totalVisits } = server;

                    let stringSet = {};

                    _require(name, "web", { name, port, strings });

                    for (const string of strings) {
                        for (const endpoint in string) {
                            if (stringSet[endpoint]) {
                                if (noDuplicate) throw { error: "Duplicate value found in source.", reason: `Server ${name} had a duplicate value within its assigned strings, namely with its ${endpoint} string.` }
                            } else {
                                const { directory, indexFile } = string[endpoint];
                                _require(endpoint, "string", { directory, indexFile });
                                stringSet[endpoint] = { directory , indexFile };
                            }
                        }
                    }

                    let web = new Web(name, port, stringSet);
                    web.startStamp = startStamp;
                    web.endStamp = endStamp;
                    web.totalVisits = totalVisits || 0;

                    this.servers[name] = web;
                }


                //Parse strings array.
                for (const entry of Object.values(config.strings)) {
                    for (const endpoint in entry) {
                        if (this.strings[endpoint]) {
                            if (noDuplicate) throw { error: "Duplicate value already in global datastore.", reason: `String ${endpoint} is already in global datastore.` }
                            stringRejects++;
                        } else {
                            const { directory, indexFile } = entry[endpoint];
                            _require(endpoint, "string", { directory, indexFile });
                            this.strings[endpoint] = entry;
                        }
                    }
                }

                let message = [
                    `Time taken(in seconds):${(Date.now() - stamp) / 1000}s`,
                    "\n",
                    "Result:",
                    "\n",

                ];

                serverCounter -= Object.values(this.servers).length
                stringCounter -= Object.values(this.strings).length

                if (serverCounter === 0 && stringCounter === 0) {
                    message.push("Sorry, Upon having a closer look, The parsed data doesn't seem to have any usable data(no unique server or strings).")
                } else {
                    let _msg = "Imported ";
                    if (serverCounter !== 0) _msg += `${serverCounter} web server${serverCounter > 1 ? "s" : ""}`;
                    if (serverCounter !== 0 && stringCounter !== 0) _msg += " and "
                    if (stringCounter !== 0) _msg += `${stringCounter} string${stringCounter > 1 ? "s" : ""}`;
                    message.push(_msg + ".");
                }

                callback(true, {
                    header: "Parsing successful.",
                    message
                }, {servers : this.servers, strings : this.strings});

            } catch (err) {
                if (err.errno === undefined) {
                    callback(false, err);
                } else callback(false, { error: err, message: "" });
            }
        }

        try {
            const stat = fs.statSync(filePath);
            const stream = fs.createReadStream(filePath);
            let chunk = "";

            let stamp = 0;

            stream.addListener("ready", () => {
                stamp = Date.now();
            });

            stream.addListener("error", (err) => {
                let body = { error: "Failed to read configuration file." };
                if (err.errno === -4068) {
                    body["reason"] = `${parsed[0]} seems to be a directory`
                }

                if (body.reason) callback(false , body);
            });

            stream.addListener("data", (_chunk) => {
                try {
                    chunk += _chunk;
                } catch (err) {
                    throw err;
                }
            });

            stream.addListener("end", () => {
                stream.removeAllListeners();
                stream.destroy();

                callback(true, {
                    header: "File succesfully loaded, Parsing for any server information...",
                    message: [
                        `Source:${filePath}`,
                        `Time taken(in seconds):${(Date.now() - stamp) / 1000}s`
                    ]
                });

                let config = null;

                config = JSON.parse(chunk);

                if (config === null || config.server === null) throw TypeError("Failed, Server properties not found in the provided file.");

                parseServers(config, callback);
            });

        } catch (err) {
            let body = { error: "Failed to read configuration file." }
            if (err.errno === -4058) {
                body["reason"] = `${err.path} does not exist.`
            }
            callback(false, body);
        }
    }

    save(fileDir, callback) {
        let filePath = fileDir || CONFIG_FILE;

        if(filePath !== CONFIG_FILE)filePath = `${CONFIG_DIR}/${filePath}`;

        let body = {
            servers: Object.keys(this.servers).map((serverName)=>{
                const currentServer = this.servers[serverName];
                let obj = {};

                Object.keys(currentServer).filter(key => {return key !== "server"}).forEach(prop=>{
                    if(prop !== "strings"){
                        obj[prop] = currentServer[prop];
                    }else{
                        obj[prop] = Object.entries(currentServer[prop]).map((entry)=>{
                            return {[entry[0]] : entry[1]}
                        });
                    }
                });

                return obj;
            }),
            strings: Object.values(this.strings)
        };
        fs.writeFile(filePath, JSON.stringify(body , null , 4), (err) => {
            if (err) {
                let errorBody = {
                    error: "Failed to save current app state."
                };

                if (err.errno === -4068) {
                    errorBody["reason"] = `${chalk.greenBright(err.path)} looks like a directory, please pass a valid file path.`
                }else{
                    errorBody["reason"] = err.message
                }

                callback(false, errorBody);
            } else {
                callback(true, {
                    header: `App state has been successfully saved.`,
                    message: `${filePath} now holds the current app state.`
                });
            }
        });

    }

    clear(mode, callback) {
        let len = Object.keys(this.servers).length;

        let stamp = Date.now();
        while (true) {
            if (len === 0) break;
            for (const server of Object.values(this.servers)) {
                if (server.isRunning()) server.stop(() => { });
                delete this.servers[server.name];
                len = Object.keys(this.servers).length;
            }
        }

        if (mode === "global") {
            this.servers = {};
            this.strings = {};
        }
        if (mode === "strings") this.strings = {};
        if (mode === "servers") this.servers = {};
        callback(`Successfully cleared ${mode} datastore in ${(Date.now() - stamp)/1000}s`);
    }
}