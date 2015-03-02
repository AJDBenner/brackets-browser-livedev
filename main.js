/* jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, browser: true */
/* global define, brackets, appshell, $ */

/**
 * This extension provides in-editor livepreview through an iframe,
 * and leverages the experimental Multi Browser implementation of brackets
 * (see https://github.com/adobe/brackets/tree/master/src/LiveDevelopment/MultiBrowserImpl)
 */
define(function (require, exports, module) {
    "use strict";

    // Load dependencies 
    var AppInit              = brackets.getModule("utils/AppInit"),
        EditorManager        = brackets.getModule("editor/EditorManager"),
        LiveDevelopment      = brackets.getModule("LiveDevelopment/LiveDevMultiBrowser"),
        LiveDevServerManager = brackets.getModule("LiveDevelopment/LiveDevServerManager"),
        Menus                = brackets.getModule("command/Menus"),
        PreferencesManager   = brackets.getModule("preferences/PreferencesManager"),
        ProjectManager       = brackets.getModule("project/ProjectManager"),
        Resizer              = brackets.getModule("utils/Resizer");
        UrlParams            = brackets.getModule("utils/UrlParams").UrlParams,
        // Nohost dependencies
        Browser              = require("lib/iframe-browser"),
        Launcher             = require("lib/launcher").Launcher,
        NoHostServer         = require("nohost/src/NoHostServer").NoHostServer,
        PostMessageTransport = require("lib/PostMessageTransport");

    var codeMirror,
        _server,
        fs                   = appshell.Filer.fs(),
        params               = new UrlParams(),
        parentWindow         = window.parent;

    // Load in default html page
    var defaultHTML          = require("text!lib/default.html");    

    /**
     * By default this extension will remove top and side bars
     */
    function init(){
        hide();
        parentWindow.postMessage(JSON.stringify({
            type: "bramble:loaded"
        }), "*");
    }

    /**
     * This function calls all the hide functions
     */
    function hide() {
        removeMainToolBar();
        removeLeftSideToolBar();
        removeRightSideToolBar();
        removeTitleBar();
    }

    /**
     * This function merely removes the left side tool bar
     */
    function removeLeftSideToolBar() {
        Resizer.hide("#sidebar");
    }

    /**
     * This function merely removes the title bar
     * and the header of the first pane
     */
    function removeTitleBar() {
        $("#titlebar").remove();
        $("#first-pane .pane-header").remove();
        //Alter the height of the affected elements
        $("#editor-holder").css({"height" : "96%"});
        $("#first-pane .pane-content, .cm-s-light-theme").css({"height": "100%"});
    }

    /**
     * Used to remove the top tool bar
     */
    function removeMainToolBar() {
        // Remove the file menu
        Menus.removeMenu(Menus.AppMenuBar.FILE_MENU);

        // Remove the edit menu
        Menus.removeMenu(Menus.AppMenuBar.EDIT_MENU);

        // Remove the find menu
        Menus.removeMenu(Menus.AppMenuBar.FIND_MENU);

        // Remove the view menu
        Menus.removeMenu(Menus.AppMenuBar.VIEW_MENU);

        // Remove the navigate menu
        Menus.removeMenu(Menus.AppMenuBar.NAVIGATE_MENU);

        // Remove the help menu
        Menus.removeMenu(Menus.AppMenuBar.HELP_MENU);
    }

    /**
     * Used to remove the right side tool bar
     */
    function removeRightSideToolBar() {
        Resizer.makeResizable("#main-toolbar");
        Resizer.hide("#main-toolbar");
        $(".content").css("right","0");
    }

    function _getServer() {
        if (!_server) {
            _server = new NoHostServer({
                pathResolver    : ProjectManager.makeProjectRelativeIfPossible,
                root            : ProjectManager.getProjectRoot()
            });
        }
        return _server;
    }

    // We wait until the LiveDevelopment module is initialized and the project loaded
    // so we can safely swap our transport and launcher modules for
    // the defaults and start LiveDev.
    function _configureLiveDev() {
        // Turn preview iFrame On
        Browser.init();

        function _configureModules() {
            // Set up our transport and plug it into live-dev
            PostMessageTransport.setIframe(Browser.getBrowserIframe());
            LiveDevelopment.setTransport(PostMessageTransport);

            // Set up our launcher in a similar manner
            // XXXhumph - this depends on setLauncher() from https://github.com/adobe/brackets/pull/10558
            LiveDevelopment.setLauncher(new Launcher({
                browser: Browser,
                server: _getServer()
            }));

            LiveDevelopment.open();
        }
        LiveDevelopment.one("statusChange", _configureModules);
    }
    ProjectManager.one("projectOpen", _configureLiveDev);

    // Force entry to if statments on line 262 of brackets.js to create
    // a new project
    PreferencesManager.setViewState("afterFirstLaunch", false);
    params.remove("skipSampleProjectLoad");

    // We configure Brackets to run the experimental live dev
    // with our nohost server and iframe combination. This has to
    // occur before the project is loaded, triggering the start of
    // the live preview.
    AppInit.extensionsLoaded(function () {
        // Flip livedev.multibrowser to true
        var prefs = PreferencesManager.getExtensionPrefs("livedev");
        prefs.set("multibrowser", true);

        // Register nohost server with highest priority
        LiveDevServerManager.registerServer({ create: _getServer }, 9001);
    });

    AppInit.appReady(function() {
        // Once the app has loaded our file,
        // and we can be confident the editor is open,
        // get a reference to it and attach our "onchange"
        // listener to codemirror
        codeMirror = EditorManager.getActiveEditor()._codeMirror;

        parentWindow.postMessage(JSON.stringify({
            type: "bramble:change",
            sourceCode: codeMirror.getValue()
        }), "*");

        codeMirror.on("change", function(e){
            parentWindow.postMessage(JSON.stringify({
                type: "bramble:change",
                sourceCode: codeMirror.getValue()
            }), "*");
        });

        init();
    });

    // Eventually, we'll listen for a message from
    // thimble containing the make's initial code.
    // For now, we are defaulting to thimble's starter
    // make.
    exports.initExtension = function() {
        var deferred = new $.Deferred();

        fs.writeFile('/index.html', defaultHTML, function(err) {
            if (err) {
                deferred.reject();
                return;
            }

            deferred.resolve();
        });

        return deferred.promise();
    };

    // Define public API
    exports.hide                   = hide;
    exports.removeLeftSideToolBar  = removeLeftSideToolBar;
    exports.removeMainToolBar      = removeMainToolBar;
    exports.removeRightSideToolBar = removeRightSideToolBar;
});
