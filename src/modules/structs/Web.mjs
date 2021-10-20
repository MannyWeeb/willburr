import express from "express";
import chalk from "chalk";
import path from "path";
import fs from "fs/promises";


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

        if (this.isRunning()) {
            callback(false, `Server ${this.name} is already running.`);
            return;
        }

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

            /* this.server.use(`/*`, (req, res, next) => {
                //Preferrably show the media contents of the directory if an index file is absent...
                //Or maybe show a page that allows redirection to "/", there the page may let the user
                //browse the directory for files or something...
                //Send out an error for now...
                res.statusCode = 400;

                let relevantString = this.strings[req.baseUrl.replace("/", "")];

                if (relevantString) {
                    res.redirect("/index-not-found");
                    //res.send(`<center><h2>Sorry, Willburr can't find an index file to display. [Host Server:\"${this.name}\" , Directory:${relevantString.directory}].</h2></center>`);
                } else {
                    res.redirect("/unknown-endpoint");
                    //res.send(`<center><h2>Sorry, Server ${this.name} does not have a static endpoint named ${req.baseUrl}`);
                }

                next();
            }); */

            this.server = this.server.listen(this.port, () => {
                this.status = "running";
                this.startStamp = Date.now();
                this.endStamp = Date.now();

                callback({
                    elapsed: (Date.now() - _then) / 1000,
                    bindings
                }, null);
            }).addListener("error", (err) => {
                let errorBody = `Error Code: [${err.code}]`

                this.server = express();

                //Used port:
                if (err && err.code === "EADDRINUSE") {
                    errorBody = `Port ${this.port} is already used by another program.`
                    //Options to edit Server objects are planned.
                    //Tip user off to either change this server's port or close the program that is occupying it. idk
                }

                callback(false, errorBody);
            });
        } catch (err) {
            console.log(err);
            callback(false, "Internal Error, Please contact an administrator for assistance.");
        }
    }


    stop(callback) {
        const _then = Date.now();

        if (!this.isRunning()) {
            callback(false, "Server has already been stopped.");
        } else {
            this.server.close(() => {
                //Reinstate express function to this.server(reverts to an object when stop() is called)
                //This is to avoid creating another property for the currently active server.
                this.status = "stopped";
                this.startStamp = null;
                this.endStamp = Date.now();
                this.server = express();
                callback((Date.now() - _then) / 1000, null);
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
        //Use express-actuator on this function to readily mount endpoints to a running server.
        console.log(this.strings[name]);
        if (!this.strings[name]) {
            const { directory, indexFile } = string[name];
            return Promise.all([
                fs.stat(directory, {})
                    .catch(() => Promise.reject("Directory does not exist."))
                    .then((v) => {
                        if (v.isFile()) return Promise.reject("Directory pointed to a file (must be a directory).");
                    }),
                fs.stat(`${directory}/${indexFile[1n]}`)
                    .catch(() => Promise.reject(`Index file does not exist within \'directory\' folder.`))
                    .then((v) => {
                        if (v.isDirectory()) return Promise.reject("Index file points to a directory (must be a file).");
                    })
            ])
            .then(()=> this.strings[name] = string[name]);
        } else {
            console.log("Duplicate")
            return Promise.reject(`Endpoint \'${name}\' already exists within Server \'${this.name}\'`);
        }
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