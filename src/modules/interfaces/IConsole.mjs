import readLine from "readline";
import chalk from "chalk";
import App from "../../App.mjs";
import Web from "../structs/Web.mjs";

import Prompt from "prompt-sync";

import texts from "../../properties/Console.json";

let prompt = new Prompt({
    sigint : true
});

//Language...why not.
let LANG = "EN";

const { global , settings , corpus } = texts;
const { help , errors } = corpus[LANG] || corpus["EN"];

class IConsole{

    constructor(){
        this.app = new App();

        this.rl = readLine.createInterface({
            input  : process.stdin,
            output : process.stdout,
            removeHistoryDuplicates : true,
            prompt : ">>",
        });+
        
        
        this.rl.addListener("line" , this.parse);
        this.rl.addListener("SIGINT" , this.exit);
        
        //Initialize?
        this.app.load(null,()=>{
            clear();
            console.log(chalk.blueBright(`${global.name} ${global.version}`));
            console.log(chalk.blueBright(`Copyright ${global.author}. All rights reserved.\n`));
            console.log(chalk.yellow("Type help for a quick rundown of the supported commands"));
        });/*  */
    }

    /* Runtime functions */

    //Parses... commands
    parse = (input)=>{
        const parsed = input.trim().split(" ");
        let command = [];
        for(const comm of parsed){
            if(comm !== "")command.push(comm.toLowerCase());
        }

        try{
            if(input === "") return;
            if(command[0] === "exit" || command[0] === "quit"){
                this.rl.emit("SIGINT");
                return;
            }

            const verb = command[1],
            parsed = command.splice(2);
            
            switch(command[0]){
                case "web" : {
                    this.webCommand(verb , parsed);
                }break;

                case "string" : {
                    this.stringCommand(verb , parsed);
                }break;

                case "app" : {
                    this.appCommand(verb , parsed);
                }break;

                case "help" : {
                    const { title , description , example , actions} = help.global;
                    simpleHelp(title,description,example,actions,"Available Commands.");
                }break;

                case "clear" : clear();break;

                default : {
                    if(command[0] !== "")console.log(chalk.redBright(chalk.bold(`${command[0]} ${errors.invalidCommand || "is not a command"}`)));
                }break;
            }
        }catch(err){
            if(err.name === undefined)console.log(chalk.red(err));
            else throw err;
        }
    }
    
    //Also includes confirmation
    exit = ()=>{
        let servers = Object.values(this.app.servers);

        let running = [];
        for(const server of servers){
            if(server.isRunning())running.push(server.name);
        }

        if(running.length !== 0)console.log(chalk.yellowBright(`${running.length} Server${running.length>1?"s are":" is"} still running.`));

        this.rl.question("Are you sure? (Y/N): ",(answer) => {
            if(answer.toLowerCase() === "y"){
                clear();
                const stamp = Date.now();

                let _exit = ()=>{
                    while(true){
                        for(let server of servers){
                            if(server.isRunning())server.stop(()=>{});
                            delete this.app.servers[server.name];
                        }
        
                        if(servers.length === 0 ){
                            console.log(`${chalk.yellow("[Janitor]:")}${servers.length !== 0 ? "Servers stopped, Datastores cleared!," : ""} Cleaning took ${(Date.now()-stamp)/1000}ms`)
                            break;
                        }
                    }
    
                    console.log(chalk.greenBright(`Take care.`));
                    this.rl.close();
                    process.exit(0);
                }

                if(settings.saveOnExit){
                    this.app.save(null,_exit);
                }else{
                    _exit();
                }
            }
        });
    }

