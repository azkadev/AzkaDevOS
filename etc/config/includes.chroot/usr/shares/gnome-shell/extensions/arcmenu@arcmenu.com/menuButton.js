/*
 * ArcMenu - A traditional application menu for GNOME 3
 *
 * ArcMenu Lead Developer and Maintainer
 * Andrew Zaech https://gitlab.com/AndrewZaech
 * 
 * ArcMenu Founder, Former Maintainer, and Former Graphic Designer
 * LinxGem33 https://gitlab.com/LinxGem33 - (No Longer Active)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const Me = imports.misc.extensionUtils.getCurrentExtension();

const {Clutter, GLib, GObject, Shell, St} = imports.gi;
const appSys = Shell.AppSystem.get_default();
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MW = Me.imports.menuWidgets;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

var DASH_TO_PANEL_UUID = 'dash-to-panel@jderose9.github.com';
var DASH_TO_DOCK_UUID = 'dash-to-dock@micxgx.gmail.com';
var UBUNTU_DOCK_UUID = 'ubuntu-dock@ubuntu.com';

var MenuButton = GObject.registerClass(class Arc_Menu_MenuButton extends PanelMenu.Button{
    _init(settings, arcMenuPlacement, panel, dashIndex) {
        super._init(0.5, null, true);
        this._settings = settings;
        this._panel = panel;
        this.menu.destroy();
        this.add_style_class_name('arc-menu-panel-menu');
        this.arcMenuPlacement = arcMenuPlacement;
        this.tooltipShowing = false;
        this.tooltipHidingID = null;
        this.tooltipShowingID = null;

        let menuManagerParent;
        if(this.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL)
            menuManagerParent = this._panel;
        else if(this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH)
            menuManagerParent = this;
        
        //Create Main Menus - ArcMenu and arcMenu's context menu
        this.arcMenu = new ArcMenu(this, 0.5, St.Side.TOP);
        this.arcMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));

        this.arcMenuContextMenu = new ArcMenuContextMenu(this, 0.5, St.Side.TOP);	
        this.arcMenuContextMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));

        this.menuManager = new PopupMenu.PopupMenuManager(menuManagerParent);
        this.menuManager._changeMenu = (menu) => {};
        this.menuManager.addMenu(this.arcMenu);
        this.menuManager.addMenu(this.arcMenuContextMenu);
        
        //Context Menus for applications and other menu items
        this.contextMenuManager = new PopupMenu.PopupMenuManager(this);
        this.contextMenuManager._changeMenu = (menu) => {};
        this.contextMenuManager._onMenuSourceEnter = (menu) =>{
            if (this.contextMenuManager.activeMenu && this.contextMenuManager.activeMenu != menu)
                return Clutter.EVENT_STOP;

            return Clutter.EVENT_PROPAGATE;
        }

        //Sub Menu Manager - Control all other popup menus
        this.subMenuManager = new PopupMenu.PopupMenuManager(this);
        this.subMenuManager._changeMenu = (menu) => {};
        if(this.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL){
            this.menuButtonWidget = new MW.MenuButtonWidget();
            this.x_expand = false;
            this.y_expand = false;
        }
        else if(this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH){
            this.menuButtonWidget = new MW.DashMenuButtonWidget(this, this._settings);
            this.dash = this._panel._allDocks[dashIndex];
            this.style_class = 'dash-item-container';
            this.child = this.menuButtonWidget.icon;
            this.icon = this.menuButtonWidget.icon;
            this.label = this.menuButtonWidget.label;
            this.container.showLabel = () => this.menuButtonWidget.showLabel();
            this.container.hideLabel = () => this.menuButtonWidget.hideLabel();
            this.container.toggleButton = this.menuButtonWidget.actor;
            this.toggleButton = this.menuButtonWidget.actor;
            this.container.setDragApp = () => {};
            this.arcMenuContextMenu.addExtensionSettings(this.arcMenuPlacement);
        }

        //Add Menu Button Widget to Button
        this.add_actor(this.menuButtonWidget.actor);
    }

    initiate(){
        if(this.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL){
            //Dash to Panel Integration
            this.dashToPanel = Main.extensionManager.lookup(DASH_TO_PANEL_UUID);
            this.extensionChangedId = Main.extensionManager.connect('extension-state-changed', (data, extension) => {
                if (extension.uuid === DASH_TO_PANEL_UUID && extension.state === 1) {
                    this.dashToPanel = Main.extensionManager.lookup(DASH_TO_PANEL_UUID);      
                    this.syncWithDashToPanel();
                }
                if (extension.uuid === DASH_TO_PANEL_UUID && extension.state === 2) {
                    this.dashToPanel = null;
                    this.arcMenuContextMenu.removeExtensionSettings();
                    this.updateArrowSide(St.Side.TOP);
                    if(this.dtpPostionChangedID>0 && this.extensionSettingsItem){
                        this.extensionSettingsItem.disconnect(this.dtpPostionChangedID);
                        this.dtpPostionChangedID = 0;
                    }
                }  
            });
            if(this.dashToPanel && this.dashToPanel.stateObj){
                this.syncWithDashToPanel();
            }  
        }
        else if(this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH){   
            //Dash to Dock Integration    
            this.dtdPostionChangedID = this._panel._settings.connect('changed::dock-position', ()=> {
                let side = this._panel._settings.get_enum('dock-position');
                this.updateArrowSide(side);
            });
        }

        this._iconThemeChangedId = St.TextureCache.get_default().connect('icon-theme-changed', this.reload.bind(this));
        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => {
            this.updateHeight();
        });
        
        this._startupCompleteId = Main.layoutManager.connect('startup-complete', () => {
            this.updateHeight();
        });

        this.initiateRecentlyInstalledApps();
        this.setMenuPositionAlignment();

        //Create Basic Layout
        this.createLayoutID = GLib.timeout_add(0, 100, () => {
            this.createMenuLayout();
            this.createLayoutID = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    setDragApp(){
    }

    handleDragOver(source, _actor, _x, _y, _time) {
        return imports.ui.dnd.DragMotionResult.NO_DROP;
    }

    acceptDrop(source, _actor, _x, _y, _time) {
        return false;
    }

    syncWithDashToPanel(){
        this.arcMenuContextMenu.addExtensionSettings(this.arcMenuPlacement);  
        this.extensionSettingsItem = Utils.getSettings('org.gnome.shell.extensions.dash-to-panel', DASH_TO_PANEL_UUID);
        let monitorIndex = Main.layoutManager.findIndexForActor(this);
        let side = Utils.getDashToPanelPosition(this.extensionSettingsItem, monitorIndex);
        this.updateArrowSide(side);
        let dashToPanelPositionSettings = 'panel-positions'
        try{
            this.extensionSettingsItem.get_string(dashToPanelPositionSettings);
        } catch(e){
            dashToPanelPositionSettings = 'panel-position'
        }
        this.dtpPostionChangedID = this.extensionSettingsItem.connect('changed::' + dashToPanelPositionSettings, ()=> {
            let monitorIndex = Main.layoutManager.findIndexForActor(this);
            let side = Utils.getDashToPanelPosition(this.extensionSettingsItem, monitorIndex);
            this.updateArrowSide(side);
        });
        if(global.dashToPanel){
            global.dashToPanel.panels.forEach(p => {
                if(p.panel === this._panel){
                    this.dtpPanel = p;
                }
            });
        }
    }

    initiateRecentlyInstalledApps(){
        if(this._installedChangedId){
            appSys.disconnect(this._installedChangedId);
            this._installedChangedId = null;
        }

        if(this._settings.get_boolean('disable-recently-installed-apps'))
            return;

        this._appList = this.listAllApps();
        //Update Categories on 'installed-changed' event-------------------------------------
        this._installedChangedId = appSys.connect('installed-changed', () => {
            this._newAppList = this.listAllApps();

            //Filter to find if a new application has been installed
            let newApps = this._newAppList.filter(app => !this._appList.includes(app));

            //A New Application has been installed
            //Save it in settings
            if(newApps.length){
                let recentApps = this._settings.get_strv('recently-installed-apps');
                let newRecentApps = [...new Set(recentApps.concat(newApps))];
                this._settings.set_strv('recently-installed-apps', newRecentApps);
            }
            
            this._appList = this._newAppList;
        });
    }

    listAllApps(){
        let appList = appSys.get_installed().filter(appInfo => {
            try {
                appInfo.get_id(); // catch invalid file encodings
            } catch (e) {
                return false;
            }
            return appInfo.should_show();
        });
        return appList.map(app => app.get_id());
    }

    createMenuLayout(){
        this.arcMenu.actor.style = null;
        this.section = new PopupMenu.PopupMenuSection();
        this.arcMenu.addMenuItem(this.section);            
        this.mainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL
        });        
        this.mainBox._delegate = this.mainBox;
        this.section.actor.add_actor(this.mainBox);

        this.MenuLayout = Utils.getMenuLayout(this, this._settings.get_enum('menu-layout'));
        this.setMenuPositionAlignment();
        this.updateStyle();
        this.forceMenuLocation();
        this.updateHeight();
    }

    setMenuPositionAlignment(){
        let layout = this._settings.get_enum('menu-layout');
        if(this.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL){
            let arrowAlignment = (this._settings.get_int('menu-position-alignment') / 100);
            if(layout != Constants.MenuLayout.RUNNER){
                if(this._settings.get_enum('position-in-panel') == Constants.MenuPosition.CENTER){
                    this.arcMenuContextMenu._arrowAlignment = arrowAlignment
                    this.arcMenu._arrowAlignment = arrowAlignment
                    this.arcMenuContextMenu._boxPointer.setSourceAlignment(.5);
                    this.arcMenu._boxPointer.setSourceAlignment(.5);
                }
                else if(this.dashToPanel && this.dashToPanel.stateObj){
                    let monitorIndex = Main.layoutManager.findIndexForActor(this);
                    let side = Utils.getDashToPanelPosition(this.extensionSettingsItem, monitorIndex);
                    this.updateArrowSide(side, false);
                }  
                else{
                    this.updateArrowSide(St.Side.TOP, false);
                }
            }
            else{
                this.updateArrowSide(St.Side.TOP, false);
                if(this._settings.get_enum('position-in-panel') == Constants.MenuPosition.CENTER){
                    this.arcMenuContextMenu._arrowAlignment = arrowAlignment
                    this.arcMenuContextMenu._boxPointer.setSourceAlignment(.5);
                }
            }
        }
        else if(this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH){
            if(layout != Constants.MenuLayout.RUNNER){
                let side = this._panel._settings.get_enum('dock-position');
                this.updateArrowSide(side, false);
            }
            else{
                this.updateArrowSide(St.Side.TOP, false);
            }
        }
    }

    updateArrowSide(side, setAlignment = true){
        let arrowAlignment;
        if(this.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL){
            this.menuButtonWidget.updateArrowIconSide(side);   
            if(side === St.Side.RIGHT || side === St.Side.LEFT)
                arrowAlignment = 1.0;
            else 
                arrowAlignment = 0.5;
        }
        else if(this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH)
            arrowAlignment = 0.5;
       
        this.arcMenuContextMenu._arrowSide = side;
        this.arcMenuContextMenu._boxPointer._arrowSide = side;
        this.arcMenuContextMenu._boxPointer._userArrowSide = side;
        this.arcMenuContextMenu._boxPointer.setSourceAlignment(0.5);
        this.arcMenuContextMenu._arrowAlignment = arrowAlignment;
        this.arcMenuContextMenu._boxPointer._border.queue_repaint();

        this.arcMenu._arrowSide = side;
        this.arcMenu._boxPointer._arrowSide = side;
        this.arcMenu._boxPointer._userArrowSide = side;
        this.arcMenu._boxPointer.setSourceAlignment(0.5);
        this.arcMenu._arrowAlignment = arrowAlignment;
        this.arcMenu._boxPointer._border.queue_repaint();
        
        if(setAlignment)
            this.setMenuPositionAlignment();     
    }

    forceMenuLocation(){
        let layout = this._settings.get_enum('menu-layout');
        let forcedMenuLocation = this._settings.get_enum('force-menu-location');
        if(layout === Constants.MenuLayout.RUNNER || layout === Constants.MenuLayout.RAVEN)
            return;

        if(forcedMenuLocation === Constants.ForcedMenuLocation.OFF){
            this.arcMenu.sourceActor = this;
            this.arcMenu.focusActor = this;
            this.arcMenu._boxPointer.setPosition(this, 0.5);
            this.setMenuPositionAlignment();
            this._forcedMenuLocation = false;
            return;
        }

        if(!this.rise){
            let themeNode = this.arcMenu.actor.get_theme_node();
            this.rise = themeNode.get_length('-arrow-rise');
        }

        if(!this.dummyWidget){
            this.dummyWidget = new St.Widget({ width: 0, height: 0, opacity: 0 });
            Main.uiGroup.add_actor(this.dummyWidget);
        }

        if(!this._forcedMenuLocation){
            this.arcMenu.sourceActor = this.dummyWidget;
            this.arcMenu.focusActor = this.dummyWidget;
            this.arcMenu._boxPointer.setPosition(this.dummyWidget, 0.5);

            this.arcMenu.actor.style = "-arrow-base: 0px; -arrow-rise: 0px;";
            this.arcMenu._boxPointer.setSourceAlignment(0.5);
            this.arcMenu._arrowAlignment = 0.5;
            this._forcedMenuLocation = true;
        }

        let monitorIndex = Main.layoutManager.findIndexForActor(this);
        let rect = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);

        //Position the runner menu in the center of the current monitor, at top of screen.
        let positionX = Math.round(rect.x + (rect.width / 2));
        let positionY;
        if(forcedMenuLocation === Constants.ForcedMenuLocation.TOP_CENTERED)
            positionY = rect.y + this.rise;
        else if(forcedMenuLocation === Constants.ForcedMenuLocation.BOTTOM_CENTERED)
            positionY = rect.y + rect.height - this.rise;
        this.dummyWidget.set_position(positionX, positionY);
    }

    updateStyle(){
        let forcedMenuLocation = this._settings.get_enum('force-menu-location');
        let removeMenuArrow = this._settings.get_boolean('remove-menu-arrow');   
        let layout = this._settings.get_enum('menu-layout');
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
        let gapAdjustment = this._settings.get_int('gap-adjustment');

        this.arcMenu.actor.set_style_class_name(null);
        this.arcMenu.actor.style_class = customStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.arcMenu.actor.add_style_class_name(customStyle ? 'arc-menu' : 'popup-menu');
        
        this.arcMenuContextMenu.actor.set_style_class_name(null);
        this.arcMenuContextMenu.actor.style_class = customStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.arcMenuContextMenu.actor.add_style_class_name(customStyle ? 'arc-menu' : 'popup-menu');

        if(removeMenuArrow){
            this.arcMenu.actor.style = "-arrow-base:0px; -arrow-rise:0px; -boxpointer-gap: " + gapAdjustment + "px;";
            this.arcMenu.box.style = "margin:0px;";
        }  
        else if(layout !== Constants.MenuLayout.RAVEN && forcedMenuLocation === Constants.ForcedMenuLocation.OFF){
            this.arcMenu.actor.style = "-boxpointer-gap: " + gapAdjustment + "px;";
            this.arcMenu.box.style = null;
        }
        if(this.MenuLayout)
            this.MenuLayout.updateStyle();   
    }
    updateSearch(){
        if(this.MenuLayout)
            this.MenuLayout.updateSearch();
    }
    setSensitive(sensitive) {
        this.reactive = sensitive;
        this.can_focus = sensitive;
        this.track_hover = sensitive;
    }
    vfunc_event(event){
        if (event.type() === Clutter.EventType.BUTTON_PRESS){   
            if(event.get_button() == 1){   
                this.toggleMenu();
            }    
            else if(event.get_button() == 3){                   
                this.arcMenuContextMenu.toggle();	                	
            }    
        }
        else if(event.type() === Clutter.EventType.TOUCH_BEGIN){         
            this.toggleMenu();       
        }
        else if(event.type() === Clutter.EventType.ENTER && this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH){
            this.menuButtonWidget.actor.add_style_pseudo_class('selected');
            this.menuButtonWidget._icon.add_style_pseudo_class('active');
        }
        else if(event.type() === Clutter.EventType.LEAVE && this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH){
            if(!this.arcMenu.isOpen && !this.arcMenuContextMenu.isOpen){
                this.menuButtonWidget.actor.remove_style_pseudo_class('selected');
                this.menuButtonWidget._icon.remove_style_pseudo_class('active');
            }
        }
        return Clutter.EVENT_PROPAGATE;
    }

    toggleMenu(){
        if(this.contextMenuManager.activeMenu)
            this.contextMenuManager.activeMenu.toggle();
        if(this.subMenuManager.activeMenu)
            this.subMenuManager.activeMenu.toggle();
        this.forceMenuLocation();
        let layout = this._settings.get_enum('menu-layout');
        if(layout === Constants.MenuLayout.GNOME_OVERVIEW){
            if(this._settings.get_boolean('gnome-dash-show-applications') && !Main.overview.visible){
                Main.overview.viewSelector._showAppsButton.checked = true;
                Main.overview.toggle();
            }
            else if(this._settings.get_boolean('gnome-dash-show-applications') && Main.overview.visible && !Main.overview.viewSelector._showAppsButton.checked)
                Main.overview.viewSelector._showAppsButton.checked = true;
            else
                Main.overview.toggle();
        }
        else{
            if(layout === Constants.MenuLayout.RUNNER || layout === Constants.MenuLayout.RAVEN)
                this.MenuLayout.updateLocation();
            if(this.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL){
                if(this.dtpPanel && !this.arcMenu.isOpen){
                    if(this.dtpPanel.intellihide && this.dtpPanel.intellihide.enabled)
                        this.dtpPanel.intellihide._revealPanel(true);
                    else if(!this.dtpPanel.panelBox.visible){
                        this.dtpPanel.panelBox.visible = true;
                        this.dtpNeedsHiding = true;
                    }
                }
                else if(this._panel === Main.panel && !Main.layoutManager.panelBox.visible && !this.arcMenu.isOpen){
                    Main.layoutManager.panelBox.visible = true;
                    this.mainPanelNeedsHiding = true;
                }
            }
            else if(this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH){
                if(this.dash.getDockState() === 0)
                    this.dash._animateIn(0, 0);
                else if(!this.dash.visible && !this.arcMenu.isOpen){
                    this.dash.visible = true;
                    this.dtdNeedsHiding = true;
                }
            }
            this.arcMenu.toggle();
            if(this.arcMenu.isOpen){
                this.mainBox.grab_key_focus();
            }
        }
    }

    getActiveMenu(){
        if(this.contextMenuManager.activeMenu)
            return this.contextMenuManager.activeMenu;
        else if(this.subMenuManager.activeMenu)
            return this.subMenuManager.activeMenu;
        else if(this.arcMenu.isOpen)
            return this.arcMenu;
        else if(this.arcMenuContextMenu.isOpen)
            return this.arcMenuContextMenu;
        else
            return null;
    }

    toggleArcMenuContextMenu(){
        if(this.arcMenuContextMenu.isOpen)
            this.arcMenuContextMenu.toggle();   
    }

    updateHeight(){
        let layout = this._settings.get_enum('menu-layout');

        let monitorIndex = Main.layoutManager.findIndexForActor(this);
        let scaleFactor = Main.layoutManager.monitors[monitorIndex].geometry_scale;
        let monitorWorkArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);
        let height = Math.round(this._settings.get_int('menu-height') / scaleFactor);
    
        if(height > monitorWorkArea.height){
            height = (monitorWorkArea.height * 8) / 10;
        }
        
        if(!(layout == Constants.MenuLayout.SIMPLE || layout == Constants.MenuLayout.SIMPLE_2 || layout == Constants.MenuLayout.RUNNER) && this.MenuLayout)
            this.mainBox.style = `height: ${height}px`;
    }

    _onDestroy(){
        if (this._iconThemeChangedId){
            St.TextureCache.get_default().disconnect(this._iconThemeChangedId);
            this._iconThemeChangedId = null;
        }
        if (this._monitorsChangedId){
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }
        if (this._startupCompleteId){
            Main.layoutManager.disconnect(this._startupCompleteId);
            this._startupCompleteId = null;
        }
        if(this.reloadID){
            GLib.source_remove(this.reloadID);
            this.reloadID = null;
        }
        if(this.createLayoutID){
            GLib.source_remove(this.createLayoutID);
            this.createLayoutID = null;
        }
        if(this.updateMenuLayoutID){
            GLib.source_remove(this.updateMenuLayoutID);
            this.updateMenuLayoutID = null;
        }
        if (this.tooltipShowingID) {
            GLib.source_remove(this.tooltipShowingID);
            this.tooltipShowingID = null;
        }     
        if (this.tooltipHidingID) {
            GLib.source_remove(this.tooltipHidingID);
            this.tooltipHidingID = null;
        }   
        if(this.MenuLayout)
            this.MenuLayout.destroy();

        if(this.extensionChangedId){
            Main.extensionManager.disconnect(this.extensionChangedId);
            this.extensionChangedId = null;
        }
        if(this.dtpPostionChangedID && this.extensionSettingsItem){
            this.extensionSettingsItem.disconnect(this.dtpPostionChangedID);
            this.dtpPostionChangedID = null;
        }
        if(this.dtdPostionChangedID && this._panel._settings){
            this._panel._settings.disconnect(this.dtdPostionChangedID);
            this.dtdPostionChangedID = null;
        }
        if(this._installedChangedId){
            appSys.disconnect(this._installedChangedId);
            this._installedChangedId = null;
        }
        if(this.dummyWidget)
            this.dummyWidget.destroy();
        if(this.arcMenu){
            this.arcMenu.destroy();
        }
        if(this.arcMenuContextMenu){
            this.arcMenuContextMenu.destroy();
        }
        super._onDestroy();
    }

    updateMenuLayout(){
        this.tooltipShowing = false;
        if (this.tooltipShowingID) {
            GLib.source_remove(this.tooltipShowingID);
            this.tooltipShowingID = null;
        }     
        if (this.tooltipHidingID) {
            GLib.source_remove(this.tooltipHidingID);
            this.tooltipHidingID = null;
        }    
        if(this.MenuLayout){
            this.MenuLayout.destroy();
            this.MenuLayout = null;
        }
        this.arcMenu.removeAll();
        this.updateMenuLayoutID = GLib.timeout_add(0, 100, () => {
            this.createMenuLayout();
            this.updateMenuLayoutID = null;
            return GLib.SOURCE_REMOVE;
        });  
    }

    loadExtraPinnedApps(){
        if(this.MenuLayout)
            this.MenuLayout.loadExtraPinnedApps();
    }

    updateLocation(){
        if(this.MenuLayout)
            this.MenuLayout.updateLocation();
    }

    updateIcons(){
        if(this.MenuLayout)
            this.MenuLayout.updateIcons();
    }

    _loadCategories(){
        if(this.MenuLayout)
            this.MenuLayout.loadCategories();
    }

    _clearApplicationsBox() {
        if(this.MenuLayout)
            this.MenuLayout.clearApplicationsBox();
    }

    _displayCategories() {
        if(this.MenuLayout)
            this.MenuLayout.displayCategories();
    }

    displayPinnedApps() {
        if(this.MenuLayout)
            this.MenuLayout.displayPinnedApps();
    }

    loadPinnedApps() {
        if(this.MenuLayout)
            this.MenuLayout.loadPinnedApps();
    }

    _displayAllApps() {
        if(this.MenuLayout)
            this.MenuLayout.displayAllApps();
    }

    selectCategory(dir) {
        if(this.MenuLayout)
            this.MenuLayout.selectCategory(dir);
    }

    _setActiveCategory(){
        if(this.MenuLayout)
            this.MenuLayout.setActiveCategory();
    }

    scrollToButton(button){
        if(this.MenuLayout)
            this.MenuLayout.scrollToButton(button);
    }

    reload(){
        if(this.MenuLayout){
            if(this.arcMenu.isOpen){
                this.MenuLayout.needsReload = true;
            }
            else{
                this.MenuLayout.needsReload = false;
                this.MenuLayout.reload();
            }
        }
    }

    shouldLoadPinnedApps(){
        if(this.MenuLayout)
            return this.MenuLayout.shouldLoadPinnedApps;
    }

    resetSearch(){
        if(this.MenuLayout)
            this.MenuLayout.resetSearch();
    }

    setDefaultMenuView(){
        if(this.MenuLayout)
            this.MenuLayout.setDefaultMenuView();
    }

    _onOpenStateChanged(menu, open) {
        if(open){
            //Avoid Super L hotkey conflicts with Pop Shell extension by 
            //setting 'overlay-key' mode  to  Shell.ActionMode.ALL.
            let hotKeyPos = this._settings.get_enum('menu-hotkey');
            if(hotKeyPos === Constants.HotKey.SUPER_L)
                Main.wm.allowKeybinding('overlay-key', Shell.ActionMode.ALL);

            if(this.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL){
                this.menuButtonWidget.setActiveStylePseudoClass(true);
                this.add_style_pseudo_class('active');
                
                if(Main.panel.menuManager && Main.panel.menuManager.activeMenu)
                    Main.panel.menuManager.activeMenu.toggle();
            }
            else if(this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH){
                this.dash._fixedIsEnabled = true;
                this.dash._autohideIsEnabled = false;
                this.dash._updateDashVisibility();
                this.menuButtonWidget.actor.add_style_pseudo_class('selected');
                this.menuButtonWidget._icon.add_style_pseudo_class('active');
            }
        }      
        else{ 
            if(this.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL){
                if(this.dtpPanel && this.dtpNeedsRelease){
                    this.dtpNeedsRelease = false;
                    this.dtpPanel.intellihide ? this.dtpPanel.intellihide.release(2) : null;
                }
                if(this.dtpPanel && this.dtpNeedsHiding){
                    this.dtpNeedsHiding = false;
                    this.dtpPanel.panelBox.visible = false;
                }
                if(this.mainPanelNeedsHiding){
                    Main.layoutManager.panelBox.visible = false;
                    this.mainPanelNeedsHiding = false;
                }
                if(!this.arcMenu.isOpen && !this.arcMenuContextMenu.isOpen){
                    this.menuButtonWidget.setActiveStylePseudoClass(false);
                    this.remove_style_pseudo_class('active');
                }
            }
            else if(this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH){
                if(!this.arcMenu.isOpen && !this.arcMenuContextMenu.isOpen){
                    this.menuButtonWidget.actor.remove_style_pseudo_class('selected');
                    if(this.dtdNeedsHiding){
                        this.dash.visible = false;
                        this.dtdNeedsHiding = false;
                    }
                    else{
                        this.dash._updateVisibilityMode();
                        this.dash._updateDashVisibility();
                    }
                    if(!this.menuButtonWidget.actor.hover)
                        this.menuButtonWidget._icon.remove_style_pseudo_class('active');
                }
            }
        }
    }
});

var ArcMenu = class Arc_Menu_ArcMenu extends PopupMenu.PopupMenu{
    constructor(sourceActor, arrowAlignment, arrowSide) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._settings = sourceActor._settings;
        this._menuButton = sourceActor;
        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();
        this._boxPointer.set_offscreen_redirect(Clutter.OffscreenRedirect.ON_IDLE);
        this._menuCloseID = this.connect('menu-closed', () => this._onCloseEvent());
        this.connect('destroy', () => this._onDestroy());
    }

    open(animation){
        if(this._menuButton.dtpPanel && !this._menuButton.dtpNeedsRelease && this._menuButton.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL){
            this._menuButton.dtpNeedsRelease = true;
            this._menuButton.dtpPanel.intellihide ? this._menuButton.dtpPanel.intellihide.revealAndHold(2) : null;
        }
        this._onOpenEvent();
        super.open(animation);
    }

    close(animation){
        if(this._menuButton.contextMenuManager.activeMenu)
            this._menuButton.contextMenuManager.activeMenu.toggle();
        if(this._menuButton.subMenuManager.activeMenu)
            this._menuButton.subMenuManager.activeMenu.toggle();
        super.close(animation);
    }

    _onOpenEvent(){
        this._menuButton.arcMenu.actor._muteInput = false;
        if(this._menuButton.MenuLayout && this._menuButton.MenuLayout.needsReload){
            this._menuButton.MenuLayout.reload();
            this._menuButton.MenuLayout.needsReload = false;
        } 
    }

    _onCloseEvent(){
        if(this._menuButton.MenuLayout && this._menuButton.MenuLayout.isRunning){
            if(this._menuButton.MenuLayout.needsReload){
                this._menuButton.MenuLayout.reload();
                this._menuButton.MenuLayout.needsReload = false;
            }
            this._menuButton.setDefaultMenuView();
        }
    }

    _onDestroy(){
        if(this._menuCloseID){
            this.disconnect(this._menuCloseID)
            this._menuCloseID = null;
        }
    }
};

var ArcMenuContextMenu = class Arc_Menu_ArcMenuContextMenu extends PopupMenu.PopupMenu {
    constructor(sourceActor, arrowAlignment, arrowSide) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._settings = sourceActor._settings;
        this._menuButton = sourceActor;
        this.extensionSettingsItem = false;
        
        this.actor.add_style_class_name('panel-menu');
        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();

        this.addMenuItem(this.createQuickLinkItem(_("ArcMenu Settings"), Constants.PrefsVisiblePage.MAIN));

        let item = new PopupMenu.PopupSeparatorMenuItem();
        item._separator.style_class = 'arc-menu-sep';
        this.addMenuItem(item);

        item = new PopupMenu.PopupMenuItem(_("Settings Quick Links:"), { 
            activate: false,
            reactive: false
        });
        this.addMenuItem(item);

        this.addMenuItem(this.createQuickLinkItem(_("Change Menu Layout"), Constants.PrefsVisiblePage.MENU_LAYOUT));
        this.addMenuItem(this.createQuickLinkItem(_("Modify Pinned Apps"), Constants.PrefsVisiblePage.PINNED_APPS));
        this.addMenuItem(this.createQuickLinkItem(_("Modify Shortcuts"), Constants.PrefsVisiblePage.SHORTCUTS));
        this.addMenuItem(this.createQuickLinkItem(_("Layout Tweaks"), Constants.PrefsVisiblePage.LAYOUT_TWEAKS));
        this.addMenuItem(this.createQuickLinkItem(_("Button Appearance"), Constants.PrefsVisiblePage.BUTTON_APPEARANCE));

        item = new PopupMenu.PopupSeparatorMenuItem();
        item._separator.style_class = 'arc-menu-sep';
        this.addMenuItem(item);

        this.addMenuItem(this.createQuickLinkItem(_("About"), Constants.PrefsVisiblePage.ABOUT));
    }

    open(animation){
        if(this._menuButton.dtpPanel && !this._menuButton.dtpNeedsRelease && this._menuButton.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL){
            this._menuButton.dtpNeedsRelease = true;
            this._menuButton.dtpPanel.intellihide ? this._menuButton.dtpPanel.intellihide.revealAndHold(2) : null;
        }
        super.open(animation);
    }

    addExtensionSettings(arcMenuPlacement){
        if(!this.extensionSettingsItem){
            let extensionCommand, extensionName;
            if(arcMenuPlacement === Constants.ArcMenuPlacement.PANEL){
                extensionName = _("Dash to Panel Settings");
                extensionCommand = 'gnome-extensions prefs ' + DASH_TO_PANEL_UUID; 
            }
            else if(arcMenuPlacement === Constants.ArcMenuPlacement.DASH){
                let dashToDock = Main.extensionManager.lookup(DASH_TO_DOCK_UUID);
                let ubuntuDash = Main.extensionManager.lookup(UBUNTU_DOCK_UUID);
                if(dashToDock && dashToDock.stateObj && dashToDock.stateObj.dockManager){
                    extensionName = _("Dash to Dock Settings");
                    extensionCommand = 'gnome-extensions prefs ' + DASH_TO_DOCK_UUID;
                }
                if(ubuntuDash && ubuntuDash.stateObj && ubuntuDash.stateObj.dockManager){
                    extensionName = _("Ubuntu Dock Settings");
                    extensionCommand = 'gnome-control-center ubuntu'; 
                }
            }

            let item = new PopupMenu.PopupMenuItem(_(extensionName));
            item.connect('activate', ()=>{
                Util.spawnCommandLine(extensionCommand);
            });
            this.addMenuItem(item, 1);
            this.extensionSettingsItem = true;
        }
    }

    removeExtensionSettings(){
        let children = this._getMenuItems();
        children[1].destroy();
        this.extensionSettingsItem = false;
    }

    createQuickLinkItem(title, prefsVisiblePage){
        let item = new PopupMenu.PopupMenuItem(_(title));    
        item.connect('activate', ()=>{
            this._settings.set_int('prefs-visible-page', prefsVisiblePage);
            Util.spawnCommandLine(Constants.ArcMenuSettingsCommand);
        });
        return item;
    }
};
