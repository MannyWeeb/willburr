import { IConsole } from "./modules/interfaces/IConsole.mjs";
import IWeb from "./modules/interfaces/IWeb.mjs";

const args = process.argv;

//flags
const consoleMode = args[2] !== null && ["--console","-c"].indexOf(args[2]) !== -1
const webMode     = args[2] !== null && ["--web","-w"].indexOf(args[2]) !== -1

if(consoleMode)new IConsole();
if(webMode)new IWeb();