    /* Commands */
    webCommand = (verb, parsed)=>{
        switch(verb){
            case "help" : {
                const { title , description , example , actions } = help.web;
                simpleHelp(title , description , example , actions);
            }break;
    
            case "display" : {
                try{

                    const _displayServer = (serverName)=>{
                        //Display web object
                        let web = this.app.servers[serverName];
                        if(web){
                            const { name , port , strings , status , totalVisits } = web;
    
                            let message = [
                                chalk.yellowBright(`${chalk.underline("Webserver "+chalk.bold(name))}`),
                                "\n",
                                chalk.whiteBright("Runtime Status:"),             
                            ];

                            const _options = web.options;

                            let _f = (prop , value)=>{
                                return `${chalk.whiteBright(prop)}: ${chalk.greenBright(value)}`;
                            }
       
                            //IF RUNNING
                            //Running since: [Date Object] example: Sun Oct 11 2020 on 07:31 A.M
                            //Total runtime: [Duration] example: approx: 1 hour, 13 minutes and 42 seconds.
                            //Total visits : 21 Visits(this one's just superfluous and optional)

                            //IF STOPPED
                            //Last run: [Date Object]


                            //Runtime stats...
                            if(status === "running"){
                                const since = new Date(web.startStamp);
                                const now = new Date();

                                let difference = (now.getTime() - since.getTime())/1000;

                                const _f = (mod)=>{
                                    const _result = difference%mod;
                                    difference = difference / mod;
                                    return Math.floor(_result);
                                }

                                const _s = _f(60);
                                const _m = _f(60);
                                const _h = _f(24);
                                const _d = _f(24);
                                
                                const days = `${_d !== 0 ? `${_d} day${_d>1?"s":""} ` : ""}`;
                                const hours = `${_h !== 0 ? `${_h} hour${_h>1?"s":""} ` : ""}`;
                                const minutes = `${_m !== 0 ? `${_m} minute${_m>1?"s":""} and ` : ""}`;
                                const seconds = `${_s !== null ? `${_s} second${_s>1?"s":""}` : ""}`;

                                const totalRuntime = `${days}${hours}${minutes}${seconds}.`;

                                message.push(
                                    "Active? : ✅",
                                    "\n",
                                    `Running since : ${since.toString()}`,
                                    `Total Runtime : Approx. ${totalRuntime}`,
                                    `Total Visits  : ${totalVisits} visit${totalVisits>1?"s":""}`
                                );
                            }else{
                                message.push(
                                    "Active? : ❌",
                                    "\n",
                                    `Last run : ${web.endStamp === null ? "No data available" : new Date(web.endStamp).toString()}`,
                                    `Total Visits  : ${totalVisits} visit${totalVisits>1?"s":""}`
                                );
                            }

                            //Port
                            message.push("\n",chalk.whiteBright("Port: ")+chalk.blueBright(port));

                            //Options
                            let _option = "";
                            for(const option in _options){
                                _option+=(` [${_f(option,_options[option])}] `);
                            }
                            message.push(`${chalk.yellow("Options:")} ${_option}`,"\n");

                            message.push(chalk.yellowBright(`Strings: [${Object.keys(strings).length}]`) , "\n");
                            for(const endpoint of Object.keys(strings)){
                                const { directory , indexFile } = strings[endpoint];
                                    
                                const e = _f("Endpoint", chalk.underline(`/${endpoint}`));
                                const d = _f("Directory Content", directory);
                                const i = _f("Index", indexFile);
                                const w = _f("Host", name);

                                message.push(e,d,i,w,"\n");
                            }
                            
                            return message;
                        }else{
                            throw {error : "Failed to display server data:" , reason : `Server ${serverName} does not exist.`};
                        }
                    }

                    switch(parsed.length){
                        case 0  : {
                            let _servers = Object.values(this.app.servers);

                            //Display global web data(summarized for brevity).
                            let stopped = 0, paused = 0, resumed = 0;
                            for(const server of _servers){
                                switch(server.getStatus()){
                                    case "stopped" : stopped++; break;
                                    case "paused"  : paused++;  break;
                                    case "running" : resumed++; break;
                                    default:break;
                                }
                            }
                            let message = [
                                chalk.yellowBright("Global WebServer Data:"),
                                "\n",
                                chalk.yellowBright(`Server Runtime States`),
                                `${chalk.redBright(`[${stopped} ❌]`)}   ${chalk.rgb(250 , 134 , 5).bold(`[${paused} ◆ ]`)}   ${chalk.greenBright(`[${resumed} ✅]`)}`,
                                "\n",
                                chalk.yellowBright(chalk.bold("[Servers]"))
                            ];

                            if(_servers.length !== 0){
                                for(const server of _servers){
                                    message.push(server.toString());
                                }
                            }else message.push(`No servers available, Create one by running \"web create\"`,"You can also import servers and other objects by running  \"app load [file.json]\"")
        
                            priorityMessage(message);
                        }break;

                        default : {
                            //Yielding a negative value should not be an issue here... I think
                            let messages = [];

                            for(const serverName of parsed){
                                messages = messages.concat(_displayServer(serverName), "\n");
                            }

                            priorityMessage(messages);
                        }
                    }

                }catch(err){    
                    simpleError(err);
                }
            }break;

            case "run" : {
                const _runServer = (serverName)=>{              
                    let _server = this.app.servers[serverName];
                    if(!_server){
                        simpleError({error : `Failed to run Server ${serverName}`,reason : `Reason:Server ${serverName} does not exist.`},true);
                        return;
                    }
                    if(_server.isRunning()){
                        simpleError({error : `Failed to run Server ${serverName}`,reason : `Reason:Server ${serverName} is already running.`},true);
                        return;
                    }
                    
                    //Inform user?
                    _server.run((success , err) => {
                        if(success){
                            const { elapsed , bindings } = success;
                            let message = [
                                `Time taken(in seconds): ${elapsed}s`,
                                "\n",
                                "[Bindings]",
                                "\n"
                            ];

                            if(bindings.length !== 0){
                                for(const index in bindings){
                                    if(index <= 3) message.push(bindings[index]);
                                    else {
                                        const _num = bindings.length - index;
                                        message.push(`and ${_num} other${_num > 1? "s" : ""}.`);
                                        message.push("\n");
                                        message.push("To view all bindings of a specific server, run web display [server_name].");
                                        break;
                                    }
                                }
                            }else{
                                message.push(chalk.yellowBright("No assigned bindings, consider creating a string by running \"string create\" command, assigning it afterwards using \"string assign [string_name] [target_server]\" command."))
                            }
                            
                            simpleSuccess({
                                header  : `Server ${serverName} is now listening in on port ${_server.port}`,
                                message
                            },true);
                        }else{
                            simpleError({error : `Server ${serverName} failed to run.`, reason : err});
                        }
                    });
                }

                clear();
                switch(parsed.length){
                    case 0  : {
                        adviseUsage("Please specify a server to run." , "Usage: web run [...server_names]");
                    }break;
                    default : {
                        for(const serverName of parsed){
                            _runServer(serverName);
                        }
                    }
                }
            }break;

            case "stop" : {
                if(parsed.length === 0){
                    adviseUsage("Please specify a server to stop." , "Usage: web stop [...server_names]");
                    return;
                }    
                
                const _stopServer = (serverName)=>{
                    let _server = this.app.servers[serverName];

                    if(!_server){
                        simpleError({error : `Failed to stop Server ${serverName}` , reason : `Server ${serverName} does not exist`});
                        return;
                    }
                    if(!_server.isRunning()){
                        simpleError({error : `Failed to stop Server ${serverName}'s execution.` , reason : `Server ${serverName} is already inactive.`});
                        return;
                    }
                    
                    _server.stop((elapsed, err)=>{
                        if(elapsed){
                            simpleSuccess({
                                header : `Server ${serverName} has been successfully stopped.`,
                                message : `Time Taken(in seconds): ${elapsed}`
                            }, true);
                        }else{
                            simpleError({
                                error : `Failed to stop server ${serverName}`,
                                reason : err
                            }, true);
                        }
                    });
                }
                
                clear();
                for(const serverName of parsed){
                    _stopServer(serverName);
                }
            }break;

            case "create" : {
                let heading = {
                    header  : "Create a new Webserver:",
                    message : "Please answer the following prompts." 
                }

                let questions = {
                    name : {
                        message  : "What will be the name of this WebServer?",
                        validate : (value)=>{return this.app.servers[value.trim()] ? "That server name is already taken!" : true;}
                    },
                    port : {
                        message  : "Which port will it be listening on?",
                        hint     : "Pick a port between 0 to 65535, Preferrably one that you know is currently unused.",
                        validate : (value)=>{
                            const val = Number(value);
                            if(val === NaN)return "Ports can't be anything other than a number."
                            const _servers = Object.values(this.app.servers);
                            for(const server of _servers){
                                if(server.port === val)return `Port ${val} is already taken by Server ${server.name}`;
                            }
                            return val >= 0 && val <= 65535 ? true : "Out of range! please use any port between 0 to 65535.";
                        }
                    },
                    strings : {
                        message  : "Which strings will be hosted under this WebServer?",
                        defaultValue : "None",
                        hint     : "Press Tab to show options(from string datastore).",
                        validate : (value)=>{
                            const values = value.split(",");
                            for(const val of values){
                                if(val === "None")continue;
                                if(!this.app.strings[val.trim()])return `String ${val} does not exist!`;
                            }
                            return true;
                        },
                        filter  : (value)=>{
                            const values = value.split(",");
                            let strings = {};

                            for(const value of values){
                                const ret = this.app.strings[value.trim()];
                                if(ret)strings[value.trim()] = ret;
                            }

                            return strings.length === 0 ? "None" : strings;
                        },
                        optionList : Object.keys(this.app.strings).concat("None")
                    }
                }

                const response = priorityQuestion(heading , questions);

                if(response){
                    const { name , port , strings } = response;

                    //Doesn't check for errors since questions contain validation functions which eliminates any potential duplicates and other issues.
                    if(!this.app.servers[name]){
                        this.app.servers[name] = new Web(name , port , strings === "None" ? {} : strings);
                        simpleSuccess({
                            header  : `Server ${name} has been created.`,
                            message : `Access it by using the web command and its functions`
                        });
                    }else{
                        simpleError({
                            error   : "Failed to create Server ${name}",
                            message : "Unknown error,Please send a report to my email which is abellanaemmanuel37@gmail.com"
                        })
                    }
                }
            }break;

            case "delete" : {
                if(parsed.length === 0){
                    adviseUsage("Please specify a Server to delete." , "Usage: web delete [...server_names]")
                    return;
                }       

                const _deleteServer = (serverName) =>{
                    const server = this.app.servers[serverName];

                    if(server){
                        throw {error : `Failed to delete Server ${serverName}.`, reason : "Server does not exist."};
                    }

                    if(server.isRunning()){
                        const response = priorityQuestion({
                            header  : `Server ${serverName} seems to be currently active.`,
                            message : "Deleting an active server will stop it from serving any requests."
                        },
                        {
                            confirmation : {
                                message : "Are you sure? (Y/N): ",
                                validate : (value)=>{
                                    const val = value.toLowerCase();
                                    return val === "y" || val === "n" ? true : "Invalid response";
                                },
                                filter : (val)=>{
                                    return val.toLowerCase();
                                }
                            }
                        });

                        if(response["confirmation"] === "y"){
                            simpleSuccess({
                                header : `Deleting ${serverName}.`,
                                message : "Suspending server activities, this might take a while..."
                            });
                            server.stop((elapsed)=>{
                                delete this.app.servers[serverName];
                                simpleSuccess({
                                    header : `Server ${serverName} has been deleted.`,
                                    message : `Time taken(in seconds): ${elapsed}s`
                                });
                            });
                        }

                    }else{
                        const response = priorityQuestion({
                            header  : `Server ${serverName} will be deleted.`,
                            message : "Keeping backups are encouraged since delete operations are usually irrecoverable."
                        },
                        {
                            confirmation : {
                                message  : "Are you sure? (Y/N): ",
                                validate : (value)=>{
                                    const val = value.toLowerCase();
                                    return val === "y" || val === "n" ? true : "Invalid response";
                                },
                                filter : (val)=>{
                                    return val.toLowerCase();
                                }
                            }
                        });

                        if(response && response["confirmation"] === "y"){
                            const stamp = Date.now();
                            delete this.app.servers[serverName];
                            console.log(chalk.greenBright(`| Server ${serverName} has been deleted.\n| Time taken(in seconds): ${(Date.now()-stamp)/1000}s`));
                        }else{
                            //A Server gave out a heavy sigh of relief.
                            //Idk, prompt user i guess.
                            console.log(chalk.yellowBright(`Server ${serverName} was left untouched.`));
                        }
                    }
                }

                try{
                    for(const serverName of parsed){
                        _deleteServer(serverName);
                    }
                }catch(err){
                    if(!err.errno)console.log(chalk.redBright(`| ${err.error}\n| `)+chalk.yellowBright(err.reason));
                }

            }break;

            default : {
                if(verb !== undefined)console.log(chalk.yellow(`${verb} action is unsupported by web command`));
                else console.log(chalk.yellow("web command requires a function to execute."));
            }
        }
    }

