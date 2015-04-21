/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, forin: true, maxerr: 50, regexp: true */
/*global define, brackets*/

// This transport provides a PostMessage connection between Brackets and a live browser preview.

define(function (require, exports, module) {
    "use strict";

    var _iframeRef,
        connId = 1;

    var Launcher = require("lib/launcher"),
        Browser  = require("lib/iframe-browser");

    var EventDispatcher     = brackets.getModule("utils/EventDispatcher"),
        LiveDevMultiBrowser = brackets.getModule("LiveDevelopment/LiveDevMultiBrowser"),
        BlobUtils           = brackets.getModule("filesystem/impls/filer/BlobUtils"),
        Path                = brackets.getModule("filesystem/impls/filer/BracketsFiler").Path;

    // The script that will be injected into the previewed HTML to handle the other side of the post message connection.
    var PostMessageTransportRemote = require("text!lib/PostMessageTransportRemote.js");

    EventDispatcher.makeEventDispatcher(module.exports);

    /**
     * Saves a reference of the iframe element to a local variable
     * @param {DOM element reference to an iframe}
     */
    function setIframe(iframeRef) {
        if(iframeRef) {
            _iframeRef = iframeRef;
        }
    }

    // This function maps all blob urls in a message to filesystem
    // paths based on the urls that are cached, so that Brackets can work
    // with paths vs. urls
    // For e.g. a message like `{"stylesheets": {"blob://http://url" :
    // ["blob://http://url"]}}` will be mapped into `{"stylesheets":
    // {"/file1" : ["/file1"]}}`
    function resolveLinks(message) {
        var regex = new RegExp('\\"(blob:[^"]+)\\"', 'gm');
        var resolvedMessage = message.replace(regex, function(match, url) {
            var path = BlobUtils.getFilename(url);

            return ["\"", path, "\""].join("");
        });

        return resolvedMessage;
    }

    /**
    * Message event listener
    */
    function _listener(event){
        var msgObj;

        try {
            msgObj = JSON.parse(event.data);
        } catch (e) {
            return;
        }

        if(msgObj.type === "message"){
            if(msgObj.message) {
                msgObj.message = resolveLinks(msgObj.message);
            }

            //trigger message event
            module.exports.trigger("message", [connId, msgObj.message]);
        } else if (msgObj.type === "connect") {
            Browser.setListener();
        }
    }

    /**
    * Initializes the post message connection
    */
    function start(){
        window.addEventListener("message", _listener);
    }

    /**
    * Replaces paths of linked files with blob urls
    */
    function resolvePaths(message) {
        var currentDoc = LiveDevMultiBrowser._getCurrentLiveDoc();
        if(!currentDoc) {
            return message;
        }

        var currentDir = Path.dirname(currentDoc.doc.file.fullPath);
        var linkRegex = new RegExp('(\\\\?\\")(href|src|url)(\\\\?\\":\\\\?\\")([^\\\\"]+)(\\\\?\\")', 'gm');
        var resolvedMessage = message.replace(linkRegex, function(match, quote1, attr, seperator, path, quote2) {
            path = BlobUtils.getUrl(path.charAt(0) === "/" ? path : Path.join(currentDir, path));

            return [quote1, attr, seperator, path, quote2].join('');
        });

        return resolvedMessage;
    }

    /**
     * Sends a transport-layer message via post message.
     * @param {number|Array.<number>} idOrArray A client ID or array of client IDs to send the message to.
     * @param {string} msgStr The message to send as a JSON string.
     */
    function send(idOrArray, msgStr){
        var win = _iframeRef.contentWindow;
        msgStr = resolvePaths(msgStr);
        var msg = JSON.parse(msgStr);
        var detachedPreview = Browser.getDetachedPreview();

        // Because we need to deal with reloads on this side (i.e., editor) of the
        // transport, check message before sending to remote, and reload if necessary
        // without actually sending to remote for processing.
        if(msg.method === "Page.reload" || msg.method === "Page.navigate") {
            reload();
            return;
        }

        win.postMessage(msgStr, "*");

        if(detachedPreview) {
            detachedPreview.postMessage(msgStr, "*");
        }
    }

    /**
    * Removes the message event listener
    */
    function close(clientId){
        window.removeEventListener("message", _listener);
    }

    /**
     * Returns the script that should be injected into the browser to handle the other end of the transport.
     * @return {string}
     */
    function getRemoteScript() {
        return "<script>\n" +
            PostMessageTransportRemote +
            "</script>\n";
    }

    function reload() {
        var launcher = Launcher.getCurrentInstance();
        var liveDoc = LiveDevMultiBrowser._getCurrentLiveDoc();
        var url = BlobUtils.getUrl(liveDoc.doc.file.fullPath);

        launcher.launch(url);
    }

    // Exports
    module.exports.getRemoteScript = getRemoteScript;
    module.exports.setIframe       = setIframe;
    module.exports.start           = start;
    module.exports.send            = send;
    module.exports.close           = close;
    module.exports.reload          = reload;
});
