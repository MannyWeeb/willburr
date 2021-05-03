import express from "express";
import ffmetadata from "ffmetadata";
import fs from "fs";
import os from "os";

import config from "../../config.json";

const routerConfig = config["willburr-web"].modules.filehub;

const ROOT = routerConfig.rootDir;
const VERBOSEMIMETYPE = [ "mp3" , "wav" , "ogg" , "m4a" , "flac" , "mp4" , "mkv" ]; //a ffmpeg.read() is ran when a filetype's mimetype is included in this list.
const SUPPORTEDMEDIA = {
    audio : ["mp3" , "m4a" , "flac" , "wav"] //Searches for album cover in it's parent directory if the file's mimetype is included in this list.
}

let app = express.Router();

ffmetadata.setFfmpegPath("src/bin/ffmpeg-4.3.2/ffmpeg.exe");

//Fetches all files and directory from root

app.get("/getData", (_, res) => {
    recursiveRead(ROOT)
        .catch((reason) => {
            let errBody = {
                error: "Failed to fetch app data.",
                reason: ""
            }

            switch (reason.errno) {
                case -4048: {
                    errBody.reason = "The root folder requires elevated priveleges prior to accessing it's contents."
                } break;

                case -4058: {
                    errBody.reason = "Server root folder does not exist.";
                } break;

                default: {
                    errBody.reason = "Unknown internal error, please file a report to Manny.";
                }
            }
            res.status(400).json(errBody);

        })
        .then((data) => {
            const _stat = fs.statSync(ROOT);
            res.status(200).json({
                ...data,
                type: _stat.isFile() ? "file" : "dir",
                path: "/",
                timestamps: {
                    created: _stat.ctime,
                    accessed: _stat.atime,
                    modified: _stat.mtime
                }
            });
        });
});

/*
    Audio : { Title , Album , Artist , Bit-rate , Length }
    Video : { Title , Resolution , Length }
*/
app.get("/getMetadata", (req, res) => {
    let { p } = req.query;

    let errBody = {
        error: "Failed to fetch metadata",
        reason: "Unknown error, Please report this to someone..."
    }
    const _path = `${ROOT}/${p}`;
    fs.stat(_path, (err, _stat) => {
        if (err) {
            errBody.reason = "File not found.";
            res.status(400).json(errBody);
        } else {
            const ffmpegReadable = VERBOSEMIMETYPE.indexOf(p.substring(p.lastIndexOf(".") + 1)) !== -1;

            if (_stat.isFile() && ffmpegReadable) {
                readMetadata(_path)
                .catch(() => {
                    errBody.reason = "Server does not have any support for pulling metadata off of files.";
                    res.status(400).json(errBody);
                })
                .then((value) => {
                    res.status(200).json(value);
                });
            } else {
                errBody.reason = "Either the file does not exist, it's a folder or it does not contain any metadata.";
                res.status(400).json(errBody);
            }
        }
    });
});

//Album thumbnail:

/*
    each folder may have an image representing the album thumbnail,
    in most instances it's named as cover.jpg, folder.jpg

*/