    stringCommand = (verb, parsed)=>{
        switch(verb){
            case "help" : {
                const { title , description , example , actions } = help.string;
                simpleHelp(title , description , example , actions);
            }break;

            case "display" : {
                let message = [
                    chalk.yellow("Global String Data:"),
                    "\n",
                ];

                const strings = Object.keys(this.app.strings);

                if(strings.length !== 0){
                    message.push(
                        chalk.yellowBright(`${strings.length} unique String object${strings.length > 1 ? "s" : ""} found.`),
                        "\n"
                    )
                    for(const endpoint of strings){
                        const [ _ , value ] = Object.entries(this.app.strings[endpoint])[0];
                        const { directory , indexFile } = value;
                        
                        message.push(
                            chalk.yellowBright(`[${endpoint}]`),
                            `${chalk.greenBright("Directory")}    : ${directory}`,
                            `${chalk.greenBright("Index File/s")} : ${indexFile}`,    
                            "\n"
                        );
                    }
                }else{
                    message.push(
                        "No unique strings found, Try creating a new one by running \"string create\" command.",
                        "You can also import them by running \"app load [src.json]\" command from the console"
                    );
                }

                priorityMessage(message);
            }break;
            
            case "assign" : {
                if(parsed.length < 2){
                    adviseUsage("Please specify 1 or more string and a server.", "Usage: string assign [...string_names] [server_name]");
                    return;
                }
                const serverName  = parsed[parsed.length-1];
                const stringNames = parsed.splice(0,parsed.length-1); 

                let server = this.app.servers[serverName];

                if(!serverName){
                    /* simpleError({
                        error  : "Failed to assign string to a server.",
                        reason : "A valid Server name is required."
                    }); */
                    console.log(chalk.redBright("| Failed to assign String to a server.\n| ")+chalk.yellowBright("A valid Server name is required."));
                    return;
                }
                
                if(!server){
                    simpleError({
                        error  : "Failed to assign string to a server.",
                        reason : `Server ${serverName} does not exist.` 
                    });
                    return;
                }

                const _assignString = (stringName)=>{
                    const string = this.app.strings[stringName];

                    //Falsy test
                    if(!stringName){
                        console.log(chalk.redBright("| Failed to assign String to a server.\n| ")+chalk.yellowBright("A valid String name is required."));
                        return;
                    }

                    if(!string){
                        console.log(chalk.redBright(`| Failed to assign String ${stringName} to a server.\n| `)+chalk.yellowBright(`String does not exist.`));
                        return;
                    }
                    
                    if(server.getString(stringName)){
                        console.log(chalk.redBright(`| Failed to assign String ${stringName} to a server.\n| `)+chalk.yellowBright(`Server ${serverName} already hosts a similarly named String.`))
                        return;
                    }

                    if(server.isRunning()){
                        const response = priorityQuestion({
                            header : `Server ${serverName} is currently running.` ,
                            message : `Deferred String hosting is currently unsupported but is a planned feature.`
                        }, 
                        {
                            restart : {
                                message : "Restart server to host this newly assigned String? (Y/N):",
                                validate : (val) => {
                                    val = val.toLowerCase();
                                    return val === "y" || val === "n" ? true : "Invalid response."
                                },
                                filter : (val) => {
                                    return val.toLowerCase();
                                }
                            }
                        });

                        if(response["restart"] === "y"){
                            server.stop(()=>{
                                server.addString(string)
                                .then(()=> {
                                    server.run(()=>{
                                        console.log(chalk.greenBright(`| String assignment successful.\n| `)+chalk.whiteBright(`String ${stringName} is now being hosted on Server ${serverName}.`));
                                    });
                                })
                                .catch((err)=>{
                                    console.log(chalk.redBright(`| Failed to assign String ${stringName} to Server ${serverName}.` + chalk.yellowBright(err)))
                                })
                            });
                        }
                    }else{
                        server.addString(string)
                        .then(()=> console.log(chalk.greenBright("| String assignment successful.\n| ")+chalk.whiteBright(`Server ${serverName} will be hosting String ${stringName} on it's next subsequent runs.`))
                        .catch((err)=> console.log(chalk.redBright(`| Failed to assign String ${stringName} to a server.\n| `)+chalk.yellowBright(err))));
                    }
                }

                clear();
                for(const stringName of stringNames){
                    _assignString(stringName);
                }
            }break;

            case "create" : {
                let questions = {
                    endpoint  : {
                        message  : "What will be the name of the endpoint?",
                        validate : (value)=>{
                            return value.trim().length === 0 ? "Name cannot be left blank." : value.trim().length < 2 ? "Name should be at least 2 characters in length." : true;
                        },
                        filter  : (value)=>{
                            return value.trim();
                        }
                    },
                    directory : {
                        message : "Where does the file reside in your local system(directory)?:"
                    },
                    indexFile : {
                        message       : "Which file is the index file?",
                        defaultValue  : "index.htm , index.html",
                        filter  : (value)=>{
                            let values = [];
                            for(const val of value.split(",")){
                                values.push(val.trim());
                            }
                            return values;
                        }
                    },
                    webHost   : {
                        message  : "Which web object/s will this string be hosted in?:",
                        hint     : "Press tab to display options.",
                        defaultValue : "global",
                        validate : (value)=>{
                            //Allowed value
                            const values = value.split(",");
                            for(const val of values){
                                if(this.app.servers[val.trim()] === null && val !== "global"){
                                    return `Server ${val.trim()} does not exist.`;
                                }
                            }
                            return true;
                        },
                        filter  : (value)=>{
                            let values = [];
                            for(const val of value.split(",")){
                                values.push(val.trim());
                            }
                            return values;
                        },
                        optionList : Object.keys(this.app.servers).concat("global")
                    }
                }
                const response = priorityQuestion({
                    header  : "Create new a web string",
                    message : "Please answer the following prompts."
                },questions);
    
                if(response){
                    const { endpoint , directory , indexFile , webHost } = response;

                    simpleInfo({
                        header  : "Applying String properties",
                        message : "This won't take long..." 
                    });
                    
                    console.log(chalk.blueBright("| ") + chalk.greenBright("Resolving hosts..."));

                    //Webhost
                    for(const host of webHost){
                        let _obj = {};
                        _obj[endpoint] = {directory , indexFile};
        
                        if(host === "global"){
                            if(!this.app.strings[endpoint]){
                                this.app.strings[endpoint] = _obj;
                                console.log(chalk.blueBright("| ")+chalk.greenBright("*String is inserted into the global datastore."));
                            }else{
                                console.log(chalk.blueBright("| ") + chalk.redBright(`Failed to add String ${endpoint} to the global datastore, possible duplicate found.`))
                            }
                            continue;
                        }

                        let server = this.app.servers[host];
                        if(server !== null){
                            server.addString(_obj)
                            .then(()=> console.log(chalk.blueBright("| ")+chalk.greenBright(`*String successfully added to Server ${server.name}'s string list.`)))
                            .catch((err)=> console.log(chalk.blueBright("| ")+chalk.redBright(`Failed to add String to Server ${server.name}'s hosted contents, ${err}`)));
                        }else{
                            console.log(chalk.blueBright("|") + chalk.redBright(`Server ${host} does not exist`));
                        }
                    }

                    console.log(chalk.blueBright("| ")+chalk.greenBright("Done."));
                }
            }break;

            case "delete" : {
                if(parsed.length === 0){
                    adviseUsage("Please specify 1 or more strings to delete." , "Usage: string delete [...string_names]");
                    return;
                }

                const _deleteString = (stringName)=>{
                    if(this.app.strings[stringName]){
                        delete this.app.strings[stringName];
                        console.log(chalk.greenBright(`| String deletion successful.\n| `)+chalk.whiteBright(`String ${stringName} has been removed from the global datastore.`));
                    }else{
                        console.log(chalk.redBright(`| Failed to delete String ${stringName}.\n| `)+chalk.yellowBright("String does not exist."));
                    }
                }

                clear();

                for(const stringName of parsed){
                    _deleteString(stringName);
                }

            }break;

            default : {
                if(verb === undefined || verb === ""){
                    console.log(chalk.yellowBright(`Web command requires an action to perform any functionality.`))
                }else{
                    console.log(chalk.yellow(`${verb} action is unsupported by string command`))
                }
            }
        }
    }

