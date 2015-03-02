// **********************************************************************
//
// Copyright (c) 2003-2014 ZeroC, Inc. All rights reserved.
//
// This copy of Ice is licensed to you under the terms described in the
// ICE_LICENSE file included in this distribution.
//
// **********************************************************************

var http = require("http");
var https = require("https");
var url = require("url");
var crypto = require("crypto");
var fs = require("fs");
var path = require("path");
var httpProxy = require("http-proxy");

function isdir(p)
{
    try
    {
        return fs.statSync(path.join(p)).isDirectory(); 
    }
    catch(e)
    {
    }
    return false;
}

function Init()
{
    var MimeTypes =
    {
        css: "text/css",
        html: "text/html",
        ico: "image/x-icon",
        jpeg: "image/jpeg",
        jpg: "image/jpeg",
        js: "text/javascript",
        png: "image/png",
    };
    
    var useBinDist = process.env["USE_BIN_DIST"] == "yes";
    var demoDist = !isdir(path.join(__dirname, "..", "lib"));

    //
    // If using a demo distribution or USE_BIN_DIST was set,
    // resolve libraries in bower_components/zeroc-icejs directory.
    //
    var iceLibDir;
    if(demoDist || useBinDist)
    {
        iceLibDir = path.resolve(path.join(__dirname, "../bower_components/zeroc-icejs/lib"));
    }

    var libraries = ["/lib/Ice.js", "/lib/Ice.min.js",
                    "/lib/Glacier2.js", "/lib/Glacier2.min.js",
                    "/lib/IceStorm.js", "/lib/IceStorm.min.js",
                    "/lib/IceGrid.js", "/lib/IceGrid.min.js",];

    var HttpServer = function(host, ports)
    {
        this._host = host;
        this._ports = ports;
        this._basePath = path.resolve(path.join(__dirname, ".."));
    };

    HttpServer.prototype.processRequest = function(req, res)
    {
        var filePath;

        var iceLib = libraries.indexOf(req.url.pathname) !== -1;
        //
        // If ICE_HOME has been set resolve Ice libraries paths into ICE_HOME.
        //
        if(iceLibDir && iceLib)
        {
            filePath = path.join(iceLibDir, req.url.pathname.substr(4));
        }
        else
        {
            filePath = path.resolve(path.join(this._basePath, req.url.pathname));
        }

        //
        // If OPTIMIZE is set resolve Ice libraries to the corresponding minified
        // versions.
        //
        if(process.env.OPTIMIZE == "yes" && iceLib && filePath.substr(-7) !== ".min.js")
        {
            filePath = filePath.replace(".js", ".min.js");
        }

        var ext = path.extname(filePath).slice(1);

        //
        // When the browser ask for a .js or .css file and it has support for gzip content
        // check if a gzip version (.js.gz or .css.gz) of the file exists and use that instead.
        //
        if((ext == "js" || ext == "css") && req.headers["accept-encoding"].indexOf("gzip") !== -1)
        {
            fs.stat(filePath + ".gz",
                    function(err, stats)
                    {
                        if(err || !stats.isFile())
                        {
                            fs.stat(filePath,
                                    function(err, stats)
                                    {
                                        doRequest(err, stats, filePath);
                                    });
                        }
                        else
                        {
                            doRequest(err, stats, filePath + ".gz");
                        }
                    });
        }
        else
        {
            fs.stat(filePath,
                        function(err, stats)
                        {
                            doRequest(err, stats, filePath);
                        });
        }

        var doRequest = function(err, stats, filePath)
        {
            if(err)
            {
                if(err.code === "ENOENT")
                {
                    res.writeHead(404);
                    res.end("404 Page Not Found");
                    console.log("HTTP/404 (Page Not Found)" + req.method + " " + req.url.pathname + " -> " + filePath);
                }
                else
                {
                    res.writeHead(500);
                    res.end("500 Internal Server Error");
                    console.log("HTTP/500 (Internal Server Error) " + req.method + " " + req.url.pathname + " -> " +
                                filePath);
                }
            }
            else
            {
                if(!stats.isFile())
                {
                    res.writeHead(403);
                    res.end("403 Forbiden");
                    console.log("HTTP/403 (Forbiden) " + req.method + " " + req.url.pathname + " -> " + filePath);
                }
                else
                {
                    //
                    // Create a md5 using the stats attributes
                    // to be used as Etag header.
                    //
                    var hash = crypto.createHash("md5");
                    hash.update(stats.ino.toString());
                    hash.update(stats.mtime.toString());
                    hash.update(stats.size.toString());

                    var headers =
                    {
                        "Content-Type": MimeTypes[ext] || "text/plain",
                        "Content-Length": stats.size,
                        "Last-Modified": new Date(stats.mtime).toUTCString(),
                        "Etag": hash.digest("hex")
                    };

                    if(path.extname(filePath).slice(1) == "gz")
                    {
                        headers["Content-Encoding"] = "gzip";
                    }

                    //
                    // Check for conditional request headers, if-modified-since
                    // and if-none-match.
                    //
                    var modified = true;
                    if(req.headers["if-none-match"] !== undefined)
                    {
                        modified = req.headers["if-none-match"].split(" ").every(
                            function(element, index, array)
                            {
                                return element !== headers.Etag;
                            });
                    }

                    //
                    // Not Modified
                    //
                    if(!modified)
                    {
                        res.writeHead(304, headers);
                        res.end();
                        console.log("HTTP/304 (Not Modified) " + req.method + " " + req.url.pathname + " -> " + filePath);
                    }
                    else
                    {
                        res.writeHead(200, headers);
                        if(req.method === "HEAD")
                        {
                            res.end();
                        }
                        else
                        {
                            fs.createReadStream(filePath, { "bufferSize": 4 * 1024 }).pipe(res);
                        }
                        console.log("HTTP/200 (Ok) " + req.method + " " + req.url.pathname + " -> " + filePath);
                    }
                }
            }
        };
    };

    //
    // Proxy configuration for the different demos.
    //
    var proxyConfig = [
        {resource: "/demows", target: "http://localhost:10002", protocol: "ws"},
        {resource: "/demowss", target: "https://localhost:10003", protocol: "wss"},
        {resource: "/chatws", target: "http://localhost:5063", protocol: "ws"},
        {resource: "/chatwss", target: "https://localhost:5064", protocol: "wss"}
    ];

    var proxies = {};

    HttpServer.prototype.start = function()
    {
        var baseDir;
        if(!["../../certs", "../certs"].some(
            function(p)
            {
                return fs.existsSync(baseDir = path.join(__dirname, p));
            }))
        {
            console.error("Cannot find wss certificates directory");
            process.exit(1);
        }
        var options = {
            passphrase: "password",
            key: fs.readFileSync(path.join(baseDir, "s_rsa1024_priv.pem")),
            cert: fs.readFileSync(path.join(baseDir, "s_rsa1024_pub.pem"))
        };

        var httpServer = http.createServer();
        var httpsServer = https.createServer(options);

        if(httpProxy)
        {
            proxyConfig.forEach(
                function(conf)
                {
                    proxies[conf.resource] = {
                        server: httpProxy.createProxyServer({target : conf.target, secure : false}),
                        protocol: conf.protocol };
                });
        }

        var self = this;
        [httpServer, httpsServer].forEach(function(server)
                        {
                            server.on("request", function(req, res)
                                    {
                                            //
                                            // Dummy data callback required so request end event is emitted.
                                            //
                                            var dataCB = function(data)
                                            {
                                            };

                                            var endCB = function()
                                            {
                                                req.url = url.parse(req.url);
                                                self.processRequest(req, res);
                                            };

                                            req.on("data", dataCB);
                                            req.on("end", endCB);
                                    });
                        });

        if(httpProxy)
        {
            var requestCB = function(protocols)
            {
                return function(req, socket, head)
                {
                    var errCB = function(err)
                    {
                        socket.end();
                    };
                    var proxy = proxies[req.url];
                    if(proxy && protocols.indexOf(proxy.protocol) !== -1)
                    {
                        proxy.server.ws(req, socket, head, errCB);
                    }
                    else
                    {
                        socket.end();
                    }
                };
            };

            httpServer.on("upgrade", requestCB(["ws"]));
            httpsServer.on("upgrade", requestCB(["ws", "wss"]));
        }

        httpServer.listen(8080, this._host);
        httpsServer.listen(9090, this._host);
        console.log("listening on ports 8080 (http) and 9090 (https)...");
    };
    
    new HttpServer("0.0.0.0", [8080, 9090]).start();
}

module.exports = Init;