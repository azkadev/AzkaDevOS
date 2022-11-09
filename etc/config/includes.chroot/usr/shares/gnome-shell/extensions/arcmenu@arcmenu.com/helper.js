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
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Gio, GObject, Gtk, Meta, Shell} = imports.gi;
const Constants = Me.imports.constants;
const Main = imports.ui.main;
const Util = imports.misc.util;

const MUTTER_SCHEMA = 'org.gnome.mutter';
const WM_KEYBINDINGS_SCHEMA = 'org.gnome.desktop.wm.keybindings';

var MenuHotKeybinder = class {
    constructor(menuToggler) {
        this._settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);
        this._menuToggler = menuToggler;

        this.hotKeyEnabled = false;
        this._ignoreHotKeyChangedEvent = false;

        this._mutterSettings = new Gio.Settings({ 'schema': MUTTER_SCHEMA });
        this._wmKeybindings = new Gio.Settings({ 'schema': WM_KEYBINDINGS_SCHEMA });

        this._oldPanelMainMenuKey = this._wmKeybindings.get_value('panel-main-menu');
        this._oldOverlayKey = this._mutterSettings.get_value('overlay-key');

        this._overlayKeyChangedID = this._mutterSettings.connect('changed::overlay-key', () => {
            if(!this._ignoreHotKeyChangedEvent)
                this._oldOverlayKey = this._mutterSettings.get_value('overlay-key');
        });

        this._panelMainMenuKeyConnectID = this._wmKeybindings.connect('changed::panel-main-menu', () => {
            if(!this._ignoreHotKeyChangedEvent)
                this._oldPanelMainMenuKey = this._wmKeybindings.get_value('panel-main-menu');
        });

        this._mainStartUpComplete = Main.layoutManager.connect('startup-complete', () => this._setHotKey());
    }

    enableHotKey(hotKey){
        this._ignoreHotKeyChangedEvent = true;

        if(hotKey === Constants.SUPER_L){
            this._mutterSettings.set_string('overlay-key', hotKey);
            Main.wm.allowKeybinding('overlay-key', Shell.ActionMode.NORMAL |
                Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP);
        }
        else if(hotKey === Constants.SUPER_R){
            this._wmKeybindings.set_strv('panel-main-menu', [hotKey]);
        }

        this.hotKeyEnabled =  true;
        if(!Main.layoutManager._startingUp)
            this._setHotKey();
        this._ignoreHotKeyChangedEvent = false;
    }

    disableHotKey(){
        this._ignoreHotKeyChangedEvent = true;
        this._mutterSettings.set_value('overlay-key', this._oldOverlayKey);
        if(this.overlayKeyID){
            global.display.disconnect(this.overlayKeyID);
            this.overlayKeyID = null;
        }
        if(this.defaultOverlayKeyID){
            GObject.signal_handler_unblock(global.display, this.defaultOverlayKeyID);
            this.defaultOverlayKeyID = null;
        }
        Main.wm.allowKeybinding('overlay-key', Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW);
        
        this._wmKeybindings.set_value('panel-main-menu', this._oldPanelMainMenuKey);
        Main.wm.setCustomKeybindingHandler('panel-main-menu', Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                                            Main.sessionMode.hasOverview ? Main.overview.toggle.bind(Main.overview) : null);
        this.hotKeyEnabled = false;
        this._ignoreHotKeyChangedEvent = false;
    }

    _setHotKey(){
        let hotKeyPos = this._settings.get_enum('menu-hotkey');
        if(this.hotKeyEnabled){
            if(hotKeyPos === Constants.HotKey.SUPER_L){
                Main.wm.allowKeybinding('overlay-key', Shell.ActionMode.NORMAL |
                Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP);
    
                //Find signal ID in Main.js that connects 'overlay-key' to global.display and toggles Main.overview
                let [bool,signal_id, detail] = GObject.signal_parse_name('overlay-key', global.display, true);
                this.defaultOverlayKeyID = GObject.signal_handler_find(global.display, GObject.SignalMatchType.ID, signal_id, detail, null, null, null); 
    
                //If signal ID found, block it and connect new 'overlay-key' to toggle ArcMenu.
                if(this.defaultOverlayKeyID){
                    GObject.signal_handler_block(global.display, this.defaultOverlayKeyID);
                    this.overlayKeyID = global.display.connect('overlay-key', () => {
                        this._menuToggler();
                    });
                }
                else
                    global.log("ArcMenu ERROR - Failed to set Super_L hotkey");
            }
            else if(hotKeyPos === Constants.HotKey.SUPER_R){
                Main.wm.setCustomKeybindingHandler('panel-main-menu', Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
                                                    this._menuToggler.bind(this));
            }
        }   
    }

    destroy() {
        if(this._overlayKeyChangedID){
            this._mutterSettings.disconnect(this._overlayKeyChangedID);
            this._overlayKeyChangedID = null;
        }
        if(this._panelMainMenuKeyConnectID){
            this._wmKeybindings.disconnect(this._panelMainMenuKeyConnectID);
            this._panelMainMenuKeyConnectID = null;
        }
        this.disableHotKey();
        if (this._mainStartUpComplete) {
            Main.layoutManager.disconnect(this._mainStartUpComplete);
            this._mainStartUpComplete = null;
        }
    }
};