    appCommand = (verb, parsed)=>{

        const _f = (success , body)=> success ? simpleSuccess(body) : simpleError(body);

        switch(verb){
            case "help" : {
                const { title , description , example , actions } = help.app;
                simpleHelp(title , description , example , actions);
            }break;

            case "load" : this.app.load(parsed[0], _f);break;

            case "save" : this.app.save(parsed[0], _f);break;

            case "clear" : {
                const mode = parsed[0] || "global";

                if(["servers" , "strings" , "global"].indexOf(mode) === -1){
                    adviseUsage("Clear Global Datastore" , `${mode} is not a valid datastore.`);
                    return;
                }

                const heading = {
                    header  : "Clear Global Datastores.",
                    message : [
                        `All unsaved data within ${mode} datastores will be lost.`,
                        `Any servers currently active will be terminated.`
                    ]
                }

                const questions = {
                    confirmation : {
                        message  : "Are you sure you want to continue? (Y/N): ",
                        validate : (value)=>{
                            value = value.toLowerCase();
                            if(value === "y" || value === "n")return true;
                            return "Can't have that as an answer.";
                        },
                        filter   : (value) => {
                            return value.toLowerCase();
                        }
                    }
                };

                const response = priorityQuestion(heading , questions);

                if(response && response.confirmation === "y")this.app.clear(mode,(body)=>{
                    console.log(chalk.greenBright(body));
                });

            }break;

            default : {
                console.log(chalk.yellow(`${verb} action is unsupported by app command`))
            }
        }
    }
    
    
}



