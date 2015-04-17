/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets: true, $*/

define(function (require, exports, module) {
    "use strict";

    var Menus       = brackets.getModule("command/Menus"),
        Resizer     = brackets.getModule("utils/Resizer"),
        UrlParams   = brackets.getModule("utils/UrlParams").UrlParams,
        StatusBar   = brackets.getModule("widgets/StatusBar"),
        Strings     = brackets.getModule("strings");

    var IframeBrowser = require("lib/iframe-browser");

    /**
     * This function calls all the hide functions and listens
     * for bramble to be loaded
     */
    function initUI() {
        addLivePreviewButton();

        if(shouldHideUI()) {
            removeMainToolBar();
            removeLeftSideToolBar();
            removeRightSideToolBar();
            removeTitleBar();
        }
    }

    /**
     * This function parses brackets URL, and looks for the GET parameter "ui"
     * if ui is set to 1, then the UI is shown
     */
    function shouldHideUI() {
        var params = new UrlParams();
        params.parse();
        return params.get("ui") !== "1";
    }

    /**
     * This function merely removes the left side tool bar
     */
    function removeLeftSideToolBar() {
        //Hide second pane working set list
        $("#working-set-list-second-pane").css({"visibility" : "hidden"});
        //Remove splitview button
        $("#sidebar .working-set-splitview-btn").remove();
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
        //remove the file menu
        Menus.removeMenu(Menus.AppMenuBar.FILE_MENU);

        //remove the edit menu
        Menus.removeMenu(Menus.AppMenuBar.EDIT_MENU);

        //remove the find menu
        Menus.removeMenu(Menus.AppMenuBar.FIND_MENU);

        //remove the view menu
        Menus.removeMenu(Menus.AppMenuBar.VIEW_MENU);

        //remove the navigate menu
        Menus.removeMenu(Menus.AppMenuBar.NAVIGATE_MENU);

        //remove the help menu
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

    /**
     * Used to add a button to the status bar for the
     * detached live preview.
     */
    function addLivePreviewButton() {
        var livePreview = Mustache.render("<div><a id='liveDevButton' href=#></a></div>", Strings);
        StatusBar.addIndicator("liveDevButtonBox", $(livePreview), true, "",
                               "Click to open preview in separate window", "status-overwrite");
        $("#liveDevButton").addClass("liveDevButtonDetach");

        $("#liveDevButton").click(function () {
            Resizer.makeResizable("#second-pane");

            // Checks if the attached preview is visible.
            // If it is, the attached preview is hidden
            // and the detached preview is opened.
            if(Resizer.isVisible("#second-pane")) {
                _detachPreview();
            }
            else {
                _attachPreview();
            }
        });
    }

    /**
      * Used to hide second pane, spawn detached preview, and attach beforeunload listener
      */
    function _detachPreview() {
        Resizer.hide("#second-pane");
        $("#first-pane").addClass("expandEditor");
        $('#liveDevButton').removeClass("liveDevButtonDetach");
        $('#liveDevButton').addClass("liveDevButtonAttach");
        IframeBrowser.detachPreview();
        IframeBrowser.getDetachedPreview().addEventListener("beforeunload", function(e){
            _attachPreview();
        }, false);
    }

    /**
      * Used to show second pane, change lilveDevButton background and close the detached preview
      */
    function _attachPreview() {
        Resizer.show("#second-pane");
        $('#liveDevButton').removeClass("liveDevButtonAttach");
        $('#liveDevButton').addClass("liveDevButtonDetach");
        $("#first-pane").removeClass("expandEditor");
        IframeBrowser.getDetachedPreview().close();
    }

    // Define public API
    exports.initUI                 = initUI;
    exports.removeLeftSideToolBar  = removeLeftSideToolBar;
    exports.removeMainToolBar      = removeMainToolBar;
    exports.removeRightSideToolBar = removeRightSideToolBar;
});
