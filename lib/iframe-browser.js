/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */
define(function (require, exports, module) {
    "use strict";

    var CommandManager      = brackets.getModule("command/CommandManager"),
        MainViewManager     = brackets.getModule("view/MainViewManager"),
        Commands            = brackets.getModule("command/Commands"),
        Resizer             = brackets.getModule("utils/Resizer"),
        StatusBar           = brackets.getModule("widgets/StatusBar");
    // Orientation
    var VERTICAL_ORIENTATION    = 0,
        HORIZONTAL_ORIENTATION  = 1;
    // by default we use vertical orientation
    var _orientation = VERTICAL_ORIENTATION;
    // Window object reference
    var detachedWindow;
    var isReload;
    var PostMessageTransport = require("lib/PostMessageTransport");

    /*
     * Publicly avaialble function used to create an empty iframe within the second-panel
     */
    function init() {
        //Check to see if we've created the iframe already, return if so
        if(getBrowserIframe()) {
            return;
        }
        //Get current GUI layout
        var result = MainViewManager.getLayoutScheme();

        // If iframe does not exist, then show it
        if(result.rows === 1 && result.columns === 1) {
            show(_orientation);
        }
        /*
         *Creating the empty iFrame we'll be using
         * Starting by Emptying all contents of #second-pane
         */
        var _panel = $("#second-pane").empty();

        // Create the iFrame for the blob to live in later
        var iframeConfig = {
            id: "bramble-iframe-browser",
            frameborder: 0
        };
        //Append iFrame to _panel
        $("<iframe>", iframeConfig).css({"width":"100%", "height":"100%"}).appendTo(_panel);
    }

    /*
     * Publicly available function used to change the _orientation value of iframe-browser
     * orientation: Takes one argument of either VERTICAL_ORIENTATION OR
     * HORIZONTAL_ORIENTATION and uses that to change the _orientation value accordingly
     */
    function setOrientation(orientation) {
        if(orientation === VERTICAL_ORIENTATION) {
            _orientation = VERTICAL_ORIENTATION;
        }
        else if (orientation === HORIZONTAL_ORIENTATION) {
            _orientation = HORIZONTAL_ORIENTATION;
        }
    }

    /*
     * Publicly available function used to change the layout of the iFrame
     * orientation: Takes one argument of either VERTICAL_ORIENTATION OR
     * HORIZONTAL_ORIENTATION and uses that to change the layout accordingly
     */
    function show() {
        if(_orientation === VERTICAL_ORIENTATION) {
            CommandManager.execute(Commands.CMD_SPLITVIEW_VERTICAL);
        }
        else if(_orientation === HORIZONTAL_ORIENTATION) {
            CommandManager.execute(Commands.CMD_SPLITVIEW_HORIZONTAL);
        }
    }

    /**
     * Function used to interact with the second-pane,
     * In which our iFrame will exists, and the detached
     * preview, if it exist. They will be filled
     * with the url that has been passed to this function
     */
    function update(url) {
        if(!url) {
            return;
        }

        var iframe = getBrowserIframe();
        if(iframe) {
            iframe.src = url;
        }
        var detachedPreview = getDetachedPreview();
        if(detachedPreview) {
            isReload = true;
            detachedPreview.location.replace(url);
        }
    }

    // Return reference to iframe element or null if not available.
    function getBrowserIframe() {
        return document.getElementById("bramble-iframe-browser");
    }

    /**
     * Used to hide second pane, spawn detached preview, and attach beforeunload listener
     */
    function detachPreview() {
        var iframe = getBrowserIframe();

        if(!iframe) {
            return;
        }

        PostMessageTransport.reload();

        Resizer.hide("#second-pane");
        $("#first-pane").addClass("expandEditor");
        $("#liveDevButton").removeClass("liveDevButtonDetach");
        $("#liveDevButton").addClass("liveDevButtonAttach");

        var currentURL = iframe.src;
        // Open detached preview window
        detachedWindow = window.open(currentURL, "Preview");

        // Adds tooltip prompting user to return to attached preview
        StatusBar.addIndicator("liveDevButtonBox", $("#liveDevButtonBox"), true, "",
                               "Click to return preview to current window", "status-overwrite");

        return detachedWindow;
    }

    // Return reference of open window if it exists and isn't closed
    function getDetachedPreview() {
        if(detachedWindow && !detachedWindow.closed) {
            return detachedWindow;
        }
    }

    /**
     * Used to show second pane, change lilveDevButton background and close the detached preview
     */
    function attachPreview() {
        var detachedPreview = getDetachedPreview();
        if(detachedPreview && isReload) {
            isReload = false;
            return;
        }

        if(detachedPreview) {
            detachedPreview.removeEventListener("beforeunload", attachPreview, false);
            detachedPreview.close();
        }

        Resizer.show("#second-pane");
        $("#liveDevButton").removeClass("liveDevButtonAttach");
        $("#liveDevButton").addClass("liveDevButtonDetach");
        $("#first-pane").removeClass("expandEditor");

        // Adds tooltip prompting user to detach preview
        StatusBar.addIndicator("liveDevButtonBox", $("#liveDevButtonBox"), true, "",
                               "Click to open preview in separate window", "status-overwrite"); 
    }

    function setListener() {
        var detachedPreview = getDetachedPreview();
        if(detachedPreview) {
            detachedPreview.addEventListener("beforeunload", attachPreview, false);
        }
    }

    // Define public API
    exports.init = init;
    exports.update = update;
    exports.show = show;
    exports.getBrowserIframe = getBrowserIframe;
    // Expose these constants on our module, so callers can use them with setOrientation()
    exports.HORIZONTAL_ORIENTATION = HORIZONTAL_ORIENTATION;
    exports.VERTICAL_ORIENTATION = VERTICAL_ORIENTATION;
    exports.setOrientation = setOrientation;
    exports.getDetachedPreview = getDetachedPreview;
    exports.attachPreview = attachPreview;
    exports.detachPreview = detachPreview;
    exports.setListener = setListener;
});