/* Utilities */

// Data Juggling utils :P
let __prePack = (body , chalkFunc)=>{
    const result = [];

    if(typeof chalkFunc !== "function"){
        chalkFunc = chalk.whiteBright;
    }

    if(typeof body === "object"){
        for(const msg of body){
            result.push(chalkFunc(msg));
        }
    }else{
        result[0] = chalkFunc(body);
    }
    return result;
}

let __packMessages = (...messages)=>{
    let result = [];
    for(const msg of messages){
        for(const str of msg){
            result.push(str);
        }
        result.push("\n");
    }
    return result;
}

// Console Utils

let writeProgress = (str , progress)=>{
    readLine.cursorTo(process.stdout , 0 );
    process.stdout.write(chalk.white(`${str}`) + chalk.yellow(`[${Math.round(progress) >= 100 ? "DONE" : progress}]`));
}

/**Standard console message
* @param {{header , message}} body containing a header and a message, both of which can be an array or a simple string 
* @param {boolean} dontClear 
*/
let simpleMessage = (body , dontClear)=>{
    const { header , message } = body;
    if(!dontClear)clear();
    __printLines(__packMessages(__prePack(header , chalk.yellowBright),__prePack(message , chalk.whiteBright)));
}

/**Standard console info
 * 
 * @param {{header : String , message : String}} body 
 * @param {boolean} dontClear 
 */
