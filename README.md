# Willburr
A set of tools aimed for educators and those who need a fast and easy way to disperse files across a local network.

Initially, the only tool provided was a CLI app which only allows users to share mirrored copies of websites.

I've made some modules(web-apps) for the server which extends some functionalities of its functionalities, they are...

*Sharing of static copies of mirrored websites.
*Sharing of actual files(such as media, documents and just about anything).

So for now, without modules, you're basically stuck with nothing but the CLI app, which admittedly is a bit clunky at the moment.

Head Over to these links to view some of the modules that I was talking about.

[FilHub](http://github.com/MannyWeeb/filehub)
[Willburr-Web](http://github.com/MannyWeeb/willburr-web)


## CLI App

**Command Overview:**
The application provides a relatively small set of commands for managing shared resources through user-made servers.

**Quick Definitions:**<br/>
**Web**    - *An object containing core information about a server such as its name, port and shared resources to broadcast.*<br/>
**String** - *An object which contains the values used for endpoint bindings and its root directory.*<br/>

*In other words, Web objects are the parents of String objects.*


**Main Functionalities:**
* Creating and modifying web, and string instances.
* Control execution of any managed web instance.
* Save application states/settings for exporting, or reuse.

**Sample Commands**

```javascript
 //The web command functions are: help, create, delete, display, run and stop.
 
 web display            //Shows a summarized view of all servers in memory.
 web display serverA    //Shows information about a server in memory.
 
 //The app command functions are: help, save, load and clear.
 
 app load               //Load from the default configuration file(src/config/state.json)
 app load /dir          //Load from another source(has to be a json file).
```
*Note that each commands and functions does include a help function which prints out a rather helpful info to the user.*
