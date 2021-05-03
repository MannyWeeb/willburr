# Willburr

A Node.js Server which is aimed for educators and those who need a fast and easy way to disperse files across a network,
While the Server itself does not offer any feature that achieves the said goal anymore (CLI app is now decoupled with main server),
It lends itself to serving web-applications that mainly provide these services instead.

Web-apps available:

**[FileHub](http://github.com/MannyWeeb/filehub): Allows hosting of files and folders**

**[Willburr-Web](http://github.com/MannyWeeb/willburr-web): Allows hosting of mirrored copies of websites**

*Note: Willburr-web is actually the browser-port of the original CLI built-into the server.*

These web-apps should have a guide with them to help you get acquainted with how they work.

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