var KeybindingManager = class {
    constructor(settings) {
        this._settings = settings;
        this._keybindings = new Map();
    }

    bind(keybindingNameKey, keybindingValueKey, keybindingHandler) {
        if (!this._keybindings.has(keybindingNameKey)) {
            this._keybindings.set(keybindingNameKey, keybindingValueKey);
            let keybinding = this._settings.get_string(keybindingNameKey);
            this._setKeybinding(keybindingNameKey, keybinding);

            Main.wm.addKeybinding(keybindingValueKey, this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
                keybindingHandler.bind(this));

            return true;
        }
        return false;
    }

    _setKeybinding(keybindingNameKey, keybinding) {
        if (this._keybindings.has(keybindingNameKey)) {
            let keybindingValueKey = this._keybindings.get(keybindingNameKey);
            let [key, mods] = Gtk.accelerator_parse(keybinding);

            if (Gtk.accelerator_valid(key, mods)) {
                let shortcut = Gtk.accelerator_name(key, mods);
                this._settings.set_strv(keybindingValueKey, [shortcut]);
            } else {
                this._settings.set_strv(keybindingValueKey, []);
            }
        }
    }

    unbind(keybindingNameKey) {
        if (this._keybindings.has(keybindingNameKey)) {
            let keybindingValueKey = this._keybindings.get(keybindingNameKey);
            Main.wm.removeKeybinding(keybindingValueKey);
            this._keybindings.delete(keybindingNameKey);
            return true;
        }
        return false;
    }

    destroy() {
        let keyIter = this._keybindings.keys();
        for (let i = 0; i < this._keybindings.size; i++) {
            let keybindingNameKey = keyIter.next().value;
            this.unbind(keybindingNameKey);
        }
    }
};

var HotCornerManager = class {
    constructor(settings, menuToggler) {
        this._settings = settings;
        this._menuToggler = menuToggler;
        this._hotCornersChangedId = Main.layoutManager.connect('hot-corners-changed', this._redisableHotCorners.bind(this));
    }

    _redisableHotCorners() {
        let hotCornerAction = this._settings.get_enum('hot-corners');
        if(hotCornerAction == Constants.HotCornerAction.DISABLED) {
            this.disableHotCorners();
        }
        else if(hotCornerAction == Constants.HotCornerAction.TOGGLE_ARCMENU) {
            this.modifyHotCorners();
        }
        else if(hotCornerAction == Constants.HotCornerAction.CUSTOM) {
            this.modifyHotCorners();
        }
    }

    _getHotCorners() {
        return Main.layoutManager.hotCorners;
    }

    restoreDefaultHotCorners() {
        Main.layoutManager._updateHotCorners();
    }

    disableHotCorners() {
        let hotCorners = this._getHotCorners();
        hotCorners.forEach((corner) => {
            if(corner){
                corner._toggleOverview = () => { };
                corner._pressureBarrier._trigger = () => { };
            }
        });
    }

    modifyHotCorners() {
        let hotCorners = this._getHotCorners();
        let hotCornerAction = this._settings.get_enum('hot-corners');

        hotCorners.forEach((corner) => {
            if (corner) {
                corner._toggleOverview = () => { };
                corner._pressureBarrier._trigger = () => { 
                    corner._pressureBarrier._isTriggered = true;
                    if(corner._ripples)
                        corner._ripples.playAnimation(corner._x, corner._y);
                    else
                        corner._rippleAnimation();
                    if(hotCornerAction == Constants.HotCornerAction.TOGGLE_ARCMENU)
                        this._menuToggler(); 
                    else if(hotCornerAction == Constants.HotCornerAction.CUSTOM){
                        let cmd = this._settings.get_string('custom-hot-corner-cmd');
                        if(cmd == "ArcMenu_ShowAllApplications")
                            Main.overview.viewSelector._toggleAppsPage();
                        else if(cmd == "ArcMenu_RunCommand")
                            Main.openRunDialog();
                        else
                            Util.spawnCommandLine(this._settings.get_string('custom-hot-corner-cmd'));
                    }
                    corner._pressureBarrier._reset();
                };
            }
        });
    }

    destroy() {
        if (this._hotCornersChangedId>0) {
            Main.layoutManager.disconnect(this._hotCornersChangedId);
            this._hotCornersChangedId = 0;
        }

        this.restoreDefaultHotCorners();
    }
};