let simpleInfo = (body , dontClear)=>{
    const { header , message } = body;
    if(!dontClear)clear();
    __printLines(__packMessages(__prePack(header , chalk.blueBright) , __prePack(message , chalk.whiteBright)) , chalk.blueBright);  
}

/**Standard console success
 * 
 * @param {{header : String , message : String}} body 
 * @param {boolean} dontClear 
 */
let simpleSuccess = (body , dontClear)=>{
    const { header , message } = body;
    if(!dontClear)clear();
    __printLines(__packMessages(__prePack(header , chalk.greenBright) , __prePack(message , chalk.whiteBright)) , chalk.greenBright);
}

/**Standard console error
 * 
 * @param {{error : String , reason : String}} body 
 * @param {boolean} dontClear 
 */
let simpleError = (body , dontClear)=>{
    const { error , reason } = body;
    if(!dontClear)clear();
    __printLines(__packMessages(__prePack(error , chalk.redBright) , __prePack(reason , chalk.yellowBright)) , chalk.redBright);
}

//Pre-formatted help function. uses simpleMessage();
let simpleHelp = (command , description , usage , functions , listTitle)=>{
    listTitle = listTitle || "Available Functions";

    let message = [
        `${chalk.yellow("Description:")} ${chalk.whiteBright(description)}`,
        "\n",
        `${chalk.yellow("Usage: >>")}${chalk.whiteBright(usage)}`,
        "\n",
        `${chalk.yellow(listTitle)}`,
        "\n",
    ];
    for(const _function of functions){
        const _f = _function.split(":");
        message.push(`${chalk.greenBright(_f[0])}:${chalk.whiteBright(_f[1])}`);
    }

    simpleMessage({
        header  : chalk.yellowBright(chalk.underline(command)),
        message
    })
}