app.get("/getThumbnail", (req, res) => {
    let { p } = req.query;

    const _path = `${ROOT}/${decodeURIComponent(p)}`;

    fs.stat(_path, (err, _stats) => {

        let errBody = {
            error: "Failed to fetch thumbnail",
            reason: "Unknown error"
        }

        if (err) {
            errBody.reason = "File not found";

            res.status(400).json(errBody);
        } else {
            //thumbsupply does not support music files yet...
            //So here's a temporary workaround...
            //Look for a file that could be used as the cover in the same directory named cover or folder

            if (_stats.isFile()) {
                const fileExt = _path.substring(_path.lastIndexOf(".") + 1);

                if (SUPPORTEDMEDIA.audio.indexOf(fileExt) !== -1) {
                    //Look up parent dir if it contains a folder or cover img
                    const parentDir = _path.substring(0, _path.lastIndexOf("/"));

                    //Yes this is slowly becoming a good example of what callback hell looks like.
                    fs.readdir(parentDir, {}, (_err, files) => {
                        if (_err) {
                            errBody.reason = "Parent directory is missing";

                            res.status(400).json(errBody);
                        } else {
                            let coverNames = ["cover.jpg", "cover.png", "folder.jpg", "folder.png"];

                            let match = null;

                            for (const file of files) {
                                if (coverNames.indexOf(file.toLowerCase()) !== -1) {
                                    match = file;
                                    break;
                                }
                            }

                            if (match) {
                                res.status(200).json({
                                    id: `${parentDir.replace(ROOT, "")}/${match}`
                                });
                            } else {
                                errBody.reason = "File does not have any album image in it's directory";
                                res.status(400).json(errBody);
                            }
                        }
                    });

                } else {
                    thumbsupply.generateThumbnail(_path, {
                        cacheDir: `${routerConfig.thumbnailCache}/thumbcache`,
                        forceCreate: true
                    })
                        .catch(() => {
                            errBody.reason = "File does not have any associated thumbnail";
                            res.status(400).json(errBody);
                        })
                        .then(val => {
                            if (val) {
                                res.status(200).json({ id: val.replace(`${ROOT}/thumbcache/`, "") });
                            }
                        });
                }
            } else {
                errBody.reason = "Thumbnails are only fetched if the path leads to a valid file.";
                res.status(400).json(errBody);
            }
        }
    });

});

app.get("/getServerInfo", (_, res)=>{    
    let cpus = os.cpus();
    let networkInterfaces = [];
    
    Object.entries(os.networkInterfaces()).forEach((entry)=>{
        const [ name , interfaces ] = entry;

        for(const i of interfaces){
            const { family , internal , address} = i;
            if(!internal && family === "IPv4"){
                networkInterfaces.push({name , address});
            }
        }
    });

    res.status(200).json({
        hostInfo : {
            name : os.hostname(),
            cpu  : `${cpus.length} x ${cpus[0].model}`,
            mem  : os.totalmem()
        },
        networkInterfaces
    });
});

/* Helper methods */

function recursiveRead(root) {
    return new Promise((resolve, reject) => {
        fs.readdir(root, {}, (err, files) => {
            let promises = [];
            let result = {
                content: {},
                contains: {
                    file: 0,
                    folder: 0
                },
                size: 0
            };

            if (err) reject(err);
            else {
                for (const filename of files) {
                    try {
                        const _path = `${root}/${filename}`;
                        const _stat = fs.statSync(_path);

                        let instance = {
                            type: _stat.isFile() ? "file" : "dir",
                            path: _path.replace(ROOT, ""),
                            size: 0,
                            timestamps: {
                                created: _stat.ctime,
                                accessed: _stat.atime,
                                modified: _stat.mtime
                            }
                        }

                        if (_stat.isDirectory()) {
                            let promise = recursiveRead(_path)
                                .catch((e) => { reject(e); })
                                .then((value) => {
                                    if (value) {
                                        const { content, size, contains } = value;

                                        instance.content = content;
                                        instance.size = size;
                                        instance.contains = contains;

                                        result.contains.file += contains.file;
                                        result.contains.folder += contains.folder + 1;
                                        result.content[filename] = instance;
                                        result.size += instance.size;
                                    }
                                });

                            promises.push(promise);
                        } else {
                            instance.fileName = filename.substring(0, filename.lastIndexOf("."));
                            instance.fileExt = filename.substring(filename.lastIndexOf(".") + 1);
                            instance.size = _stat.size;

                            result.content[filename] = instance;
                            result.contains.file++;
                            result.size += _stat.size;
                        }
                    } catch (err) {
                        reject(err);
                    }
                }
            }

            Promise.all(promises)
                .catch((err) => {
                    reject(err);
                })
                .then(() => resolve(result));
        });
    });
}

function readMetadata(path) {
    return new Promise((resolve, reject) => {
        ffmetadata.read(path, {}, (err, data) => {
            err ? reject(err) : resolve(data);
        });
    });
}

export default app;