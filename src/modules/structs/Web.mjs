import express from "express";
import chalk from "chalk";
import path from "path";


export default class Web {
    /**
     * 
     * @param {*} name 
     * @param {Number} port 
     * @param {Object} strings 
     */
    constructor(name, port, strings) {
        this.name = name;
        this.port = Number(port);
        this.strings = strings || {};
        this.status = "stopped";
        this.server = express();

        //Default for now,
        this.options = {
            dotfiles: "ignore",
            etag: false,
            extensions: ["htm", "html"],
            index: "index.html"
        }

        //Stats.
        this.startStamp = null;
        this.endStamp = null;
        this.totalVisits = 0;
    }

    //Lifecycle methods
    run(callback) {
        const _then = Date.now();


        let _strings = Object.keys(this.strings);

        try {
            let bindings = [];
            if (_strings.length !== 0) {
                for (const endpoint of _strings) {
                    let string = this.strings[endpoint];
                    let _options = this.options;

                    //Modify defaults...
                    _options["index"] = string.indexFile;
                    bindings.push(`[localhost]:${this.port}/${endpoint} `);

                    this.server.use(`/${endpoint}/*`, (req, _, next) => {
                        //Should I limit the visitCounter to each unique visit to the homepage or should I just include all sub-pages as visits too.

                        let temp = path.parse(req.url);

                        if (temp.ext.length === 0) {
                            this.totalVisits++;
                        }

                        next();
                    });
                    this.server.use(`/${endpoint}`, express.static(string.directory, _options));

                    
                }
            }

            this.server.use(`/*`, (req, res, next) => {
                //Preferrably show the media contents of the directory if an index file is absent...
                //Or maybe show a page that allows redirection to "/", there the page may let the user
                //browse the directory for files or something...
                //Send out an error for now...
                res.statusCode = 400;
                
                let relevantString = this.strings[req.baseUrl.replace("/" , "")];
                
                if(relevantString){
                    res.send(`<center><h2>Sorry, Willburr can't find an index file to display. [Host Server:\"${this.name}\" , Directory:${relevantString.directory}].</h2></center`)
                }else{
                    res.send(`<center><h2>Sorry, Server ${this.name} does not have a static endpoint named ${req.baseUrl}`);
                }

                next();
            });

            this.server = this.server.listen(this.port, () => {
                this.status = "running";
                this.startStamp = Date.now();
                this.endStamp = Date.now();

                callback(true, {
                    elapsed: (Date.now() - _then) / 1000,
                    bindings
                });
            }).addListener("error", (err) => {
                const errorBody = {
                    error: `Failed to run Server ${this.name}.`,
                    reason: `Error Code: [${err.code}]`
                }

                //Used port:
                if (err && err.code === "EADDRINUSE") {
                    errorBody.reason = `Port ${this.port} is already used by another program.`
                    //Options to edit Server objects are planned.
                    //Tip user off to either change this server's port or close the program that is occupying it. idk
                }

                callback(false, errorBody);
            });
        } catch (err) {
            callback(false, {
                error: `Failed to run Server ${this.name}`,
                reason: "System error, please reach us."
            })
        }
    }


    stop(callback) {
        const _then = Date.now();


        if (this.status === "stopped") {
            callback(false, {
                error: `Failed to stop Server ${this.name}`,
                reason: "Server has already been stopped."
            });
        } else {

            this.server.close(() => {
                //Reinstate express function to this.server(reverts to an object when stop() is called)
                //This is to avoid creating another property for the currently active server.
                this.server = express();
                this.status = "stopped";
                this.startStamp = null;
                this.endStamp = Date.now();
                this.server = express();
                callback((Date.now() - _then) / 1000);
            });
        }
    }

    getStatus() {
        return this.status;
    }

    isRunning() {
        return this.status === "running";
    }


    //Setters and getters for strings properties

    addString(string) {

        let name = Object.keys(string)[0];

        if (!this.strings[name]) {
            this.strings[name] = string[name];
        }
        return true;
    }

    getString(name) {
        return this.strings[name];
    }

    removeString(name) {
        if (this.strings[name]) {
            delete this.strings[name];
            return true;
        } else return false;
    }


    toString() {
        const len = Object.keys(this.strings).length;

        const tag = `[Server ${this.name} ${this.isRunning() ? "✅" : "❌"}]`;
        const title = this.isRunning() ? chalk.greenBright(tag) : chalk.redBright(tag);
        const port = chalk.blueBright(`[Port:${this.port}]`);
        const bindings = chalk.whiteBright(`[Hosts ${len} string${len > 1 ? "s" : ""}.]`);
        return `${title} ${port} ${bindings} `;
    }
}