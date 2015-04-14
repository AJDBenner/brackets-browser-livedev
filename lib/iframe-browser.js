/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */
define(function (require, exports, module) {
    "use strict";

    var CommandManager      = brackets.getModule("command/CommandManager"),
        MainViewManager     = brackets.getModule("view/MainViewManager"),
        Commands            = brackets.getModule("command/Commands");
    // Orientation
    var VERTICAL_ORIENTATION    = 0,
        HORIZONTAL_ORIENTATION  = 1;
    // by default we use vertical orientation
    var _orientation = VERTICAL_ORIENTATION;
    // Window object reference
    var windowObjectRef = null;
    var previousURL;

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
     * Function used to interact with the second-pane
     * In which our iFrame will exists and will be filled
     * with the url that has been passed to this function
     */
    function update(url) {
        if(url) {
            var iframe = getBrowserIframe();
            if(iframe) {
                iframe.src = url;
            }
        }
    }

    // Return reference to iframe element or null if not available.
    function getBrowserIframe() {
        return document.getElementById("bramble-iframe-browser");
    }

    // Open a new window with the content of the iframe
    // Only 1 window is allowed for the preview
    function detachPreview() {
        if(getBrowserIframe()) {
            var currentURL = getBrowserIframe().src;
            if(windowObjectRef === null || windowObjectRef.closed){
                windowObjectRef = window.open(currentURL, "Preview");
            } else if(previousURL !== currentURL){
                windowObjectRef = window.open(currentURL, "Preview");
                windowObjectRef.focus();
            } else {
                windowObjectRef.focus();
            }
            previousURL = currentURL;
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
    exports.detachPreview = detachPreview;
});