/**
* 
* @param {[]} message 
*/
let priorityMessage = (message)=>{
    clear();
    __printLines(message);
}

let priorityQuestion = (heading ,questions)=>{
    clear();
    if(heading)simpleInfo(heading);
    let obj = {};

    for(const prop of Object.keys(questions)){
        const { message , hint , defaultValue , validate , filter , optionList , confirm } = questions[prop];
        
        //temp
        let options = {
            autocomplete : optionList !== undefined ? (input)=>{
                let matches = [];

                for(const i of optionList){
                    if(i.toLowerCase().startsWith(input))matches.push(i);
                }
                return matches;
            } : null
        }
        
        let error = null;
        

        while(true){
            let line = 5;
            if(error !== null){
                console.log(chalk.blueBright("| ") + chalk.redBright(`*${error}`) + chalk.blueBright("\n| "));
                line += 2;
            }

            console.log(chalk.blueBright("| ")+chalk.yellow(message)+chalk.blueBright("\n| "));

            //Question prop display

            if(hint !== undefined){
                console.log(chalk.blueBright("| ")+chalk.greenBright(`Hint:${hint}`)+chalk.blueBright("\n| "));
                line += 2;
            }

            if(defaultValue !== undefined)console.log(chalk.blueBright("| ")+chalk.greenBright(`Default:${defaultValue}\n`)+chalk.blueBright("| "));
            else console.log(chalk.yellow(chalk.blueBright("| ")+"*Required")+chalk.blueBright("\n| "));

            let val = prompt(chalk.blueBright("| ")+chalk.yellowBright(`[${prop}] : `) , options);

            // #Ctrl + C
            if(val === null){
                console.log(chalk.yellowBright("Clearing remaining values..."));
                return null;
            }else val = val.trim();

            readLine.moveCursor(process.stdout , 0 , -line);
            readLine.clearScreenDown(process.stdout);

            if(val === ""){
                if(defaultValue){
                    error = null;
                    val = defaultValue; 
                }
                else error = "Field can't be left blank.";
            }else{

                if(validate !== undefined && typeof validate === "function"){               
                    //Strictly run validate() if and only if value is not empty.
                    //(defaultValue takes precedence)
                    const _res = validate(val);
                    error = typeof _res === "boolean" && _res ? null : _res;
                }else{

                    //No defaults... required field
                    error = null;
                }
            }
            
            if(!error){
                obj[prop] = filter && typeof filter === "function" ? filter(val) : val;
                break;
            }
        }
    }

    simpleInfo({
        header  : "Confirmation",
        message : [
            "Does this look right?",
        ]
    });

    for(const prop in obj){
        console.log(chalk.blueBright("| ") + chalk.whiteBright(prop+" : " + chalk.greenBright(obj[prop]))+chalk.blueBright("\n| "));
    }

    const confirmResponse = prompt(chalk.blueBright("| ")+`(Y/N): `);
    clear();
    if(confirmResponse && confirmResponse.trim().toLowerCase() === "y")return obj;
    else return null;
}

/**A console function used for presenting an advise.
     * 
     * Stylized as a warning rather than an error, this is usually used when a command is incorrectly used or when circumstances are otherwise correctable. 
     * 
     * @param {object} warning
     * @param {object} advise  
     */
let adviseUsage = (warning , advise)=>{
    clear();
    __printLines([
        chalk.yellowBright(`Advise:${warning}`),
        "\n",
        chalk.whiteBright(advise),
    ] , chalk.yellowBright);
}

/**Utility method which prints an array of lines with a given accent color.
* 
* @param {[]} lines lines to print.
* @param {function} chalkFunc accent color.
*/
let __printLines = (lines , chalkFunc)=>{
    if(chalkFunc === undefined)chalkFunc = chalk.whiteBright;
    for(let i = 0 ; i < lines.length ; i++){
        readLine.cursorTo(process.stdout,0, i);
        console.log(chalkFunc("| ") + lines[i]);
    }
    readLine.cursorTo(process.stdout,0,lines.length);
}

let clear = ()=>process.stdout.write("\u001B[2J\u001B[0;0f");

let utils = {
    writeProgress,
    clear,

    simpleSuccess,
    simpleMessage,
    simpleError
}

export { IConsole , utils}