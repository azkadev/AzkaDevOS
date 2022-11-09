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

// Import Libraries
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Atk, Clutter, Gio, GLib, GMenu, GObject, Gtk, Shell, St} = imports.gi;
const AccountsService = imports.gi.AccountsService;
const AppFavorites = imports.ui.appFavorites;
const Constants = Me.imports.constants;
const Dash = imports.ui.dash;
const DND = imports.ui.dnd;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Signals = imports.signals;
const _SystemActions = imports.misc.systemActions;
const SystemActions = _SystemActions.getDefault();
const Util = imports.misc.util;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;
const { loadInterfaceXML } = imports.misc.fileUtils;

const ClocksIntegrationIface = loadInterfaceXML('org.gnome.Shell.ClocksIntegration');
const ClocksProxy = Gio.DBusProxy.makeProxyWrapper(ClocksIntegrationIface);

const SWITCHEROO_BUS_NAME = 'net.hadess.SwitcherooControl';
const SWITCHEROO_OBJECT_PATH = '/net/hadess/SwitcherooControl';

const SwitcherooProxyInterface = '<node> \
<interface name="net.hadess.SwitcherooControl"> \
  <property name="HasDualGpu" type="b" access="read"/> \
  <property name="NumGPUs" type="u" access="read"/> \
  <property name="GPUs" type="aa{sv}" access="read"/> \
</interface> \
</node>';

Gio._promisify(Gio._LocalFilePrototype, 'query_info_async', 'query_info_finish');
Gio._promisify(Gio._LocalFilePrototype, 'set_attributes_async', 'set_attributes_finish');

const SwitcherooProxy = Gio.DBusProxy.makeProxyWrapper(SwitcherooProxyInterface);

const LARGE_ICON_SIZE = 34;
const MEDIUM_ICON_SIZE = 25;
const INDICATOR_ICON_SIZE = 18;
const SMALL_ICON_SIZE = 16;
const USER_AVATAR_SIZE = 28;

function activatePowerOption(powerType){
    if(powerType === Constants.PowerType.POWER_OFF)
        SystemActions.activatePowerOff();
    else if(powerType === Constants.PowerType.RESTART)
        SystemActions.activateRestart ? SystemActions.activateRestart() : SystemActions.activatePowerOff();
    else if(powerType === Constants.PowerType.LOCK)
        SystemActions.activateLockScreen();
    else if(powerType === Constants.PowerType.LOGOUT)
        SystemActions.activateLogout();
    else if(powerType === Constants.PowerType.SUSPEND)
        SystemActions.activateSuspend();
    else if(powerType === Constants.PowerType.HYBRID_SLEEP)
        Utils.activateHybridSleep();
    else if(powerType === Constants.PowerType.HIBERNATE)
        Utils.activateHibernate();
}

var ApplicationContextItems = GObject.registerClass({
    Signals: {
        'close-context-menu': { },
    },

},   class Arc_Menu_ApplicationContextItems extends St.BoxLayout{
    _init(actor, app, menuLayout){
        super._init({
            vertical: true,
            x_expand: true,
            y_expand: true,
        });
        this._menuLayout = menuLayout;
        this._settings = menuLayout._settings;
        this._menuButton = menuLayout.menuButton;
        this._app = app;
        this.sourceActor = actor;
        this.layout = this._settings.get_enum('menu-layout');

        this.discreteGpuAvailable = false;
        Gio.DBus.system.watch_name(SWITCHEROO_BUS_NAME,
            Gio.BusNameWatcherFlags.NONE,
            this._switcherooProxyAppeared.bind(this),
            () => {
                this._switcherooProxy = null;
                this._updateDiscreteGpuAvailable();
            });
    }

    set path(path){
        this._path = path;
    }
    
    _updateDiscreteGpuAvailable() {
        if (!this._switcherooProxy)
            this.discreteGpuAvailable = false;
        else
            this.discreteGpuAvailable = this._switcherooProxy.HasDualGpu;
    }

    _switcherooProxyAppeared() {
        this._switcherooProxy = new SwitcherooProxy(Gio.DBus.system, SWITCHEROO_BUS_NAME, SWITCHEROO_OBJECT_PATH,
            (proxy, error) => {
                if (error) {
                    log(error.message);
                    return;
                }
                this._updateDiscreteGpuAvailable();
            });
    }

    closeMenus(){
        this.close();
        this._menuLayout.arcMenu.toggle();
    }

    close(){
        this.emit('close-context-menu');
    }

    rebuildItems(){
        this.destroy_all_children();
        if(this._app instanceof Shell.App){
            this.appInfo = this._app.get_app_info();
            let actions = this.appInfo.list_actions();
            
            let windows = this._app.get_windows().filter(
                w => !w.skip_taskbar
            );

            if (windows.length > 0){    
                let item = new PopupMenu.PopupMenuItem(_("Current Windows:"), {
                    reactive: false,
                    can_focus: false
                });
                item.actor.add_style_class_name('inactive');  
                this.add_actor(item);

                windows.forEach(window => {
                    let title = window.title ? window.title
                                            : this._app.get_name();
                    let item = this._appendMenuItem(title);
                    item.connect('activate', () => {
                        this.closeMenus();
                        Main.activateWindow(window);                        
                    });
                });
                this._appendSeparator();
            }

            if (!this._app.is_window_backed()) {
                if (this._app.can_open_new_window() && !actions.includes('new-window')) {
                    let newWindowItem = this._appendMenuItem(_("New Window"));
                    newWindowItem.connect('activate', () => {
                        this.closeMenus();
                        this._app.open_new_window(-1);
                    });  
                }
                if (this.discreteGpuAvailable && this._app.state == Shell.AppState.STOPPED &&
                    !actions.includes('activate-discrete-gpu')) {
                    this._onDiscreteGpuMenuItem = this._appendMenuItem(_("Launch using Dedicated Graphics Card"));
                    this._onDiscreteGpuMenuItem.connect('activate', () => {
                        this.closeMenus();
                        this._app.launch(0, -1, true);
                    });
                }
    
                for (let i = 0; i < actions.length; i++) {
                    let action = actions[i];
                    let item;
                    if(action === "empty-trash-inactive"){
                        item = new PopupMenu.PopupMenuItem(this.appInfo.get_action_name(action), {reactive:false, can_focus:false});
                        item.actor.add_style_class_name('inactive');  
                        this._appendSeparator();
                        this.add_actor(item);
                    }
                    else if(action === "empty-trash"){
                        this._appendSeparator();
                        item = this._appendMenuItem(this.appInfo.get_action_name(action));
                    }
                    else{
                        item = this._appendMenuItem(this.appInfo.get_action_name(action));
                    }
                    
                    item.connect('activate', (emitter, event) => {
                        this.closeMenus();
                        this._app.launch_action(action, event.get_time(), -1);
                    });
                }
                
                //If Trash Can, we don't want to add the rest of the entries below.
                if(this.appInfo.get_string('Id') === "ArcMenu_Trash")
                    return false;

                let desktopIcons = Main.extensionManager.lookup("desktop-icons@csoriano");
                let desktopIconsNG = Main.extensionManager.lookup("ding@rastersoft.com");
                if((desktopIcons && desktopIcons.stateObj) || (desktopIconsNG && desktopIconsNG.stateObj)){
                    this._appendSeparator();
                    let fileDestination = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
                    let src = Gio.File.new_for_path(this.appInfo.get_filename());
                    let dst = Gio.File.new_for_path(GLib.build_filenamev([fileDestination, src.get_basename()]));
                    let exists = dst.query_exists(null);
                    if(exists) {
                        let item = this._appendMenuItem(_("Delete Desktop Shortcut"));
                        item.connect('activate', () => {
                            if(src && dst){
                                try {
                                    dst.delete(null);
                                } catch (e) {
                                    log(`Failed to delete shortcut: ${e.message}`);
                                }
                            }
                            this.close();
                        });
                    }
                    else {
                        let item = this._appendMenuItem(_("Create Desktop Shortcut"));
                        item.connect('activate', () => {
                            if(src && dst){
                                try {
                                    // copy_async() isn't introspectable :-(
                                    src.copy(dst, Gio.FileCopyFlags.OVERWRITE, null, null);
                                    this._markTrusted(dst);
                                } catch (e) {
                                    log(`Failed to copy to desktop: ${e.message}`);
                                }
                            }
                            this.close();
                        });
                    }
                }

                let canFavorite = global.settings.is_writable('favorite-apps');
                if (canFavorite) {
                    this._appendSeparator();
                    let isFavorite = AppFavorites.getAppFavorites().isFavorite(this._app.get_id());
                    if (isFavorite) {
                        let item = this._appendMenuItem(_("Remove from Favorites"));
                        item.connect('activate', () => {
                            let favs = AppFavorites.getAppFavorites();
                            favs.removeFavorite(this._app.get_id());
                            this.close();
                        });
                    } else {
                        let item = this._appendMenuItem(_("Add to Favorites"));
                        item.connect('activate', () => {
                            let favs = AppFavorites.getAppFavorites();
                            favs.addFavorite(this._app.get_id());
                            this.close();
                        });
                    }
                }

                let pinnedApps = this._settings.get_strv('pinned-app-list');
                let pinnedAppID = [];
                
                //filter pinnedApps list by every 3rd entry in list. 3rd entry contains an appID or command
                for(let i = 2; i < pinnedApps.length; i += 3){
                    pinnedAppID.push(pinnedApps[i]);  
                }
                let isAppPinned = pinnedAppID.find((element) => {
                    return element == this._app.get_id();
                });

                //if app is pinned and menulayout has PinnedApps category, show Unpin from ArcMenu entry
                if(isAppPinned && this._menuLayout.hasPinnedApps) {
                    let item = this._appendMenuItem(_("Unpin from ArcMenu"));
                    item.connect('activate', ()=>{
                        this.close();
                        for(let i = 0; i < pinnedApps.length; i += 3){
                            if(pinnedApps[i + 2] === this._app.get_id()){
                                pinnedApps.splice(i, 3);
                                this._settings.set_strv('pinned-app-list', pinnedApps);
                                break;
                            }
                        }
                    });
                }
                else if(this._menuLayout.hasPinnedApps) {
                    let item = this._appendMenuItem(_("Pin to ArcMenu"));
                    item.connect('activate', ()=>{
                        this.close();
                        pinnedApps.push(this.appInfo.get_display_name());
                        pinnedApps.push('');
                        pinnedApps.push(this._app.get_id());
                        this._settings.set_strv('pinned-app-list',pinnedApps);
                    });
                }
                            
                if (Shell.AppSystem.get_default().lookup_app('org.gnome.Software.desktop')) {
                    this._appendSeparator(); 
                    let item = this._appendMenuItem(_("Show Details"));
                    item.connect('activate', () => {
                        let id = this._app.get_id();
                        let args = GLib.Variant.new('(ss)', [id, '']);
                        Gio.DBus.get(Gio.BusType.SESSION, null, (o, res) => {
                            let bus = Gio.DBus.get_finish(res);
                            bus.call('org.gnome.Software',
                                    '/org/gnome/Software',
                                    'org.gtk.Actions', 'Activate',
                                    GLib.Variant.new('(sava{sv})',
                                                    ['details', [args], null]),
                                    null, 0, -1, null, null);
                            this.closeMenus();
                        });
                    });
                }
            }
        }
        else if(this._path){
            let newWindowItem = this._appendMenuItem(_("Open Folder Location"));
            newWindowItem.connect('activate', () => {
                let file = Gio.File.new_for_path(this._path);
                let context = global.create_app_launch_context(Clutter.get_current_event().get_time(), -1)
                new Promise((resolve, reject) => { 
                    Gio.AppInfo.launch_default_for_uri_async(file.get_uri(), context, null, (o, res) => {
                        try {
                            Gio.AppInfo.launch_default_for_uri_finish(res);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    });
                });
                this.closeMenus();
            });
        }
        else if(this._menuLayout.hasPinnedApps && this.sourceActor instanceof PinnedAppsMenuItem) {  
            let item = this._appendMenuItem(_("Unpin from ArcMenu"));   
            item.connect('activate', () => {
                this.close();
                let pinnedApps = this._settings.get_strv('pinned-app-list');
                for(let i = 0; i < pinnedApps.length; i += 3){
                    if(pinnedApps[i + 2] === this._app){
                        pinnedApps.splice(i, 3);
                        this._settings.set_strv('pinned-app-list', pinnedApps);
                        break;
                    }
                }
            });
        }
    }

    //_markTrusted function borrowed from
    //https://gitlab.gnome.org/GNOME/gnome-shell-extensions/-/tree/master/extensions/apps-menu
    async _markTrusted(file) {
        let modeAttr = Gio.FILE_ATTRIBUTE_UNIX_MODE;
        let trustedAttr = 'metadata::trusted';
        let queryFlags = Gio.FileQueryInfoFlags.NONE;
        let ioPriority = GLib.PRIORITY_DEFAULT;

        try {
            let info = await file.query_info_async(modeAttr, queryFlags, ioPriority, null);

            let mode = info.get_attribute_uint32(modeAttr) | 0o100;
            info.set_attribute_uint32(modeAttr, mode);
            info.set_attribute_string(trustedAttr, 'yes');
            await file.set_attributes_async(info, queryFlags, ioPriority, null);

            // Hack: force nautilus to reload file info
            info = new Gio.FileInfo();
            info.set_attribute_uint64(
                Gio.FILE_ATTRIBUTE_TIME_ACCESS, GLib.get_real_time());
            try {
                await file.set_attributes_async(info, queryFlags, ioPriority, null);
            } catch (e) {
                log(`Failed to update access time: ${e.message}`);
            }
        } catch (e) {
            log(`Failed to mark file as trusted: ${e.message}`);
        }
    }

    _appendSeparator() {
        let alignment = Constants.SeparatorAlignment.HORIZONTAL;
        let hSep = new SeparatorDrawingArea(this._settings, alignment, Constants.SeparatorStyle.MEDIUM,{
            x_expand: true,
            y_expand: false,
            y_align: Clutter.ActorAlign.END
        });
        hSep.queue_repaint();
        hSep._delegate = hSep;
        this.add_actor(hSep);
    }

    _appendMenuItem(labelText) {
        let item = new ArcMenuPopupBaseMenuItem(this._menuLayout);
        this.label = new St.Label({
            text: _(labelText),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        item.add_actor(this.label);
        this.add_actor(item);
        return item;
    }
});

var ApplicationContextMenu = class Arc_Menu_ApplicationContextMenu extends PopupMenu.PopupMenu {
    constructor(actor, app, menuLayout){
        super(actor, 0.0, St.Side.TOP);
        this._menuLayout = menuLayout;
        this._settings = menuLayout._settings;
        this._menuButton = menuLayout.menuButton;
        this._app = app;
        this.layout = this._settings.get_enum('menu-layout');
        this._boxPointer.setSourceAlignment(.20);
        this._boxPointer._border.queue_repaint();
        this.blockSourceEvents = true;
        Main.uiGroup.add_actor(this.actor);
        this._menuLayout.contextMenuManager.addMenu(this);
        this.contextMenuItems = new ApplicationContextItems(actor, app, menuLayout);
        this.contextMenuItems.connect('close-context-menu', () => this.toggle());
        this.contextMenuItems._delegate = this.contextMenuItems;
        this.box.add_actor(this.contextMenuItems);
    }

    centerBoxPointerPosition(){
        this._boxPointer.setSourceAlignment(.50);
        this._arrowAlignment = .5;
        this._boxPointer._border.queue_repaint();
    }

    rightBoxPointerPosition(){
        this._arrowSide = St.Side.LEFT;
        this._boxPointer._arrowSide = St.Side.LEFT;
        this._boxPointer._userArrowSide = St.Side.LEFT;
        this._boxPointer.setSourceAlignment(.50);
        this._arrowAlignment = .5;
        this._boxPointer._border.queue_repaint();
    }

    set path(path){
        this.contextMenuItems.path = path;
    }

    open(animate){
        if(this._menuLayout.searchResults && this._menuLayout.searchResults._highlightDefault)
            this._menuLayout.searchResults.highlightDefault(false);
        if(this._menuButton.tooltipShowingID){
            GLib.source_remove(this._menuButton.tooltipShowingID);
            this._menuButton.tooltipShowingID = null;
            this._menuButton.tooltipShowing = false;
        }
        if(this.sourceActor.tooltip){
            this.sourceActor.tooltip.hide();
            this._menuButton.tooltipShowing = false;
        }
            
        super.open(animate);
    }

    close(animate){
        if(this.sourceActor instanceof SessionButton)
            this.sourceActor.sync_hover();
        super.close(animate);
    }

    rebuildItems(){
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
        if(customStyle){
            this.actor.style_class = 'arc-right-click-boxpointer';
            this.actor.add_style_class_name('arc-right-click');
        }
        else{
            this.actor.style_class = 'popup-menu-boxpointer';
            this.actor.add_style_class_name('popup-menu');   
        }

        this.contextMenuItems.rebuildItems();
    }

    _onKeyPress(actor, event) {
        return Clutter.EVENT_PROPAGATE;
    }
};

var ScrollView = GObject.registerClass(
    class Arc_Menu_ScrollView extends St.ScrollView{
    _init(params){
        super._init(params);
    }
    
    vfunc_style_changed(){
        super.vfunc_style_changed();
        let fade = this.get_effect("fade");
        if(fade)
            fade.set_shader_source(Utils.ScrollViewShader);
    }
});

var ArcMenuPopupBaseMenuItem = GObject.registerClass({
    Properties: {
        'active': GObject.ParamSpec.boolean('active', 'active', 'active',
                                            GObject.ParamFlags.READWRITE,
                                            false),
        'hovered': GObject.ParamSpec.boolean('hovered', 'hovered', 'hovered',
                                            GObject.ParamFlags.READWRITE,
                                            false),                                    
        'sensitive': GObject.ParamSpec.boolean('sensitive', 'sensitive', 'sensitive',
                                               GObject.ParamFlags.READWRITE,
                                               true),
    },
    Signals: {
        'activate': { param_types: [Clutter.Event.$gtype] },
    },

},   class Arc_Menu_PopupBaseMenuItem extends St.BoxLayout{
    _init(menuLayout, params){
        params = imports.misc.params.parse(params, {
            reactive: true,
            activate: true,
            hover: true,
            style_class: null,
            can_focus: true,
        });
        super._init({ style_class: 'popup-menu-item',
                      reactive: params.reactive,
                      track_hover: params.reactive,
                      can_focus: params.can_focus,
                      accessible_role: Atk.Role.MENU_ITEM 
        });
        this.set_offscreen_redirect(Clutter.OffscreenRedirect.ON_IDLE);
        this.hasContextMenu = false;
        this._delegate = this;
        this.needsDestroy = true;
        this._menuLayout = menuLayout;
        this.shouldShow = true;
        this._parent = null;
        this._active = false;
        this._activatable = params.reactive && params.activate;
        this._sensitive = true;

        this._ornamentLabel = new St.Label({ style_class: 'popup-menu-ornament' });
        this.add(this._ornamentLabel);

        this.x_align = Clutter.ActorAlign.FILL;
        this.x_expand = true;
        
        if (!this._activatable)
            this.add_style_class_name('popup-inactive-menu-item');

        if (params.style_class)
            this.add_style_class_name(params.style_class);

        if (params.reactive && params.hover)
            this.bind_property('hover', this, 'hovered', GObject.BindingFlags.SYNC_CREATE);

        if(params.hover)   
            this.actor.connect('notify::hover', this._onHover.bind(this));
        this.actor.connect('destroy', this._onDestroy.bind(this));
    }

    get actor() {
        return this;
    }

    set active(active) {
        let activeChanged = active != this.active;
        if(activeChanged){
            this._active = active;
            if(active){
                this.add_style_pseudo_class('active');
                this._menuLayout.activeMenuItem = this;
                if(this.can_focus)
                    this.grab_key_focus();
            } 
            else{
                this.remove_style_pseudo_class('active');
                this.remove_style_class_name('selected');
                this.set_style_pseudo_class(null);
            }
            this.notify('active');
        }      
    }

    set hovered(hover) {
        let hoverChanged = hover != this.hovered;
        if(hoverChanged){
            if(hover){
                this.add_style_class_name('selected');
            } 
            else{
                this.remove_style_class_name('selected');
            }
        }      
    }

    setShouldShow(){
        //If a saved shortcut link is a desktop app, check if currently installed.
        //Do NOT display if application not found.
        if(this._command.endsWith(".desktop") && !Shell.AppSystem.get_default().lookup_app(this._command)){
            this.shouldShow = false;
        } 
    }

    _onHover() {
        if(this.tooltip==undefined && this.actor.hover && this.label){
            let description = this.description;
            if(this._app)
                description = this._app.get_description();
            Utils.createTooltip(this._menuLayout, this, this.label, description);
        }
    }

    vfunc_button_press_event(){
        let event = Clutter.get_current_event();
        this.pressed = false;
        if(event.get_button() == 1){
            this._menuLayout._blockActivateEvent = false;
            this.pressed = true;
            if(this.hasContextMenu)
                this.contextMenuTimeOut();
        }
        else if(event.get_button() == 3){
            this.pressed = true;
        }
        this.active = true;
        return Clutter.EVENT_PROPAGATE;
    }

    vfunc_button_release_event(){
        let event = Clutter.get_current_event();
        if(event.get_button() == 1 && !this._menuLayout._blockActivateEvent && this.pressed){
            this.pressed = false;
            this.activate(event); 
            if(!(this instanceof CategoryMenuItem))
                this.active = false;
        }
        if(event.get_button() == 3 && this.pressed){
            this.pressed = false;
            if(this.hasContextMenu)
                this.popupContextMenu();
            else if(!(this instanceof CategoryMenuItem)){
                this.active = false;
                this.hovered = true;
            }
        }
        return Clutter.EVENT_PROPAGATE;
    }

    vfunc_key_focus_in() {
        super.vfunc_key_focus_in();
        if(!this.actor.hover)
            this._menuLayout._keyFocusIn(this.actor);
        this.active = true;
    }

    vfunc_key_focus_out() {
        if(this.contextMenu && this.contextMenu.isOpen){
            return;
        }
        super.vfunc_key_focus_out();
        this.active = false;
    }

    activate(event) {
        this.emit('activate', event);
    }

    vfunc_key_press_event(keyEvent) {
        if (!this._activatable)
            return super.vfunc_key_press_event(keyEvent);

        let state = keyEvent.modifier_state;

        // if user has a modifier down (except capslock and numlock)
        // then don't handle the key press here
        state &= ~Clutter.ModifierType.LOCK_MASK;
        state &= ~Clutter.ModifierType.MOD2_MASK;
        state &= Clutter.ModifierType.MODIFIER_MASK;

        if (state)
            return Clutter.EVENT_PROPAGATE;

        let symbol = keyEvent.keyval;
        if ( symbol == Clutter.KEY_Return || symbol == Clutter.KEY_KP_Enter) {
            this.activate(Clutter.get_current_event());
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    vfunc_touch_event(event){
        if(event.type == Clutter.EventType.TOUCH_END && !this._menuLayout._blockActivateEvent && this.pressed){
            this.remove_style_pseudo_class('active');
            this.activate(Clutter.get_current_event());
            this.pressed = false;
            return Clutter.EVENT_STOP;
        }
        else if(event.type == Clutter.EventType.TOUCH_BEGIN && !this._menuLayout.contextMenuManager.activeMenu){
            this.pressed = true;
            this._menuLayout._blockActivateEvent = false;
            if(this.hasContextMenu)
                this.contextMenuTimeOut();
            this.add_style_pseudo_class('active');
        }
        else if(event.type == Clutter.EventType.TOUCH_BEGIN && this._menuLayout.contextMenuManager.activeMenu){
            this.pressed = false;
            this._menuLayout._blockActivateEvent = false;
            this._menuLayout.contextMenuManager.activeMenu.toggle();
        }
        return Clutter.EVENT_PROPAGATE;
    }
    contextMenuTimeOut(){
        this._popupTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
            this.pressed = false;
            this._popupTimeoutId = null;
            if(this.hasContextMenu && this._menuLayout.arcMenu.isOpen && !this._menuLayout._blockActivateEvent) {
                this.popupContextMenu();
                this._menuLayout.contextMenuManager.ignoreRelease();
            }
            return GLib.SOURCE_REMOVE;
        });
    }
    _onDestroy(){
        this.needsDestroy = false;
        if(this.contextMenu){
            Main.uiGroup.remove_actor(this.contextMenu.actor);
            this.contextMenu.destroy();
        }    
    }
});

var SeparatorDrawingArea = GObject.registerClass(class Arc_Menu_SeparatorDrawingArea extends St.DrawingArea {
    _init(settings, alignment, style, params) {
        super._init(params);
        this._settings = settings;
        this._alignment = alignment;
        this._style = style;

        if(this._style === Constants.SeparatorStyle.SHORT)
            this.set_height(15);
        else if(this._style === Constants.SeparatorStyle.LONG)
            this.set_height(10);
        else if(this._style === Constants.SeparatorStyle.MAX)
            this.set_height(1);
        if(this._style === Constants.SeparatorStyle.MEDIUM)
            this.set_height(10);
    }
    vfunc_repaint(){
        let vertSeparatorEnabled = this._settings.get_boolean('vert-separator');
        let isVertical = this._alignment === Constants.SeparatorAlignment.VERTICAL;
        let isShort = this._style === Constants.SeparatorStyle.SHORT;

        let shouldDraw = (vertSeparatorEnabled && isVertical) || !isVertical || (isVertical && isShort);

        if(shouldDraw){
            let cr = this.get_context();
            let [width, height] = this.get_surface_size();
            let color = this._settings.get_string('separator-color')
            let b, stippleColor;   
            [b,stippleColor] = Clutter.Color.from_string(color);   
            let stippleWidth = 1;
            if(this._alignment == Constants.SeparatorAlignment.VERTICAL){
                let x = Math.floor(width / 2) + 0.5;
                if(this._style == Constants.SeparatorStyle.SHORT){
                    cr.moveTo(x,  height / 5);
                    cr.lineTo(x, 4 * height / 5);
                }
                else{
                    cr.moveTo(x,  0.5);
                    cr.lineTo(x, height - 0.5);
                }
            }
            else if (this._alignment == Constants.SeparatorAlignment.HORIZONTAL){
                if(this._style == Constants.SeparatorStyle.SHORT){
                    cr.moveTo(width / 4, height - 7.5);
                    cr.lineTo(3 * width / 4, height - 7.5);
                }
                else if(this._style == Constants.SeparatorStyle.LONG){
                    cr.moveTo(25, height - 4.5);
                    cr.lineTo(width - 25, height - 4.5);
                }
                else if(this._style == Constants.SeparatorStyle.MAX){
                    cr.moveTo(4, 0.5);
                    cr.lineTo(width - 4, 0.5);
                }
                else if(this._style == Constants.SeparatorStyle.MEDIUM){
                    cr.moveTo(width / 5, height - 4.5);
                    cr.lineTo(4 * width / 5, height - 4.5);
                }
            }
            Clutter.cairo_set_source_color(cr, stippleColor);
            cr.setLineWidth(stippleWidth);
            cr.stroke();
            cr.$dispose();
        }
        return false;
    }
});

var ActivitiesMenuItem = GObject.registerClass(class Arc_Menu_ActivitiesMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._icon = new St.Icon({
            icon_name: 'view-fullscreen-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: SMALL_ICON_SIZE
        });
        this.add_actor(this._icon);
        this.label = new St.Label({
            text: _("Activities Overview"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.add_actor(this.label);
    }
    activate(event) {
        this._menuLayout.arcMenu.toggle();
        Main.overview.show();
        super.activate(event);
    }
});

var Tooltip = class Arc_Menu_Tooltip{
    constructor(menuLayout, sourceActor, title, description) {
        this._menuButton = menuLayout.menuButton;
        this._settings = this._menuButton._settings;
        this.sourceActor = sourceActor;
        if(this.sourceActor.tooltipLocation)
            this.location = this.sourceActor.tooltipLocation;
        else
            this.location = Constants.TooltipLocation.BOTTOM;
        let descriptionLabel;
        this.actor = new St.BoxLayout({ 
            vertical: true,
            style_class: 'dash-label tooltip-menu-item',
            opacity: 0
        });
      
        if(title){
            this.titleLabel = new St.Label({
                text: title,
                style: description ? "font-weight: bold;" : null,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.actor.add_actor(this.titleLabel);
        }

        if(description){
            descriptionLabel = new St.Label({
                text: description,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.actor.add_actor(descriptionLabel);
        }

        global.stage.add_actor(this.actor);

        this.actor.connect('destroy',()=>{
            if(this.destroyID){
                this.sourceActor.disconnect(this.destroyID);
                this.destroyID = null;
            }
            if(this.activeID){
                this.sourceActor.disconnect(this.activeID);
                this.activeID = null;
            }
            
            if(this.hoverID){
                this.sourceActor.disconnect(this.hoverID);
                this.hoverID = null;
            }
            if(this.toggleID){
                this._settings.disconnect(this.toggleID);
                this.toggleID = null;
            }
        })
        this.activeID = this.sourceActor.connect('notify::active', ()=> this.setActive(this.sourceActor.active));
        this.destroyID = this.sourceActor.connect('destroy',this.destroy.bind(this));
        this.hoverID = this.sourceActor.connect('notify::hover', this._onHover.bind(this));
        this._useTooltips = ! this._settings.get_boolean('disable-tooltips');
        this.toggleID = this._settings.connect('changed::disable-tooltips', this.disableTooltips.bind(this));
    }

    setActive(active){
        if(!active)
            this.hide();
    }

    disableTooltips() {
        this._useTooltips = ! this._settings.get_boolean('disable-tooltips');
    }

    _onHover() {
        if(this._useTooltips){
            if(this.sourceActor.hover){
                if(this._menuButton.tooltipShowing){
                    this.show();
                    this._menuButton.activeTooltip = this.actor;
                }
                else{
                    this._menuButton.tooltipShowingID = GLib.timeout_add(0, 750, () => {
                        this.show();
                        this._menuButton.tooltipShowing = true;
                        this._menuButton.activeTooltip = this.actor;
                        this._menuButton.tooltipShowingID = null;
                        return GLib.SOURCE_REMOVE;
                    });
                }
                if(this._menuButton.tooltipHidingID){
                    GLib.source_remove(this._menuButton.tooltipHidingID);
                    this._menuButton.tooltipHidingID = null;
                }
            }
            else {
                this.hide();
                if(this._menuButton.tooltipShowingID){
                    GLib.source_remove(this._menuButton.tooltipShowingID);
                    this._menuButton.tooltipShowingID = null;
                }
                this._menuButton.tooltipHidingID = GLib.timeout_add(0, 750, () => {
                    this._menuButton.tooltipShowing = false;
                    this._menuButton.activeTooltip = null;
                    this._menuButton.tooltipHidingID = null;
                    return GLib.SOURCE_REMOVE;
                });
            }
        }
    }

    show() {
        if(this._useTooltips){
            this.actor.opacity = 0;
            this.actor.show();

            let [stageX, stageY] = this.sourceActor.get_transformed_position();
    
            let itemWidth  = this.sourceActor.allocation.x2 - this.sourceActor.allocation.x1;
            let itemHeight = this.sourceActor.allocation.y2 - this.sourceActor.allocation.y1;
    
            let labelWidth = this.actor.get_width();
            let labelHeight = this.actor.get_height();
    
            let x, y;
            let gap = 5;

            switch (this.location) {
                case Constants.TooltipLocation.BOTTOM_CENTERED:
                    y = stageY + itemHeight + gap;
                    x = stageX + Math.floor((itemWidth - labelWidth) / 2);
                    break;
                case Constants.TooltipLocation.TOP_CENTERED:
                    y = stageY - labelHeight - gap;
                    x = stageX + Math.floor((itemWidth - labelWidth) / 2);
                    break;
                case Constants.TooltipLocation.BOTTOM:
                    y = stageY + itemHeight + gap;
                    x = stageX + gap;
                    break;
            }

            // keep the label inside the screen          
            let monitor = Main.layoutManager.findMonitorForActor(this.sourceActor);
            if (x - monitor.x < gap)
                x += monitor.x - x + gap;
            else if (x + labelWidth > monitor.x + monitor.width - gap)
                x -= x + labelWidth - (monitor.x + monitor.width) + gap;
            else if (y - monitor.y < gap)
                y += monitor.y - y + gap;
            else if (y + labelHeight > monitor.y + monitor.height - gap)
                y -= y + labelHeight - (monitor.y + monitor.height) + gap;
            
            this.actor.set_position(x, y);
            this.actor.ease({
                opacity: 255,
                duration: Dash.DASH_ITEM_LABEL_SHOW_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }
    }

    hide() {
        if(this._useTooltips){
            this.actor.ease({
                opacity: 0,
                duration: Dash.DASH_ITEM_LABEL_HIDE_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => this.actor.hide()
            });
        }
    }

    destroy() {
        if (this._menuButton.tooltipShowingID) {
            GLib.source_remove(this._menuButton.tooltipShowingID);
            this._menuButton.tooltipShowingID = null;
        }
        if (this._menuButton.tooltipHidingID) {
            GLib.source_remove(this._menuButton.tooltipHidingID);
            this._menuButton.tooltipHidingID = null;
        }
        if(this.toggleID>0){
            this._settings.disconnect(this.toggleID);
            this.toggleID = 0;
        }
        if(this.hoverID>0){
            this.sourceActor.disconnect(this.hoverID);
            this.hoverID = 0;
        }
        
        global.stage.remove_actor(this.actor);
        this.actor.destroy();
    }
};


/**
 * A base class for custom session menuLayouts.
 */
var SessionButton = GObject.registerClass(
    class Arc_Menu_SessionButton extends St.Button {
    _init(menuLayout, accessible_name, icon_name, gicon) {        
        super._init({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: accessible_name ? accessible_name : "",
            style_class: "button arc-menu-button"
        });
        this.hasContextMenu = false;
        this._menuLayout = menuLayout;
        this.needsDestroy = true;
        this._settings = this._menuLayout._settings;
        this.toggleMenuOnClick = true;
        this.tooltip = new Tooltip(this._menuLayout, this.actor, accessible_name);
        this.tooltip.location = Constants.TooltipLocation.TOP_CENTERED;
        this.tooltip.hide();
        let layout = this._settings.get_enum('menu-layout');
        let iconSize;
        if(layout == Constants.MenuLayout.MINT)
            iconSize = 21;
        else
            iconSize = SMALL_ICON_SIZE;
        this._icon = new St.Icon({ 
            gicon: gicon ? gicon : Gio.icon_new_for_string(icon_name),
            icon_size: iconSize
        });
        if(icon_name)
            this._icon.fallback_icon_name = icon_name;
        this.set_child(this._icon);
        this.connect('key-focus-in', this._onKeyFocusIn.bind(this));
        this.connect('destroy', () => this.needsDestroy = false);
    }

    get actor() {
        return this;
    }

    _onKeyFocusIn(){
        if(!this.actor.hover)
            this._menuLayout._keyFocusIn(this.actor);
        this.active = true;
    }

    vfunc_button_press_event(buttonEvent) {
        const ret = super.vfunc_button_press_event(buttonEvent);
        if(buttonEvent.button == 1){
            this._setPopupTimeout();
        }
        else if (buttonEvent.button == 3){
            if(this.hasContextMenu){
                this.popupContextMenu();
                this.fake_release();
                this.set_hover(true);
                this._menuLayout.contextMenuManager.ignoreRelease();
            }
            return Clutter.EVENT_STOP;
        }
        return ret;
    }
    vfunc_touch_event(touchEvent) {
        const ret = super.vfunc_touch_event(touchEvent);
        if (touchEvent.type == Clutter.EventType.TOUCH_BEGIN)
            this._setPopupTimeout();

        return ret;
    }

    vfunc_clicked(button) {
        this._removeMenuTimeout();
        if(this.toggleMenuOnClick)
            this._menuLayout.arcMenu.toggle();
        this.activate(button);
    }

    vfunc_leave_event(crossingEvent) {
        const ret = super.vfunc_leave_event(crossingEvent);

        this.fake_release();
        this._removeMenuTimeout();
        return ret;
    }

    _setPopupTimeout(){
        this._popupTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
            this._popupTimeoutId = null;
            if(this.hasContextMenu && this._menuLayout.arcMenu.isOpen && !this._menuLayout._blockActivateEvent) {
                this.popupContextMenu();
                this.fake_release();
                this.set_hover(true);
                this._menuLayout.contextMenuManager.ignoreRelease();
            }
            return GLib.SOURCE_REMOVE;
        });
    }
    _removeMenuTimeout() {
        if (this._popupTimeoutId) {
            GLib.source_remove(this._popupTimeoutId);
            this._popupTimeoutId = null;
        }
    }

    activate() {
    }
});
// Menu Place Button Shortcut item class
var PlaceButtonItem = GObject.registerClass(class Arc_Menu_PlaceButtonItem extends SessionButton {
    _init(menuLayout, info) {
        super._init(menuLayout, _(info.name), '', info.gicon ? info.gicon : info.icon);
        this._menuLayout = menuLayout;
        this._info = info;
    }
    activate() {
        this._info.launch();
    }

});

var CategoryMenuButton = GObject.registerClass(class Arc_Menu_CategoryMenuButton extends SessionButton {
    _init(menuLayout, category) {
        let [name, gicon, iconName, fallbackIconName] = Utils.getCategoryDetails(category);
        super._init(menuLayout, _(name), "", null);

        if(gicon)
            this._icon.gicon = gicon;
        else if(iconName)
            this._icon.icon_name = iconName;
        else
            this._icon.fallback_icon_name = fallbackIconName;

        this._name = name;
        this.appList = [];
        this.isRecentlyInstalled = false;
        this.actor.style = "padding: 10px; min-height: 0px;";
        this._menuLayout = menuLayout;
        this._settings = this._menuLayout._settings;
        this._category = category;
        this.toggleMenuOnClick = false;
    }
    
    setRecentlyInstalledIndicator(shouldShow){
        this.isRecentlyInstalled = shouldShow;
        this.updateStyle();
    }
    
    updateStyle(){
        if(this.isRecentlyInstalled){
            let color = this._settings.get_string('indicator-color');
            this.actor.style = "border-color: " + color + "; border-width: 1px; padding: 10px; min-height: 0px;";
        }
        else{
            this.actor.style = "padding: 10px; min-height: 0px;";
        }
    }

    activate(event) {
        this._menuLayout.activeCategory = this._name;
        Utils.activateCategory(this._category, this._menuLayout, this, null);
    }
});

var ShortcutButtonItem = GObject.registerClass(class Arc_Menu_ShortcutButtonItem extends SessionButton {
    _init(menuLayout, name, icon, command) {
        let app = Shell.AppSystem.get_default().lookup_app(command);
        if(app && icon === ''){
            let appIcon = app.create_icon_texture(MEDIUM_ICON_SIZE);
            if(appIcon instanceof St.Icon){
                icon = appIcon.gicon.to_string();
            }
        }
        super._init(menuLayout, name, icon);
        this._command = command;
        this._menuLayout = menuLayout;
        this._settings = this._menuLayout._settings;
        this.shouldShow = true;
        
        this.layout = this._settings.get_enum('menu-layout');
        //Check for default commands--------
        if(this._command == "ArcMenu_Software"){
            let softwareManager = Utils.findSoftwareManager();
            this._command = softwareManager ? softwareManager : 'ArcMenu_unfound.desktop';
        }
        if(command === "ArcMenu_Trash"){
            this.trash = new Me.imports.placeDisplay.Trash(this);          
            this._command = "ArcMenu_Trash";
            this._app = this.trash.getApp();
            this._icon.gicon = this._app.create_icon_texture(MEDIUM_ICON_SIZE).gicon;
        }
        if(!this._app)
            this._app = Shell.AppSystem.get_default().lookup_app(this._command);
        this.hasContextMenu = this._app ? true : false;
        if(this._command.endsWith(".desktop") && !Shell.AppSystem.get_default().lookup_app(this._command)){
            this.shouldShow = false;
        }
    }
    popupContextMenu(){
        if(this.contextMenu == undefined){
            this.contextMenu = new ApplicationContextMenu(this.actor, this._app, this._menuLayout);
            if(this.layout == Constants.MenuLayout.UNITY)
                this.contextMenu.centerBoxPointerPosition();
            if(this.layout == Constants.MenuLayout.MINT || this.layout == Constants.MenuLayout.TOGNEE)
                this.contextMenu.rightBoxPointerPosition();
            this.contextMenu.actor.hide();
        }
        this.tooltip.hide();
        if(!this.contextMenu.isOpen)
            this.contextMenu.rebuildItems();
        this.contextMenu.toggle();        
    }
    activate() {
        if(this._app)
            this._app.open_new_window(-1);
        else if(this._command === "ArcMenu_LogOut")
            activatePowerOption(Constants.PowerType.LOGOUT);
        else if(this._command === "ArcMenu_Lock")
            activatePowerOption(Constants.PowerType.LOCK);
        else if(this._command === "ArcMenu_PowerOff")
            activatePowerOption(Constants.PowerType.POWER_OFF);
        else if(this._command === "ArcMenu_Restart")
            activatePowerOption(Constants.PowerType.RESTART);
        else if(this._command === "ArcMenu_Suspend")
            activatePowerOption(Constants.PowerType.SUSPEND);
        else if(this._command === "ArcMenu_HybridSleep")
            activatePowerOption(Constants.PowerType.HYBRID_SLEEP);
        else if(this._command === "ArcMenu_Hibernate")
            activatePowerOption(Constants.PowerType.HIBERNATE);
        else if(this._command === "ArcMenu_ActivitiesOverview")
            Main.overview.show();
        else if(this._command === "ArcMenu_RunCommand")
            Main.openRunDialog();
        else if(this._command === "ArcMenu_ShowAllApplications")
            Main.overview.viewSelector._toggleAppsPage();
        else
            Util.spawnCommandLine(this._command);   
    }
});
// Settings Button
var SettingsButton = GObject.registerClass(class Arc_Menu_SettingsButton extends SessionButton {
    _init(menuLayout) {
        super._init(menuLayout, _("Settings"), 'emblem-system-symbolic');
    }
    activate() {
        Util.spawnCommandLine('gnome-control-center');
    }
});

// Runner Layout Tweaks Button
var RunnerTweaksButton = GObject.registerClass(class Arc_Menu_RunnerTweaksButton extends SessionButton {
    _init(menuLayout) {
        super._init(menuLayout, _("Configure Runner Layout"), 'emblem-system-symbolic');
        this.tooltip.location = Constants.TooltipLocation.BOTTOM_CENTERED;
    }
    activate() {
        this._menuLayout._settings.set_int('prefs-visible-page', Constants.PrefsVisiblePage.LAYOUT_TWEAKS);
        Util.spawnCommandLine(Constants.ArcMenuSettingsCommand);
    }
});

//'Insider' layout Pinned Apps hamburger button
var PinnedAppsButton = GObject.registerClass(class Arc_Menu_PinnedAppsButton extends SessionButton {
    _init(menuLayout) {
        super._init(menuLayout, _("Pinned Apps"), Me.path + Constants.HamburgerIcon.PATH);
        this.toggleMenuOnClick = false;
    }
    activate() {
        this._menuLayout.togglePinnedAppsMenu();
    }
});

//'Windows' layout extras hamburger button
var ExtrasButton = GObject.registerClass(class Arc_Menu_ExtrasButton extends SessionButton {
    _init(menuLayout) {
        super._init(menuLayout, _("Extras"), Me.path + Constants.HamburgerIcon.PATH);
        this.toggleMenuOnClick = false;
    }
    activate() {
        this._menuLayout.toggleExtrasMenu();
    }
});

//"Leave" Button with popupmenu that shows lock, power off, restart, etc
var LeaveButton = GObject.registerClass(class Arc_Menu_LeaveButton extends SessionButton {
    _init(menuLayout) {
        super._init(menuLayout, _("Leave"), 'system-shutdown-symbolic');
        this.toggleMenuOnClick = false;
        this._menuLayout = menuLayout;
        this.menuButton = menuLayout.menuButton;
        this._settings = menuLayout._settings;
        this._createLeaveMenu();
    }

    _createLeaveMenu(){
        this.leaveMenu = new PopupMenu.PopupMenu(this, 0.5 , St.Side.BOTTOM);
        this.leaveMenu.connect('open-state-changed', (menu, open) => {
            if(open){
                if(this.menuButton.tooltipShowingID){
                    GLib.source_remove(this.menuButton.tooltipShowingID);
                    this.menuButton.tooltipShowingID = null;
                    this.menuButton.tooltipShowing = false;
                }
                if(this.tooltip){
                    this.tooltip.hide();
                    this.menuButton.tooltipShowing = false;
                }
            }
        });
        let section = new PopupMenu.PopupMenuSection();
        this.leaveMenu.addMenuItem(section);  
        
        let box = new St.BoxLayout({
            vertical: true
        });   
        box._delegate = box;

        section.actor.add_actor(box); 

        box.add(this._menuLayout.createLabelRow(_("Session")));

        let lockItem = new PowerMenuItem(this._menuLayout, Constants.PowerType.LOCK);
        lockItem._icon.icon_size = 16;
        box.add(lockItem);

        let logOutItem = new PowerMenuItem(this._menuLayout, Constants.PowerType.LOGOUT);
        logOutItem._icon.icon_size = 16;
        box.add(logOutItem);

        box.add(this._menuLayout.createLabelRow(_("System")));

        Utils.canHybridSleep((canHybridSleep, needsAuth) => {
            if(canHybridSleep){
                let sleepItem = new PowerMenuItem(this, Constants.PowerType.HYBRID_SLEEP);
                sleepItem._icon.icon_size = 16;
                box.insert_child_at_index(sleepItem, 4);
            }
        });

        Utils.canHibernate((canHibernate, needsAuth) => {
            if(canHibernate){
                let hibernateItem = new PowerMenuItem(this, Constants.PowerType.HIBERNATE);
                hibernateItem._icon.icon_size = 16;
                box.insert_child_at_index(hibernateItem, 5);
            }
        });

        let suspendItem = new PowerMenuItem(this._menuLayout, Constants.PowerType.SUSPEND);
        suspendItem._icon.icon_size = 16;
        box.add(suspendItem);
        
        let restartItem = new PowerMenuItem(this._menuLayout, Constants.PowerType.RESTART);
        restartItem._icon.icon_size = 16;
        box.add(restartItem);
        
        let powerOffItem = new PowerMenuItem(this._menuLayout, Constants.PowerType.POWER_OFF);
        powerOffItem._icon.icon_size = 16;
        box.add(powerOffItem); 

        this._menuLayout.subMenuManager.addMenu(this.leaveMenu);
        this.leaveMenu.actor.hide();
        Main.uiGroup.add_actor(this.leaveMenu.actor);
    }

    activate() {
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
        this.leaveMenu.actor.style_class = customStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.leaveMenu.actor.add_style_class_name( customStyle ? 'arc-menu' : 'popup-menu');
        this.leaveMenu.toggle();
    }
});

//'Unity' layout categories hamburger button
var CategoriesButton = GObject.registerClass(class Arc_Menu_CategoriesButton extends SessionButton {
    _init(menuLayout) {
        super._init(menuLayout, _("Categories"), Me.path + Constants.HamburgerIcon.PATH);
        this.toggleMenuOnClick = false;
    }
    activate() {
        this._menuLayout.toggleCategoriesMenu();
    }
});
// User Button
var UserButton = GObject.registerClass(class Arc_Menu_UserButton extends SessionButton {
    _init(menuLayout) {
        super._init(menuLayout, _("Users"), 'system-users-symbolic');
    }
    activate() {
        Util.spawnCommandLine("gnome-control-center user-accounts");
    }
});

// User Button
var CurrentUserButton = GObject.registerClass(class Arc_Menu_CurrentUserButton extends SessionButton {
    _init(menuLayout) {
        super._init(menuLayout, GLib.get_real_name(), 'system-users-symbolic');
        this._menuLayout = menuLayout;
        let username = GLib.get_user_name();
        this._user = AccountsService.UserManager.get_default().get_user(username);
        this.iconBin = new St.Bin({ 
            style_class: 'menu-user-avatar'
        });
        this.iconBin.style = "width: "+SMALL_ICON_SIZE+"px; height: "+SMALL_ICON_SIZE+"px;";
        this._userLoadedId = this._user.connect('notify::is-loaded', this._onUserChanged.bind(this));
        this._userChangedId = this._user.connect('changed', this._onUserChanged.bind(this));
        this.actor.connect('destroy', this._onDestroy.bind(this));
        this._onUserChanged();

        this.actor.set_child(this.iconBin);
    }
    activate() {
        Util.spawnCommandLine("gnome-control-center user-accounts");
    }
    _onUserChanged() {
        if (this._user.is_loaded) {
            if(this.tooltip)
                this.tooltip.titleLabel.text = this._user.get_real_name();
            let iconFileName = this._user.get_icon_file();
            if (iconFileName && !GLib.file_test(iconFileName, GLib.FileTest.EXISTS))
                iconFileName = null;
            if (iconFileName) {
                this.iconBin.child = null;
                this.iconBin.style = 'background-image: url("%s");'.format(iconFileName) + "width: "+SMALL_ICON_SIZE+"px; height: "+SMALL_ICON_SIZE+"px;";
            } else {
                this.iconBin.child = new St.Icon({ 
                    icon_name: 'avatar-default-symbolic',
                    icon_size: SMALL_ICON_SIZE
                });
            }
        }    
    }
    _onDestroy() {
        if (this._userLoadedId != 0) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = 0;
        }
        if (this._userChangedId != 0) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = 0;
        }
    }
});

var PowerButton = GObject.registerClass(class Arc_Menu_PowerButton extends SessionButton {
    _init(menuLayout, powerType) {
        super._init(menuLayout, Constants.PowerOptions[powerType].TITLE, Constants.PowerOptions[powerType].IMAGE);
        this.powerType = powerType;
    }
    activate() {
        activatePowerOption(this.powerType);
    }
});

var PowerMenuItem = GObject.registerClass(class Arc_Menu_PowerMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, type) {
        super._init(menuLayout);
        this.powerType = type;
        this._menuLayout = menuLayout;
        this._layout = this._menuLayout.layout;
        this._settings = this._menuLayout._settings;
        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(Constants.PowerOptions[this.powerType].IMAGE),
            style_class: 'popup-menu-icon',
            icon_size: MEDIUM_ICON_SIZE,
        });

        this.label = new St.Label({
            text: _(Constants.PowerOptions[this.powerType].TITLE),
            y_expand: false,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.add_actor(this._icon);
        this.add_actor(this.label);
    }

    activate(event){
        activatePowerOption(this.powerType);
        super.activate(event);
    }
});

var PlasmaMenuItem = GObject.registerClass(class Arc_Menu_PlasmaMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, title, iconPath) {
        super._init(menuLayout);
        this.remove_child(this._ornamentLabel);
        this._menuLayout = menuLayout;
        this.tooltipLocation = Constants.TooltipLocation.BOTTOM_CENTERED;
        this._layout = this._menuLayout.layout;
        this._settings = this._menuLayout._settings;
        this.vertical = true;
        this.name = "arc-menu-plasma-button";

        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(iconPath),
            style_class: 'popup-menu-icon',
            icon_size: MEDIUM_ICON_SIZE
        });
        this.add_actor(this._icon);
        this.label = new St.Label({
            text: _(title),
            x_expand: true,
            y_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.label.x_align = this.label.y_align = Clutter.ActorAlign.CENTER;
        this.label.y_expand = true;
    
        this._icon.x_align = this._icon.y_align = Clutter.ActorAlign.CENTER;
        this._icon.y_expand = true;

        this.label.get_clutter_text().set_line_wrap(true);
        this.add_actor(this.label);
        this.actor.connect('notify::hover', this._onHover.bind(this));
    }
    
    _onHover(){
        if(this.tooltip === undefined && this.actor.hover && this.label){
            let description = null;
            Utils.createTooltip(this._menuLayout, this, this.label, description);
        }
        let shouldHover = this._settings.get_boolean('plasma-enable-hover');
        if(shouldHover && this.actor.hover && !this.isActive){
            this.activate(Clutter.get_current_event()); 
        }
    }

    set active(active) {
        let activeChanged = active != this.active;
        if(activeChanged){
            this._active = active;
            if(active){
                this.add_style_class_name('selected');
                this._menuLayout.activeMenuItem = this;
                if(this.can_focus)
                    this.grab_key_focus();
            } 
            else{
                this.remove_style_class_name('selected');
            }
            this.notify('active');
        }      
    }

    setActive(active){
        if(active){
            this.isActive = true;
            this.set_style_pseudo_class("active-item");
        }
        else{
            this.isActive = false;
            this.set_style_pseudo_class(null);
        }
    }

    activate(event){
        this._menuLayout.clearActiveItem();
        this.setActive(true);
        super.activate(event);
    }
});

var PlasmaCategoryHeader = GObject.registerClass(class Arc_Menu_PlasmaCategoryHeader extends St.BoxLayout{
    _init(menuLayout) {
        super._init({ 
            style_class: "popup-menu-item",
            style: 'padding: 0px; margin: 0px;'
        });
        this._menuLayout = menuLayout;
        this._layout = this._menuLayout.layout;
        this._settings = this._menuLayout._settings;
        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string('go-next-symbolic'),
            style_class: 'popup-menu-icon',
            icon_size: 12,
        });
        this.backButton = new ArcMenuPopupBaseMenuItem(this._menuLayout);
        this.backButton.x_expand = false;
        this.backButton.x_align = Clutter.ActorAlign.CENTER;
        this.label = new St.Label({
            text: _("Applications"),
            y_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-weight: bold'
        });
        this.backButton.style = 'spacing: 6px; padding: 4px; margin: 0px;';
        this.backButton.add_actor(this.label);

        this.add_actor(this.backButton);
        this.backButton.connect("activate", () => this._menuLayout.displayCategories() );

        this.add_actor(this._icon);
        this._icon.hide();

        this.categoryLabel = new St.Label({
            text: '',
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.add_actor(this.categoryLabel);
    }

    setActiveCategory(categoryText){
        if(categoryText){
            this.categoryLabel.text = _(categoryText);
            this.categoryLabel.show();
            this._icon.show();
        }
        else{
            this.categoryLabel.hide();
            this._icon.hide();
        }
    }
});

var AllAppsButton = GObject.registerClass(class Arc_Menu_AllAppsButton extends St.Button{
    _init(menuLayout) {
        super._init({
            style_class: 'arc-menu-eject-button',
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'min-height: 30px;'
        });
        this._menuLayout = menuLayout;
        this._layout = this._menuLayout.layout;
        this._settings = this._menuLayout._settings;
        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string('go-next-symbolic'),
            style_class: 'popup-menu-icon',
            icon_size: 12,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: false,
            x_align: Clutter.ActorAlign.END,
            style: 'padding-left: 10px;'
        });
        this._label = new St.Label({
            text: _("All Apps"),
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.box = new St.BoxLayout({
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
        });
        this.box.add(this._label);
        this.box.add(this._icon);
        this.set_child(this.box);
        this.connect('clicked', () => this.activate());
    }

    activate(){
        this._menuLayout.activeCategory = _("All Apps");
        this._menuLayout.layoutProperties.GridColumns = 1;
        this._menuLayout.displayAllApps();
        this._menuLayout.activeCategoryType = Constants.CategoryType.ALL_PROGRAMS;
        this._menuLayout.layoutProperties.GridColumns = 6;
    }
});

var BackButton = GObject.registerClass(class Arc_Menu_BackButton extends St.Button{
    _init(menuLayout) {
        super._init({
            style_class: 'arc-menu-eject-button',
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'min-height: 30px;'
        });
        this._menuLayout = menuLayout;
        this._layout = this._menuLayout.layout;
        this._settings = this._menuLayout._settings;
        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string('go-previous-symbolic'),
            style_class: 'popup-menu-icon',
            icon_size: 12,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            style: 'padding-right: 10px;'
        });
        this._label = new St.Label({
            text: _("Back"),
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.box = new St.BoxLayout({
            x_expand: true,
            x_align: Clutter.ActorAlign.END
        });
        this.box.add(this._icon);
        this.box.add(this._label);

        this.set_child(this.box);
        this.connect('clicked', () => this.activate());
    }

    activate(){
        this._menuLayout.setDefaultMenuView();
    }
});

// Menu item to go back to category view
var BackMenuItem = GObject.registerClass(class Arc_Menu_BackMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._layout = this._menuLayout.layout;
        this._settings = this._menuLayout._settings;
        
        this._icon = new St.Icon({
            icon_name: 'go-previous-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: 24
        });
        this.add_actor(this._icon);
        let backLabel = new St.Label({
            text: _("Back"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.add_actor(backLabel);
    }
    activate(event) {
        let defaultMenuView = this._settings.get_enum('default-menu-view');
        if(this._layout === Constants.MenuLayout.ARCMENU){
            if(this._menuLayout.activeCategoryType === Constants.CategoryType.SEARCH_RESULTS || this._menuLayout.activeCategoryType === Constants.CategoryType.ALL_PROGRAMS_BUTTON){ 
                this._menuLayout.resetSearch();
                if(defaultMenuView === Constants.DefaultMenuView.PINNED_APPS)
                    this._menuLayout.displayPinnedApps();
                else if(defaultMenuView === Constants.DefaultMenuView.CATEGORIES_LIST)
                    this._menuLayout.displayCategories();
                else if(defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS)
                    this._menuLayout.displayFrequentApps();
            }
            else if(this._menuLayout.activeCategoryType === Constants.CategoryType.CATEGORIES_LIST && defaultMenuView === Constants.DefaultMenuView.PINNED_APPS)
                this._menuLayout.displayPinnedApps();
            else if(this._menuLayout.activeCategoryType === Constants.CategoryType.CATEGORIES_LIST && defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS)
                this._menuLayout.displayFrequentApps();
            else
                this._menuLayout.displayCategories();
        }
        else if(this._layout === Constants.MenuLayout.TOGNEE)
            this._menuLayout.setDefaultMenuView();
        super.activate(event);
    }
});

// Menu item to view all apps
var ViewAllPrograms = GObject.registerClass(class Arc_Menu_ViewAllPrograms extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._settings = this._menuLayout._settings;
    
        this._icon = new St.Icon({
            icon_name: 'go-next-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: 24,
             x_align: Clutter.ActorAlign.START
        });
        this.add_child(this._icon);
        let backLabel = new St.Label({
            text: _("All Programs"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.add_child(backLabel);
    }
    activate(event) {
        this._menuLayout._clearActorsFromBox();
        let defaultMenuView = this._settings.get_enum('default-menu-view');
        if(defaultMenuView === Constants.DefaultMenuView.PINNED_APPS || defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS)
            this._menuLayout.displayCategories();
        else{ 
            this._menuLayout.displayAllApps();
            this._menuLayout.activeCategoryType = Constants.CategoryType.ALL_PROGRAMS_BUTTON;
        }
        super.activate(event);
    }
});

// Menu shortcut item class
var ShortcutMenuItem = GObject.registerClass(class Arc_Menu_ShortcutMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, name, icon, command, appType) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._settings = this._menuLayout._settings;
        this._command = command;
        this._appType = appType;

        //Check for default commands--------
        if(this._command == "ArcMenu_Software"){
            let softwareManager = Utils.findSoftwareManager();
            this._command = softwareManager ? softwareManager : 'ArcMenu_unfound.desktop';
        }
        else if(this._command === "ArcMenu_Trash"){
            this.trash = new Me.imports.placeDisplay.Trash(this);
            this._command = "ArcMenu_Trash";
            this._app = this.trash.getApp();
        }
        if(!this._app)
            this._app = Shell.AppSystem.get_default().lookup_app(this._command);

        if(this._app && icon === ''){
            let appIcon = this._app.create_icon_texture(MEDIUM_ICON_SIZE);
            if(appIcon instanceof St.Icon){
                icon = appIcon.gicon.to_string();
            }
        }

        this.hasContextMenu = this._app ? true : false;
        //---------
        this._icon = new St.Icon({
            icon_name: icon,
            gicon: Gio.icon_new_for_string(icon),
            style_class: 'popup-menu-icon',
            icon_size: SMALL_ICON_SIZE
        });
        this.add_child(this._icon);
        this.label = new St.Label({
            text: _(name), y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        let layout = this._settings.get_enum('menu-layout'); 
        if(layout === Constants.MenuLayout.PLASMA && this._settings.get_boolean('apps-show-extra-details') && this._app){
            let labelBox = new St.BoxLayout({
                vertical: true
            });
            let descriptionLabel = new St.Label({
                text: this._app.get_description(),
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style: "font-weight: lighter;"
            });
            labelBox.add(this.label);
            if(this._app.get_description())
                labelBox.add(descriptionLabel);
            this.add_child(labelBox);
        }
        else{
            this.add_child(this.label);
        }

        if(this._appType === Constants.AppDisplayType.GRID)
            Utils.convertToGridLayout(this);
        this.setShouldShow();
    }

    popupContextMenu(){
        if(this._app && this.contextMenu == undefined){
            this.contextMenu = new ApplicationContextMenu(this.actor, this._app, this._menuLayout);
            if(this._appType === Constants.AppDisplayType.GRID)
                this.contextMenu.centerBoxPointerPosition();
            if(this._path) 
                this.contextMenu.path = this._path;
        }
        if(this.contextMenu != undefined){
            if(this.tooltip!=undefined)
                this.tooltip.hide();
            if(!this.contextMenu.isOpen){
                this.contextMenu.rebuildItems();
            }
            this.contextMenu.toggle(); 
        }
    }

    activate(event) {
        this._menuLayout.arcMenu.toggle();
        if(this._command === "ArcMenu_LogOut")
            activatePowerOption(Constants.PowerType.LOGOUT);
        else if(this._command === "ArcMenu_Lock")
            activatePowerOption(Constants.PowerType.LOCK);
        else if(this._command === "ArcMenu_PowerOff")
            activatePowerOption(Constants.PowerType.POWER_OFF);
        else if(this._command === "ArcMenu_Restart")
            activatePowerOption(Constants.PowerType.RESTART);
        else if(this._command === "ArcMenu_Suspend")
            activatePowerOption(Constants.PowerType.SUSPEND);
        else if(this._command === "ArcMenu_HybridSleep")
            activatePowerOption(Constants.PowerType.HYBRID_SLEEP);
        else if(this._command === "ArcMenu_Hibernate")
            activatePowerOption(Constants.PowerType.HIBERNATE);
        else if(this._command === "ArcMenu_ActivitiesOverview")
            Main.overview.show();
        else if(this._command === "ArcMenu_RunCommand")
            Main.openRunDialog();
        else if(this._command === "ArcMenu_ShowAllApplications")
            Main.overview.viewSelector._toggleAppsPage();
        else if(this._app)
            this._app.open_new_window(-1);
        else
            Util.spawnCommandLine(this._command);
        super.activate(event);
    }

    _updateIcon(){
        let largeIcons = this._settings.get_boolean('enable-large-icons');
        this._icon.icon_size = largeIcons ? MEDIUM_ICON_SIZE : SMALL_ICON_SIZE;
    }

    setIconSizeLarge(){
        this._icon.icon_size = MEDIUM_ICON_SIZE;
    }
});

// Menu item which displays the current user
var UserMenuItem = GObject.registerClass(class Arc_Menu_UserMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, userAvatarSize) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        let username = GLib.get_user_name();
        this._user = AccountsService.UserManager.get_default().get_user(username);
        this.iconBin =  new St.Bin({ 
            style_class: 'menu-user-avatar user-icon',
            y_align: Clutter.ActorAlign.CENTER
        });
        
        this._userAvatarSize = userAvatarSize ? userAvatarSize : USER_AVATAR_SIZE;

        this.iconBin.style = "width: "+this._userAvatarSize +"px; height: "+this._userAvatarSize +"px;";
        this.add_actor(this.iconBin);
        this._userLabel = new St.Label({
            text: GLib.get_real_name(),
            y_align: Clutter.ActorAlign.CENTER
        });
        this.add_actor(this._userLabel);
        this._userLoadedId = this._user.connect('notify::is-loaded', this._onUserChanged.bind(this));
        this._userChangedId = this._user.connect('changed', this._onUserChanged.bind(this));
        this.actor.connect('destroy', this._onDestroy.bind(this));
        this._onUserChanged();
    }
    activate(event) {
        Util.spawnCommandLine("gnome-control-center user-accounts");
        this._menuLayout.arcMenu.toggle();
        super.activate(event);
    }
    _onUserChanged() {
        if (this._user.is_loaded) {
            this._userLabel.set_text(this._user.get_real_name());
            let iconFileName = this._user.get_icon_file();
            if (iconFileName && !GLib.file_test(iconFileName ,GLib.FileTest.EXISTS))
                iconFileName = null;
            if (iconFileName) {
                this.iconBin.child = null;
                this.iconBin.add_style_class_name('user-avatar');
                this.iconBin.style = 'background-image: url("%s");'.format(iconFileName) + "width: "+this._userAvatarSize +"px; height: "+this._userAvatarSize +"px;";
            } else {
                this.iconBin.child = new St.Icon({ 
                    icon_name: 'avatar-default-symbolic',
                    icon_size: this._userAvatarSize
                });
            }
        }
    }
    _onDestroy() {
        if (this._userLoadedId != 0) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = 0;
        }
        if (this._userChangedId != 0) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = 0;
        }
    }
});

var UserMenuIcon = class Arc_Menu_UserMenuIcon{
    constructor(menuLayout, size) {
        this._menuLayout = menuLayout;
        this._size = size;
        let username = GLib.get_user_name();
        this._user = AccountsService.UserManager.get_default().get_user(username);
        this.actor = new St.Bin({ 
            style_class: 'menu-user-avatar user-icon',
            track_hover:true,
            reactive: true
        });
        this.userNameLabel = new St.Label({
            text: GLib.get_real_name()
        });
        this.actor.style = "width: " + this._size + "px; height: " + this._size + "px;";
        this._userLoadedId = this._user.connect('notify::is-loaded', this._onUserChanged.bind(this));
        this._userChangedId = this._user.connect('changed', this._onUserChanged.bind(this));
        this.actor.connect('destroy', this._onDestroy.bind(this));
        this._onUserChanged();
        this.actor.connect('notify::hover',this._onHover.bind(this));
    }
    _onHover() {
        if(this.tooltip==undefined && this.actor.hover){
            this.tooltip = new Tooltip(this._menuLayout, this.actor, GLib.get_real_name());
            this.tooltip.location = Constants.TooltipLocation.BOTTOM_CENTERED;
            this.tooltip._onHover();
        }
    }
    _onUserChanged() {
        if (this._user.is_loaded) {
            this.userNameLabel.set_text(this._user.get_real_name());
            if(this.tooltip)
                this.tooltip.titleLabel.text = this._user.get_real_name();
            let iconFileName = this._user.get_icon_file();
            if (iconFileName && !GLib.file_test(iconFileName ,GLib.FileTest.EXISTS))
                iconFileName = null;
            if (iconFileName) {
                this.actor.child = null;
                this.actor.add_style_class_name('user-avatar');
                this.actor.style = 'background-image: url("%s");'.format(iconFileName) + "width: " + this._size + "px; height: " + this._size + "px;";
            } else {
                this.actor.child = new St.Icon({ icon_name: 'avatar-default-symbolic',
                                                    icon_size: this._size});
            }
        }
        
    }
    _onDestroy() {
        if (this._userLoadedId != 0) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = 0;
        }
        if (this._userChangedId != 0) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = 0;
        }
    }
};

// Menu pinned apps item class
var PinnedAppsMenuItem = GObject.registerClass({ 
    Signals: {  'saveSettings': {}, }, 
}, class Arc_Menu_PinnedAppsMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, name, icon, command, appType) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._menuButton = menuLayout.menuButton;
        this._settings = this._menuLayout._settings;
        this._command = command;
        this._iconString = this._iconPath = icon;
        this._name = name;
        this._appType = appType;
        this._app = Shell.AppSystem.get_default().lookup_app(this._command);
        this.hasContextMenu = true;
        this.gridLocation = [-1, -1];

        //Modifiy the Default Pinned Apps---------------------
        if(this._name == "ArcMenu Settings"){
            this._name = _("ArcMenu Settings");
        }
        else if(this._name == "Terminal"){
            this._name = _("Terminal");
        }
        if(this._iconPath === "ArcMenu_ArcMenuIcon" || this._iconPath ===  Me.path + '/media/icons/arc-menu-symbolic.svg'){
            this._iconString = this._iconPath = Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg';
        }
        //-------------------------------------------------------
              
        if(this._app && this._iconPath === ''){
            let appIcon = this._app.create_icon_texture(MEDIUM_ICON_SIZE);
            if(appIcon instanceof St.Icon){
                this._iconString = appIcon.gicon ? appIcon.gicon.to_string() : appIcon.fallback_icon_name;
                if(!this._iconString)
                    this._iconString = "";
            }
        }

        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(this._iconString),
            icon_size: MEDIUM_ICON_SIZE
        })

        this.add_child(this._icon);
 
        this.label = new St.Label({
            text: _(this._name), 
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        let layout = this._settings.get_enum('menu-layout'); 
        if(layout === Constants.MenuLayout.PLASMA && this._settings.get_boolean('apps-show-extra-details') && this._app){
            let labelBox = new St.BoxLayout({
                vertical: true
            });
            let descriptionLabel = new St.Label({
                text: this._app.get_description(),
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style: "font-weight: lighter;"
            });
            labelBox.add(this.label);
            if(this._app.get_description())
                labelBox.add(descriptionLabel);
            this.add_child(labelBox);
        }
        else{
            this.add_child(this.label);
        }

        this._draggable = DND.makeDraggable(this.actor);
        this._draggable._animateDragEnd = (eventTime) => {
            this._draggable._animationInProgress = true;
            this._draggable._onAnimationComplete(this._draggable._dragActor, eventTime);
        };
        this.isDraggableApp = true;
        this._draggable.connect('drag-begin', this._onDragBegin.bind(this));
        this._draggable.connect('drag-end', this._onDragEnd.bind(this));

        if(this._appType === Constants.AppDisplayType.GRID)
            Utils.convertToGridLayout(this);

        this.setShouldShow();
    }
    _updateIcon() {
        if(this._appType === Constants.AppDisplayType.GRID){
            this._icon.icon_size = this._menuLayout.layoutProperties.IconGridSize;
        }
        else{
            let largeIcons = this._settings.get_boolean('enable-large-icons');
            this._icon.icon_size = largeIcons ? MEDIUM_ICON_SIZE : SMALL_ICON_SIZE;  
        }
    }
    popupContextMenu(){
        if(this.contextMenu == undefined){
            let app = this._app ? this._app : this._command;
            this.contextMenu = new ApplicationContextMenu(this.actor, app, this._menuLayout);
            if(this._appType === Constants.AppDisplayType.GRID)
                this.contextMenu.centerBoxPointerPosition();
        }
        if(this.tooltip!=undefined)
            this.tooltip.hide();
        if(!this.contextMenu.isOpen)
            this.contextMenu.rebuildItems();
        this.contextMenu.toggle();
    }

   _onDragBegin() {
        if(this._menuButton.tooltipShowingID){
            GLib.source_remove(this._menuButton.tooltipShowingID);
            this._menuButton.tooltipShowingID = null;
            this._menuButton.tooltipShowing = false;
        }
        if(this.tooltip){
            this.tooltip.hide();
            this._menuButton.tooltipShowing = false;
        }
        
        if(this.contextMenu && this.contextMenu.isOpen)
            this.contextMenu.toggle();

        if(this._popupTimeoutId){
            GLib.source_remove(this._popupTimeoutId);
            this._popupTimeoutId = null;
        }

        this._dragMonitor = {
            dragMotion: this._onDragMotion.bind(this)
        };
        DND.addDragMonitor(this._dragMonitor);
        this._parentBox = this.actor.get_parent();
        let p = this._parentBox.get_transformed_position();
        this.posX = p[0]; 
        this.posY = p[1];

        this.actor.opacity = 55;
        this.get_allocation_box();
        this.rowHeight = this.height;
        this.rowWidth = this.width;
    }

    _onDragMotion(dragEvent) {
        let layoutManager = this._parentBox.layout_manager;
        if(layoutManager instanceof Clutter.GridLayout){
            this.xIndex = Math.floor((this._draggable._dragX - this.posX) / (this.rowWidth + layoutManager.column_spacing));
            this.yIndex = Math.floor((this._draggable._dragY - this.posY) / (this.rowHeight + layoutManager.row_spacing));

            if(this.xIndex === this.gridLocation[0] && this.yIndex === this.gridLocation[1]){
                return DND.DragMotionResult.CONTINUE;
            }
            else{
                this.gridLocation = [this.xIndex, this.yIndex];
            }

            this._parentBox.remove_child(this);
            let children = this._parentBox.get_children();
            let childrenCount = children.length;
            let columns = this._parentBox.isPinnedAppsGrid ? this._menuLayout.layoutProperties.PinnedAppsColumns : this._menuLayout.layoutProperties.GridColumns;
            let rows = Math.floor(childrenCount / columns);
            if(this.yIndex >= rows)
                this.yIndex = rows;
            if(this.yIndex < 0)
                this.yIndex = 0;
            if(this.xIndex >= columns - 1)
                this.xIndex = columns - 1;
            if(this.xIndex < 0)
                this.xIndex = 0;

            if(((this.xIndex + 1) + (this.yIndex * columns)) > childrenCount)
                this.xIndex = Math.floor(childrenCount % columns);

            this._parentBox.remove_all_children();

            let x = 0, y = 0;
            for(let i = 0; i < children.length; i++){
                if(this.xIndex === x && this.yIndex === y)
                    [x, y] = this.gridLayoutIter(x, y, columns);
                this._parentBox.layout_manager.attach(children[i], x, y, 1, 1);
                [x, y] = this.gridLayoutIter(x, y, columns);
            }
            this._parentBox.layout_manager.attach(this, this.xIndex, this.yIndex, 1, 1);
        }
        return DND.DragMotionResult.CONTINUE;
    }

    _onDragEnd() {
        if (this._dragMonitor) {
            DND.removeDragMonitor(this._dragMonitor);
            this._dragMonitor = null;
        }
        this.actor.opacity = 255;
        let layoutManager = this._parentBox.layout_manager;
        if(layoutManager instanceof Clutter.GridLayout){
            let x = 0, y = 0;
            let columns = this._parentBox.isPinnedAppsGrid ? this._menuLayout.layoutProperties.PinnedAppsColumns : this._menuLayout.layoutProperties.GridColumns;
            let orderedList = [];
            let children = this._parentBox.get_children();
            for(let i = 0; i < children.length; i++){
                orderedList.push(this._parentBox.layout_manager.get_child_at(x, y));
                [x, y] = this.gridLayoutIter(x, y, columns);
            }
            this._menuLayout.pinnedAppsArray = orderedList;
        }
        this.emit('saveSettings');
    }

    getDragActor() {
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
        let icon = new St.Icon({
            gicon: Gio.icon_new_for_string(this._iconString),
            style_class: 'popup-menu-icon',
            icon_size: this._icon.icon_size
        });
        customStyle ? icon.add_style_class_name('arc-menu-action') : icon.remove_style_class_name('arc-menu-action');
        return icon;
    }

    getDragActorSource() {
        return this.actor;
    }

    gridLayoutIter(x, y, columns){
        x++;
        if(x === columns){
            y++;
            x = 0;
        }
        return [x, y];
    }

    activate(event) {
        if(this._app)
            this._app.open_new_window(-1);
        else if(this._command === "ArcMenu_ShowAllApplications")
            Main.overview.viewSelector._toggleAppsPage();
        else
            Util.spawnCommandLine(this._command);

        this._menuLayout.arcMenu.toggle();
        super.activate(event);
    }
});

var ApplicationMenuItem = GObject.registerClass(class Arc_Menu_ApplicationMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, app, appType, metaInfo) {
        super._init(menuLayout);
        this._app = app;
        this._menuLayout = menuLayout;
        this.metaInfo = metaInfo;
        this._settings = this._menuLayout._settings;
        this.searchType = this._menuLayout.layoutProperties.SearchType;
        this._appType = appType;
        this.hasContextMenu = true;

        if(this._app){
            let disableRecentAppsIndicator = this._settings.get_boolean("disable-recently-installed-apps")
            if(!disableRecentAppsIndicator){
                let recentApps = this._settings.get_strv('recently-installed-apps');
                this.isRecentlyInstalled = recentApps.some((appIter) => appIter === this._app.get_id());
            }
        }

        this._iconBin = new St.Bin();
        this.add_child(this._iconBin);
        this.label = new St.Label({
            text: this._app ? this._app.get_name() : this.metaInfo['name'],
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.description = this._app ? this._app.get_description() : this.metaInfo['description'];
        let layout = this._settings.get_enum('menu-layout');
        this.isPlasmaLayout = layout === Constants.MenuLayout.PLASMA;
        this.showExtraDetails = this._settings.get_boolean('apps-show-extra-details');
        let isSearchResult = this._appType === Constants.AppDisplayType.SEARCH;
        let showSearchResultDescriptions = this._settings.get_boolean("show-search-result-details");
        if(this.description && ((this.isPlasmaLayout && this.showExtraDetails) || (isSearchResult && showSearchResultDescriptions))){
            let labelBox = new St.BoxLayout({
                vertical: true
            });
            let descriptionText = this.description.split('\n')[0];
            this.descriptionLabel = new St.Label({
                text: descriptionText,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style: "font-weight: lighter;"
            });
            labelBox.add(this.label);
            labelBox.add(this.descriptionLabel);
            this.add_child(labelBox);
        }
        else{
            this.add_child(this.label);
        }
        
        this.label_actor = this.label;

        if(this.isRecentlyInstalled){
            this._indicator = new St.Label({
                text: _('New'),
                style_class: "arc-menu-menu-item-text-indicator",
                style: "border-radius: 15px; margin: 0px; padding: 0px 10px;",
                x_expand: true,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(this._indicator);
        }
        if(this._appType === Constants.AppDisplayType.GRID)
            Utils.convertToGridLayout(this);

        this._updateIcon();
        this.connect("notify::hover", () => this.removeIndicator());
        this.connect("key-focus-in", () => this.removeIndicator());
    }

    removeIndicator(){
        if(this.isRecentlyInstalled){
            this.isRecentlyInstalled = false;
            let recentApps = this._settings.get_strv('recently-installed-apps');
            let index = recentApps.indexOf(this._app.get_id());
            if(index > -1){
                recentApps.splice(index, 1);
            }
            this._settings.set_strv('recently-installed-apps', recentApps);

            this._indicator.hide();
            this._menuLayout.setRecentlyInstalledIndicator();
        }
    }

    popupContextMenu(){
        this.removeIndicator();
        if(this.tooltip)
            this.tooltip.hide();
        if(!this._app && !this._path)
            return;

        if(this.contextMenu === undefined){
            this.contextMenu = new ApplicationContextMenu(this.actor, this._app, this._menuLayout);
            if(this._path) 
                this.contextMenu.path = this._path;
            if(this._appType === Constants.AppDisplayType.GRID)
                this.contextMenu.centerBoxPointerPosition();
        }
        if(!this.contextMenu.isOpen)
            this.contextMenu.rebuildItems();
        this.contextMenu.toggle();
    }  
    get_app_id() {
        return this._app.get_id();
    }
    _createIcon(iconSize) {
        return this._app.create_icon_texture(iconSize);
    }

    activateSearchResult(provider, metaInfo, terms){
        if(provider.activateResult){
            provider.activateResult(metaInfo.id, terms);
            if (metaInfo.clipboardText)
                St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, metaInfo.clipboardText);
        }
        else{
            if (metaInfo.id.endsWith('.desktop')) {
                let app = Shell.AppSystem.get_default().lookup_app(metaInfo.id);
                app.open_new_window(-1);
            }
            else
                SystemActions.activateAction(metaInfo.id);
        }
    }

    activate(event) {
        this.removeIndicator();

        if(this.metaInfo)
            this.activateSearchResult(this.provider, this.metaInfo, this.resultsView.terms);
        else
            this._app.open_new_window(-1);

        this._menuLayout.arcMenu.toggle();
        super.activate(event);
    }

    grabKeyFocus() {
        this.actor.grab_key_focus();
    }

    _updateIcon() {
        if(this.searchType === Constants.AppDisplayType.GRID && this._appType === Constants.AppDisplayType.SEARCH){
            let iconSize = this._menuLayout.layoutProperties.ListSearchResults_IconSize;
            let icon = this.metaInfo ? this.metaInfo['createIcon'](iconSize) : this._app.create_icon_texture(iconSize);
            this._iconBin.set_child(icon);
        }
        else if(this._appType === Constants.AppDisplayType.GRID){
            let iconSize = this._menuLayout.layoutProperties.IconGridSize;
            let icon = this.metaInfo ? this.metaInfo['createIcon'](iconSize) : this._app.create_icon_texture(iconSize);
            this._iconBin.set_child(icon);
        }
        else{
            let largeIcons = this._settings.get_boolean('enable-large-icons');
            let plasmaLayoutLargeIcons = this.isPlasmaLayout && this.showExtraDetails;
            let iconSize = largeIcons || plasmaLayoutLargeIcons ? MEDIUM_ICON_SIZE : SMALL_ICON_SIZE;
            let icon = this.metaInfo ? this.metaInfo['createIcon'](iconSize) : this._app.create_icon_texture(iconSize);
            this._iconBin.set_child(icon);
        }
    }
    forceLargeIcon(size){
        let iconSize = size ? size : MEDIUM_ICON_SIZE;
        let icon = this.metaInfo ? this.metaInfo['createIcon'](iconSize) : this._app.create_icon_texture(iconSize);
        this._iconBin.set_child(icon);
    }
});

// Menu Category item class
var CategoryMenuItem = GObject.registerClass(class Arc_Menu_CategoryMenuItem extends ArcMenuPopupBaseMenuItem{  
    _init(menuLayout, category) {
        super._init(menuLayout);
        this.appList = [];
        this._menuLayout = menuLayout;
        this._settings = this._menuLayout._settings;
        this._layout = this._settings.get_enum('menu-layout');
        this._category = category;
        this._name = "";
        this._horizontalFlip = this._settings.get_boolean('enable-horizontal-flip');

        //if menu layout supports category hover activation, we want to invert this._arrowIcon when 'enable-horizontal-flip' is true.
        this._invertArrowIcon = this._menuLayout.layoutProperties.SupportsCategoryOnHover ? this._horizontalFlip : false;
       
        this._icon = new St.Icon({
            style_class: 'popup-menu-icon',
            icon_size: MEDIUM_ICON_SIZE
        });

        let [name, gicon, iconName, fallbackIconName] = Utils.getCategoryDetails(this._category);
        this._name = _(name);
        if(gicon)
            this._icon.gicon = gicon;
        else if(iconName)
            this._icon.icon_name = iconName;
        else
            this._icon.fallback_icon_name = fallbackIconName;

        this.add_child(this._icon);
        
        this.label = new St.Label({
            text: this._name,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.add_child(this.label);

        if(this.isRecentlyInstalled)
            this.setRecentlyInstalledIndicator(true);

        if(!this._settings.get_boolean("disable-category-arrows")){
            this._arrowIcon = new St.Icon({
                icon_name:  this._invertArrowIcon ? 'go-previous-symbolic' : 'go-next-symbolic',
                style_class: 'popup-menu-icon',
                x_expand: this._invertArrowIcon ? false : true,
                x_align: this._invertArrowIcon ? Clutter.ActorAlign.START : Clutter.ActorAlign.END,
                icon_size: 12,
                style: this._invertArrowIcon ? "padding-left: 6px;" : null
            });
            this._invertArrowIcon ? this.insert_child_at_index(this._arrowIcon, 0) : this.add_child(this._arrowIcon);
        }

        this.label_actor = this.label;
        this._menuLayout._oldX = -1;
        this._menuLayout._oldY = -1;
        this.connect('motion-event', this._onMotionEvent.bind(this)); 
        this.connect('enter-event', this._onEnterEvent.bind(this)); 
        this.connect('leave-event', this._onLeaveEvent.bind(this)); 
    }

    setRecentlyInstalledIndicator(shouldShow){
        this.isRecentlyInstalled = shouldShow;
        if(shouldShow){
            this._indicator = new St.Icon({
                icon_name: 'message-indicator-symbolic',
                style_class: 'arc-menu-menu-item-indicator',
                icon_size: INDICATOR_ICON_SIZE,
                x_expand: true,
                y_expand: false,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER
            });
            if(this._settings.get_boolean("disable-category-arrows") || this._invertArrowIcon)
                this.add_child(this._indicator);
            else{
                this.insert_child_at_index(this._indicator, this.get_n_children() - 1);
                if(this._arrowIcon)
                    this._arrowIcon.x_expand = false;
            }
        }
        else if(this._indicator && this.contains(this._indicator)){
            if(this._arrowIcon)
                this._arrowIcon.x_expand = true;
            this.remove_child(this._indicator);
        }
    }

    displayAppList(){
        this._menuLayout.activeCategory = this._name;
        Utils.activateCategory(this._category, this._menuLayout, this, null);
    }

    activate(event) {
        this.displayAppList();
        if(this._menuLayout.layoutProperties.SupportsCategoryOnHover)
            this._menuLayout.setActiveCategory(this, true); 
        super.activate(event);
    }

    _onEnterEvent(actor, event) {
        if(this._menuLayout.navigatingCategoryLeaveEventID){
            GLib.source_remove(this._menuLayout.navigatingCategoryLeaveEventID);
            this._menuLayout.navigatingCategoryLeaveEventID = null;
        }
    }

    _onLeaveEvent(actor, event) {
        if(!this._menuLayout.navigatingCategoryLeaveEventID){
            this._menuLayout.navigatingCategoryLeaveEventID = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
                this._menuLayout.navigatingCategory = null;
                this._menuLayout.navigatingCategoryLeaveEventID = null;
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _onMotionEvent(actor, event) {
        if(this._menuLayout.layoutProperties.SupportsCategoryOnHover && this._settings.get_boolean('activate-on-hover')){
            if (!this._menuLayout.navigatingCategory) {
                this._menuLayout.navigatingCategory = this;
            }

            if (this._isInTriangle(event.get_coords())){
                if(this._menuLayout.activeCategory !== this._name && this._menuLayout.navigatingCategory === this)
                    this.activate(Clutter.get_current_event());
                return true;
            }
            this._menuLayout.navigatingCategory = this;
            return true;
        }
    }

    _isInTriangle([x, y]){
        let [posX, posY] = this._menuLayout.navigatingCategory.get_transformed_position();

        //the mouse is still in the active category
        if (this._menuLayout.navigatingCategory === this){
            this._menuLayout._oldX = x;
            this._menuLayout._oldY = y;
            return true;
        }

        if(!this._menuLayout.navigatingCategory)
            return false;

        let width = this._menuLayout.navigatingCategory.width;
        let height = this._menuLayout.navigatingCategory.height;

        let maxX = this._horizontalFlip ? posX : posX + width;
        let maxY = posY + height;

        let distance = Math.abs(maxX - this._menuLayout._oldX);
        let point1 = [this._menuLayout._oldX, this._menuLayout._oldY]
        let point2 = [maxX, posY - distance];
        let point3 = [maxX, maxY + distance];

        let area = Utils.areaOfTriangle(point1, point2, point3);
        let a1 = Utils.areaOfTriangle([x, y], point2, point3);
        let a2 = Utils.areaOfTriangle(point1, [x, y], point3);
        let a3 = Utils.areaOfTriangle(point1, point2, [x, y]);
        return area === a1 + a2 + a3;
    }
});

var SimpleMenuItem = GObject.registerClass(class Arc_Menu_SimpleMenuItem extends CategoryMenuItem{  
    _init(menuLayout, category) {
        super._init(menuLayout, category);            
        this.subMenu = new PopupMenu.PopupMenu(this.actor,.5,St.Side.LEFT);
        this.subMenu.connect("open-state-changed", (menu, open) => {
            if(!open){
                let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
                appsScrollBoxAdj.set_value(0);
            }
        });

        Main.uiGroup.add_actor(this.subMenu.actor);  
        this.section = new PopupMenu.PopupMenuSection();
        this.subMenu.addMenuItem(this.section);  
        
        this.applicationsScrollBox = this._menuLayout._createScrollBox({
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class: 'left-scroll-area ' + (this._menuLayout.disableFadeEffect ? '' : 'small-vfade'),
            overlay_scrollbars: true
        });           
        this._menuLayout.subMenuManager.addMenu(this.subMenu);
        this.applicationsBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox.style = 'max-height: 25em;';
        this.applicationsBox._delegate = this.applicationsBox;
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.section.actor.add_actor(this.applicationsScrollBox);

        this.actor.connect('notify::active',()=> this.setActive(this.actor.active));
        if(this.subMenu._keyPressId)
            this.actor.disconnect(this.subMenu._keyPressId);
        this.applicationsScrollBox.connect("key-press-event",(actor, event)=>{
            let symbol = event.get_key_symbol();
            switch (symbol) {
                case Clutter.KEY_Right:
                case Clutter.KEY_Left:
                    this.subMenu.toggle();
                    this.actor.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
                case Clutter.KEY_Escape:
                    if(this.subMenu.isOpen){
                        this.subMenu.toggle();
                        this.actor.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
                    }
                    return Clutter.EVENT_STOP;
                default:
                    return Clutter.EVENT_PROPAGATE;
            }
        });
        this.actor.connect("key-press-event",(actor, event)=>{
            let symbol = event.get_key_symbol();
            switch (symbol) {
                case Clutter.KEY_Escape:
                    if(this.subMenu.isOpen){
                        this.subMenu.toggle();
                    }
                    return Clutter.EVENT_STOP;
                case Clutter.KEY_Left:    
                case Clutter.KEY_Right:
                case Clutter.KEY_Return:
                    if(!this.subMenu.isOpen){
                        let navigateFocus = true;
                        this.activate(event, navigateFocus);
                        this.subMenu.actor.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
                        return Clutter.EVENT_STOP;
                    }
                    else{
                        return Clutter.EVENT_PROPAGATE;
                    }
                default:
                    return Clutter.EVENT_PROPAGATE;
            }
        });
        this.updateStyle();
    }

    setActive(active){
        if(this._menuLayout.activeMenuItem != null && this._menuLayout.arcMenu.isOpen)
            this._menuLayout.activeMenuItem = null;
    }

    updateStyle(){
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
       
        this.subMenu.actor.hide();
        if(customStyle){
            this.subMenu.actor.style_class = 'arc-menu-boxpointer';
            this.subMenu.actor.add_style_class_name('arc-menu');
        }
        else
        {       
            this.subMenu.actor.style_class = 'popup-menu-boxpointer';
            this.subMenu.actor.add_style_class_name('popup-menu');
        }
    }

    displayAppList(){
        this._menuLayout.activeCategory = this._name;
    }

    activate(event, navigateFocus = true) {
        this._menuLayout.activeCategory = this._name;
        Utils.activateCategory(this._category, this._menuLayout, this, true);
        this.subMenu.toggle();
        if(navigateFocus)
            this.subMenu.actor.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
        this._menuLayout.setActiveCategory(this, true);
    }

    _onMotionEvent(actor, event) {
        if (!this._menuLayout.navigatingCategory) {
            this._menuLayout.navigatingCategory = this;
        }

        if (this._isInTriangle(event.get_coords())){
            if(this._menuLayout.activeCategory !== this._name && this._menuLayout.navigatingCategory === this){
                let navigateFocus = false;
                this.activate(event, navigateFocus);
            }
            return true;
        }
        this._menuLayout.navigatingCategory = this;
        return true;
    }
});
// SubMenu Category item class
var CategorySubMenuItem = GObject.registerClass(class Arc_Menu_CategorySubMenuItem extends PopupMenu.PopupSubMenuMenuItem{  
    _init(menuLayout, category) {
        super._init('',true);
        this._category = category;
        this._menuLayout = menuLayout;
        this._settings = this._menuLayout._settings;
        this._name = "";
        this.isSimpleMenuItem = false;
        this._active = false;
        this.applicationsMap = new Map();
        this.appList = [];

        let [name, gicon, iconName, fallbackIconName] = Utils.getCategoryDetails(this._category);
        this._name = _(name);
        if(gicon)
            this.icon.gicon = gicon;
        else if(iconName)
            this.icon.icon_name = iconName;
        else
            this.icon.fallback_icon_name = fallbackIconName;

        this.label.text = this._name;
        this.icon.icon_size = MEDIUM_ICON_SIZE;

        let panAction = new Clutter.PanAction({ interpolate: false });
        panAction.connect('pan', (action) => {
            this._menuLayout._blockActivateEvent = true;
            this._menuLayout.onPan(action, this.menu.actor);
        });
        panAction.connect('gesture-cancel',(action) =>  this._menuLayout.onPanEnd(action, this.menu.actor));
        panAction.connect('gesture-end', (action) => this._menuLayout.onPanEnd(action, this.menu.actor));
        this.menu.actor.add_action(panAction);
        
        this._updateIcon();
        this.menu.actor.style = 'max-height: 250px;';
        this.menu.actor.overlay_scrollbars = true;
        this.menu.actor.style_class = 'popup-sub-menu ' + (this._menuLayout.disableFadeEffect ? '' : 'small-vfade');
        this.menu._needsScrollbar = this._needsScrollbar.bind(this);
        this.actor.connect('notify::active',()=> this.setActive(this.actor.active));
        this.menu.connect('open-state-changed', () => {
            if(!this.menu.isOpen){
                let scrollbar= this.menu.actor.get_vscroll_bar().get_adjustment();
                scrollbar.set_value(0);
            }
        });
    }

    setRecentlyInstalledIndicator(shouldShow){
        this.isRecentlyInstalled = shouldShow;
        if(shouldShow){
            this._indicator = new St.Icon({
                icon_name: 'message-indicator-symbolic',
                style_class: 'arc-menu-menu-item-indicator',
                icon_size: INDICATOR_ICON_SIZE,
                x_expand: true,
                y_expand: false,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER
            });
            if(this._settings.get_boolean("disable-category-arrows"))
                this.actor.add_child(this._indicator);
            else
                this.actor.insert_child_at_index(this._indicator, this.actor.get_n_children() - 1);
        }
        else if(this._indicator && this.actor.contains(this._indicator)){
            this.actor.remove_child(this._indicator);
        }
    }

    setActive(active){
        if(active)
            this._menuLayout.activeMenuItem = this;
        else if(this._menuLayout.arcMenu.isOpen)
            this._menuLayout.activeMenuItem = null;
    }

    _updateIcon() {
        let largeIcons = this._settings.get_boolean('enable-large-icons');
        if(this._settings.get_enum('menu-layout') !== Constants.MenuLayout.SIMPLE_2){
            this.applicationsMap.forEach((value,key,map)=>{
                map.get(key)._updateIcon();
            });
            this.icon.icon_size = largeIcons ? MEDIUM_ICON_SIZE : SMALL_ICON_SIZE;
        } 
    }

    forceLargeIcon(size){
        this.applicationsMap.forEach((value,key,map)=>{
            map.get(key).forceLargeIcon(size);
        });
        this.icon.icon_size = size ? size : MEDIUM_ICON_SIZE;
    }

    _needsScrollbar() {
        let topMenu = this.menu;
        let [, topNaturalHeight] = topMenu.actor.get_preferred_height(-1);
        let topThemeNode = topMenu.actor.get_theme_node();

        let topMaxHeight = topThemeNode.get_max_height();
        let needsScrollbar = topMaxHeight >= 0 && topNaturalHeight >= topMaxHeight;
        if(needsScrollbar)
            this.menu.actor.style = 'min-height:150px; max-height: 250px;';
        else
            this.menu.actor.style = 'max-height: 250px;';
        return needsScrollbar;
    }
    loadMenu(){
        let children = this.menu.box.get_children();
        for (let i = 0; i < children.length; i++) {
            let item = children[i];
            this.menu.box.remove_actor(item);
        }
        let appList = [];
        this.applicationsMap.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        }); 
        for (let i = 0; i < appList.length; i++) {
            let app = appList[i];
            let item = this.applicationsMap.get(app);
            if(item.actor.get_parent()){
                item.actor.get_parent().remove_actor(item.actor);
            }
            if (!item.actor.get_parent()) {
                this.menu.box.add_actor(item.actor);
            }  
        }
    }
    _setOpenState(open) {
        if(this.isSimpleMenuItem){
            if(open){
                this._menuLayout.activeCategory = this._name;
                Utils.activateCategory(this._category, this._menuLayout, this, true);
            }
        }
        else{
            if(open){
                this.loadMenu();
            }
        }
        this.setSubmenuShown(open);
    }
});

// Place Info class
var PlaceInfo = class Arc_Menu_PlaceInfo {
    constructor(file, name, icon) {
        this.file = file;
        this.name = name ? name : this._getFileName();
        this.icon = icon ? icon : null;
        this.gicon = icon ? null : this.getIcon();
    }
    launch(timestamp) {
        let launchContext = global.create_app_launch_context(timestamp, -1);
        Gio.AppInfo.launch_default_for_uri(this.file.get_uri(), launchContext);
    }
    getIcon() {
        try {
            let info = this.file.query_info('standard::symbolic-icon', 0, null);
            return info.get_symbolic_icon();

        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                if (!this.file.is_native()) {
                    return new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
                } else {
                    return new Gio.ThemedIcon({ name: 'folder-symbolic' });
                }
            }
        }
    }
    _getFileName() {
        try {
            let info = this.file.query_info('standard::display-name', 0, null);
            return info.get_display_name();
        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                return this.file.get_basename();
            }
        }
    }
};
Signals.addSignalMethods(PlaceInfo.prototype);

// Menu Place Shortcut item class
var PlaceMenuItem = GObject.registerClass(class Arc_Menu_PlaceMenuItem extends ArcMenuPopupBaseMenuItem{ 
    _init(menuLayout, info) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._info = info;
        this._icon = new St.Icon({
            gicon: info.gicon ? info.gicon : info.icon,
            icon_size: SMALL_ICON_SIZE
        });

        this.add_child(this._icon);
        this.label = new St.Label({
            text: _(info.name),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.add_child(this.label);
        this._changedId = this._info.connect('changed', this._propertiesChanged.bind(this));
        this.connect('destroy', this._onDestroy.bind(this));
        let layout = this._menuLayout._settings.get_enum('menu-layout'); 
        if(layout === Constants.MenuLayout.PLASMA)
            this._updateIcon();
    }
    
    setIconSizeLarge(){
        this._icon.icon_size = MEDIUM_ICON_SIZE;
    }

    _updateIcon() {
        let largeIcons = this._menuLayout._settings.get_boolean('enable-large-icons');
        this._icon.icon_size = largeIcons ? MEDIUM_ICON_SIZE : SMALL_ICON_SIZE;
    }

    _onDestroy() {
        if (this._changedId) {
            this._info.disconnect(this._changedId);
            this._changedId = 0;
        }
    }
    activate(event) {
        this._info.launch(event.get_time());
        this._menuLayout.arcMenu.toggle();
        super.activate(event);
    }
    _propertiesChanged(info) {
        this._icon.gicon = info.icon;
        this.label.text = info.name;
    }
});

var SearchBox = GObject.registerClass({
    Signals: {
        'search-changed': { param_types: [GObject.TYPE_STRING] },
        'entry-key-focus-in': { },
        'entry-key-press': { param_types: [Clutter.Event.$gtype] },
    },
},
    class Arc_Menu_SearchBox extends St.Entry {
    _init(menuLayout) {
        super._init({
            hint_text: _("Type to search…"),
            track_hover: true,
            can_focus: true,
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            name: "ArcSearchEntry"
        });

        this.searchResults = menuLayout.searchResults;

        this._findIcon = new St.Icon({
            style_class: 'search-entry-icon',
            icon_name: 'edit-find-symbolic',
            icon_size: 16
        });
        this._clearIcon = new St.Icon({
            style_class: 'search-entry-icon',
            icon_name: 'edit-clear-symbolic',
            icon_size: 16
        });
        this.set_primary_icon(this._findIcon);

        this._text = this.get_clutter_text();
        this._textChangedId = this._text.connect('text-changed', this._onTextChanged.bind(this));
        this._keyPressId = this._text.connect('key-press-event', this._onKeyPress.bind(this));
        this._keyFocusInId = this._text.connect('key-focus-in', this._onKeyFocusIn.bind(this));
        this._keyFocusInId = this._text.connect('key-focus-out', this._onKeyFocusOut.bind(this));
        this._searchIconClickedId = this.connect('secondary-icon-clicked', () => this.clear());
        this.connect('destroy', this._onDestroy.bind(this));
    }

    updateStyle(removeBorder){
        let style = this.style;
        this.style = style.replace("border-width: 0;", "");
        if(removeBorder)
            this.style += 'border-width: 0;'; 
    }

    get entryBox(){
        return this;
    }

    get actor(){
        return this;
    }

    getText() {
        return this.get_text();
    }

    setText(text) {
        this.set_text(text);
    }

    grabKeyFocus() {
        this.grab_key_focus();
    }

    hasKeyFocus() {
        return this.contains(global.stage.get_key_focus());
    }

    clear() {
        this.set_text('');
    }

    isEmpty() {
        return this.get_text() == '';
    }

    _onKeyFocusOut(){
        if(!this.isEmpty()){
            this.add_style_pseudo_class('focus');
            return Clutter.EVENT_STOP;
        }
    }

    _onTextChanged() {
        let searchString = this.get_text();
        if(!this.isEmpty())
            this.set_secondary_icon(this._clearIcon);
        else{
            this.remove_style_pseudo_class('focus');
            this.set_secondary_icon(null);
        }
            
        this.emit('search-changed', searchString);
    }

    _onKeyPress(actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter) {
            if (!this.isEmpty()) {
                if (this.searchResults.getTopResult() && this.searchResults._highlightDefault) {
                    this.searchResults.getTopResult().activate(event);
                }
            }
            return Clutter.EVENT_STOP;
        }
        this.emit('entry-key-press', event);
        return Clutter.EVENT_PROPAGATE;
    }

    _onKeyFocusIn() {
        this.emit('entry-key-focus-in');
        return Clutter.EVENT_PROPAGATE;
    }

    _onDestroy() {
        if (this._textChangedId) {
            this._text.disconnect(this._textChangedId);
            this._textChangedId = null;
        }
        if (this._keyPressId) {
            this._text.disconnect(this._keyPressId);
            this._keyPressId = null;
        }
        if (this._keyFocusInId) {
            this._text.disconnect(this._keyFocusInId);
            this._keyFocusInId = null;
        }
        if(this._searchIconClickedId){
            this.disconnect(this._searchIconClickedId);
            this._searchIconClickedId = null;
        }
    }
});

/**
 * This class is responsible for the appearance of the menu button.
 */
var MenuButtonWidget = class Arc_Menu_MenuButtonWidget{
    constructor() {
        this.actor = new St.BoxLayout({
            style_class: 'panel-status-menu-box',
            pack_start: false
        });
        this._arrowIcon = PopupMenu.arrowIcon(St.Side.BOTTOM);
        this._arrowIcon.add_style_class_name('arc-menu-arrow');

        this._icon = new St.Icon({
            icon_name: 'start-here-symbolic',
            style_class: 'arc-menu-icon',
            track_hover:true,
            reactive: true,
        });
        this._label = new St.Label({
            text: _("Applications"),
            y_expand: true,
            style_class: 'arc-menu-text',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.actor.add_child(this._icon);
        this.actor.add_child(this._label);
        this.actor.add_child(this._arrowIcon);
    }

    setActiveStylePseudoClass(enable){
        if(enable){
            this._arrowIcon.add_style_pseudo_class('active');
            this._icon.add_style_pseudo_class('active');
            this._label.add_style_pseudo_class('active');
        }
        else{
            this._arrowIcon.remove_style_pseudo_class('active');
            this._icon.remove_style_pseudo_class('active');
            this._label.remove_style_pseudo_class('active');
        }
    }

    updateArrowIconSide(side){
        let iconName;
        switch (side) {
        case St.Side.TOP:
            iconName = 'pan-down-symbolic';
            break;
        case St.Side.RIGHT:
            iconName = 'pan-start-symbolic';
            break;
        case St.Side.BOTTOM:
            iconName = 'pan-up-symbolic';
            break;
        case St.Side.LEFT:
            iconName = 'pan-end-symbolic';
            break;
        }
        this._arrowIcon.icon_name = iconName;
    }

    getPanelLabel() {
        return this._label;
    }

    getPanelIcon() {
        return this._icon;
    }

    showArrowIcon() {
        if (!this.actor.contains(this._arrowIcon)) {
            this.actor.add_child(this._arrowIcon);
        }
    }

    hideArrowIcon() {
        if (this.actor.contains(this._arrowIcon)) {
            this.actor.remove_child(this._arrowIcon);
        }
    }

    showPanelIcon() {
        if (!this.actor.contains(this._icon)) {
            this.actor.add_child(this._icon);
        }
    }

    hidePanelIcon() {
        if (this.actor.contains(this._icon)) {
            this.actor.remove_child(this._icon);
        }
    }

    showPanelText() {
        if (!this.actor.contains(this._label)) {
            this.actor.add_child(this._label);
        }
    }

    hidePanelText() {
        this._label.style = '';
        if (this.actor.contains(this._label)) {
            this.actor.remove_child(this._label);
        }
    }

    setPanelTextStyle(style){
        this._label.style = style;
    }
};

var DashMenuButtonWidget = class Arc_Menu_DashMenuButtonWidget{
    constructor(menuButton, settings) {
        this._menuButton = menuButton;
        this._settings = settings;
        this.actor = new St.Button({
            style_class: 'show-apps',
            track_hover: true,
            can_focus: true,
            toggle_mode: false,
            reactive: false
        });
        this.actor._delegate = this;
        this.icon = new imports.ui.iconGrid.BaseIcon(_("Show Applications"),
                                            { setSizeManually: true,
                                            showLabel: false,
                                            createIcon: this._createIcon.bind(this) });
        this._icon = new St.Icon({
            icon_name: 'start-here-symbolic',
            style_class: 'arc-menu-icon',
            icon_size: 15,
            track_hover:true,
            reactive: true
        });

        this._labelText = _("ArcMenu");
        this.label = new St.Label({ style_class: 'dash-label' });
        this.label.hide();
        Main.layoutManager.addChrome(this.label);
        this.label_actor = this.label;
        this.actor.add_actor(this.icon);
        
        this.child = this.actor;
    }   
    showLabel() {
        if (!this._labelText)
            return;

        this.label.set_text(this._labelText);
        this.label.opacity = 0;
        this.label.show();

        let [stageX, stageY] = this.actor.get_transformed_position();
        let node = this.label.get_theme_node();

        let itemWidth  = this.actor.allocation.x2 - this.actor.allocation.x1;
        let itemHeight = this.actor.allocation.y2 - this.actor.allocation.y1;

        let labelWidth = this.label.get_width();
        let labelHeight = this.label.get_height();

        let x, y, xOffset, yOffset;

        let position = this._menuButton._panel._settings.get_enum('dock-position');
        this._isHorizontal = ((position == St.Side.TOP) || (position == St.Side.BOTTOM));
        let labelOffset = node.get_length('-x-offset');
        switch (position) {
            case St.Side.LEFT:
                yOffset = Math.floor((itemHeight - labelHeight) / 2);
                y = stageY + yOffset;
                xOffset = labelOffset;
                x = stageX + this.actor.get_width() + xOffset;
                break;
            case St.Side.RIGHT:
                yOffset = Math.floor((itemHeight - labelHeight) / 2);
                y = stageY + yOffset;
                xOffset = labelOffset;
                x = Math.round(stageX) - labelWidth - xOffset;
                break;
            case St.Side.TOP:
                y = stageY + labelOffset + itemHeight;
                xOffset = Math.floor((itemWidth - labelWidth) / 2);
                x = stageX + xOffset;
                break;
            case St.Side.BOTTOM:
                yOffset = labelOffset;
                y = stageY - labelHeight - yOffset;
                xOffset = Math.floor((itemWidth - labelWidth) / 2);
                x = stageX + xOffset;
                break;
        }
        
        // keep the label inside the screen border
        // Only needed fot the x coordinate.
    
        // Leave a few pixel gap
        let gap = 5;
        let monitor = Main.layoutManager.findMonitorForActor(this.actor);
        if (x - monitor.x < gap)
            x += monitor.x - x + labelOffset;
        else if (x + labelWidth > monitor.x + monitor.width - gap)
            x -= x + labelWidth - (monitor.x + monitor.width) + gap;
    
        this.label.remove_all_transitions();
        this.label.set_position(x, y);
        this.label.ease({
            opacity: 255,
            duration: Dash.DASH_ITEM_LABEL_SHOW_TIME,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD
        });
    }
    hideLabel() {
        this.label.ease({
            opacity: 0,
            duration: Dash.DASH_ITEM_LABEL_HIDE_TIME,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => this.label.hide()
        });
    }
    _createIcon(size) {
        this._icon = new St.Icon({  
            icon_name: 'start-here-symbolic',
            style_class: 'arc-menu-icon',
            track_hover:true,
            icon_size: size,
            reactive: true
        });
        let path = this._settings.get_string('custom-menu-button-icon');
        let iconString = Utils.getMenuButtonIcon(this._settings, path);
        this._icon.set_gicon(Gio.icon_new_for_string(iconString));

        return this._icon;
    }
    getPanelIcon() {
        return this._icon;
    }

};

var WorldClocksSection = GObject.registerClass(class Arc_Menu_WorldClocksSection extends St.Button {
    _init() {
        super._init({
            style_class: 'world-clocks-button',
            can_focus: true,
            x_expand: true
        });
        this._clock = new imports.gi.GnomeDesktop.WallClock();
        this._clockNotifyId = 0;

        this._locations = [];

        let layout = new Clutter.GridLayout({ orientation: Clutter.Orientation.VERTICAL });
        this._grid = new St.Widget({ style_class: 'world-clocks-grid',
                                        x_expand: true,
                                        layout_manager: layout });
        layout.hookup_style(this._grid);

        this.child = this._grid;

        this._clocksApp = null;
        this._clocksProxy = new ClocksProxy(
            Gio.DBus.session,
            'org.gnome.clocks',
            '/org/gnome/clocks',
            this._onProxyReady.bind(this),
            null /* cancellable */,
            Gio.DBusProxyFlags.DO_NOT_AUTO_START | Gio.DBusProxyFlags.GET_INVALIDATED_PROPERTIES);

        this._clockSettings = new Gio.Settings({
            schema_id: 'org.gnome.shell.world-clocks',
        });
        this.clocksChangedID = this._clockSettings.connect('changed', this._clocksChanged.bind(this));
        this._clocksChanged();

        this._appSystem = Shell.AppSystem.get_default();
        this.syncID = this._appSystem.connect('installed-changed',
            this._sync.bind(this));
        this.connect('destroy', this._onDestroy.bind(this));
        this._sync();
    }

    _onDestroy(){
        if(this.syncID){
            this._appSystem.disconnect(this.syncID);
            this.syncID = null;
        } 
        if(this.clocksChangedID){
            this._clockSettings.disconnect(this.clocksChangedID);
            this.clocksChangedID = null;
        }
        if(this.clocksProxyID){
            this._clocksProxy.disconnect(this.clocksProxyID);
            this.clocksProxyID = null;
        }
        if (this._clockNotifyId){
            this._clock.disconnect(this._clockNotifyId);
            this._clockNotifyId = null;
        }
    }

    vfunc_clicked() {
        if (this._clocksApp)
            this._clocksApp.activate();
    }

    _sync() {
        this._clocksApp = this._appSystem.lookup_app('org.gnome.clocks.desktop');
        this.visible = this._clocksApp != null;
    }

    _clocksChanged() {
        this._grid.destroy_all_children();
        this._locations = [];

        let world = imports.gi.GWeather.Location.get_world();
        let clocks = this._clockSettings.get_value('locations').deep_unpack();
        for (let i = 0; i < clocks.length; i++) {
            let l = world.deserialize(clocks[i]);
            if (l && l.get_timezone() != null)
                this._locations.push({ location: l });
        }

        this._locations.sort((a, b) => {
            return a.location.get_timezone().get_offset() -
                    b.location.get_timezone().get_offset();
        });

        let layout = this._grid.layout_manager;
        let title = this._locations.length == 0
            ? _("Add world clocks…")
            : _("World Clocks");
        let header = new St.Label({ x_align: Clutter.ActorAlign.START,
                                    text: title });
        header.style = "font-weight: bold;";
        layout.attach(header, 0, 0, 2, 1);
        this.label_actor = header;

        let localOffset = GLib.DateTime.new_now_local().get_utc_offset();

        for (let i = 0; i < this._locations.length; i++) {
            let l = this._locations[i].location;

            let name = l.get_city_name() || l.get_name();
            let label = new St.Label({  text: name,
                                        x_align: Clutter.ActorAlign.START,
                                        y_align: Clutter.ActorAlign.CENTER,
                                        x_expand: true });
            label.style = "font-weight: normal; font-size: 0.9em;";
            let time = new St.Label();
            time.style = "font-feature-settings: \"tnum\"; font-size: 1.2em;";
            let otherOffset = this._getTimeAtLocation(l).get_utc_offset();
            let offset = (otherOffset - localOffset) / GLib.TIME_SPAN_HOUR;
            let fmt = Math.trunc(offset) == offset ? '%s%.0f' : '%s%.1f';
            let prefix = offset >= 0 ? '+' : '-';
            let tz = new St.Label({ text: fmt.format(prefix, Math.abs(offset)),
                                    x_align: Clutter.ActorAlign.END,
                                    y_align: Clutter.ActorAlign.CENTER });
            tz.style = "font-feature-settings: \"tnum\"; font-size: 0.9em;";
            if (this._grid.text_direction == Clutter.TextDirection.RTL) {
                layout.attach(tz, 0, i + 1, 1, 1);
                layout.attach(time, 1, i + 1, 1, 1);
                layout.attach(label, 2, i + 1, 1, 1);
            } else {
                layout.attach(label, 0, i + 1, 1, 1);
                layout.attach(time, 1, i + 1, 1, 1);
                layout.attach(tz, 2, i + 1, 1, 1);
            }

            this._locations[i].actor = time;
        }

        if (this._grid.get_n_children() > 1) {
            if (!this._clockNotifyId) {
                this._clockNotifyId =
                    this._clock.connect('notify::clock', this._updateLabels.bind(this));
            }
            this._updateLabels();
        } else {
            if (this._clockNotifyId)
                this._clock.disconnect(this._clockNotifyId);
            this._clockNotifyId = 0;
        }
    }

    _getTimeAtLocation(location) {
        let tz = GLib.TimeZone.new(location.get_timezone().get_tzid());
        return GLib.DateTime.new_now(tz);
    }

    _updateLabels() {
        for (let i = 0; i < this._locations.length; i++) {
            let l = this._locations[i];
            let now = this._getTimeAtLocation(l.location);
            l.actor.text = Util.formatTime(now, { timeOnly: true });
        }
    }

    _onProxyReady(proxy, error) {
        if (error) {
            log(`Failed to create GNOME Clocks proxy: ${error}`);
            return;
        }

        this.clocksProxyID = this._clocksProxy.connect('g-properties-changed',
            this._onClocksPropertiesChanged.bind(this));
        this._onClocksPropertiesChanged();
    }

    _onClocksPropertiesChanged() {
        if (this._clocksProxy.g_name_owner == null)
            return;

        this._clockSettings.set_value('locations',
            new GLib.Variant('av', this._clocksProxy.Locations));
    }
});
    
var WeatherSection = GObject.registerClass(class Arc_Menu_WeatherSection extends St.Button {
    _init() {
        super._init({
            style_class: 'weather-button',
            can_focus: true,
            x_expand: true
        });
        this._weatherClient = new imports.misc.weather.WeatherClient();

        let box = new St.BoxLayout({
            vertical: true,
            x_expand: true,
        });

        this.child = box;

        let titleBox = new St.BoxLayout({ });
        let label = new St.Label({
            x_align: Clutter.ActorAlign.START,
            x_expand: true,
            y_align: Clutter.ActorAlign.END,
            text: _('Weather'),
        })
        label.style = "font-weight: bold; padding-bottom: 5px;";
        titleBox.add_child(label);
        box.add_child(titleBox);

        this._titleLocation = new St.Label({
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.END,
        });
        this._titleLocation.style = "font-weight: bold; padding-bottom: 5px;";
        titleBox.add_child(this._titleLocation);

        let layout = new Clutter.GridLayout({ orientation: Clutter.Orientation.VERTICAL });
        this._forecastGrid = new St.Widget({
            style_class: 'weather-grid',
            layout_manager: layout,
        });
        layout.hookup_style(this._forecastGrid);
        box.add_child(this._forecastGrid);

        this.syncID = this._weatherClient.connect('changed', this._sync.bind(this));
        this.connect('destroy', this._onDestroy.bind(this));
        this._sync();

    }
    _onDestroy(){
        if(this.syncID){
            this._weatherClient.disconnect(this.syncID);
            this.syncID = null;
        } 
        this._weatherClient = null;
    }
    vfunc_map() {
        this._weatherClient.update();
        super.vfunc_map();
    }

    vfunc_clicked() {
        this._weatherClient.activateApp();
    }

    _getInfos() {
        let forecasts = this._weatherClient.info.get_forecast_list();

        let now = GLib.DateTime.new_now_local();
        let current = GLib.DateTime.new_from_unix_local(0);
        let infos = [];
        for (let i = 0; i < forecasts.length; i++) {
            const [valid, timestamp] = forecasts[i].get_value_update();
            if (!valid || timestamp === 0)
                continue;  // 0 means 'never updated'

            const datetime = GLib.DateTime.new_from_unix_local(timestamp);
            if (now.difference(datetime) > 0)
                continue; // Ignore earlier forecasts

            if (datetime.difference(current) < GLib.TIME_SPAN_HOUR)
                continue; // Enforce a minimum interval of 1h

            if (infos.push(forecasts[i]) == 5)
                break; // Use a maximum of five forecasts

            current = datetime;
        }
        return infos;
    }

    _addForecasts() {
        let layout = this._forecastGrid.layout_manager;

        let infos = this._getInfos();
        if (this._forecastGrid.text_direction == Clutter.TextDirection.RTL)
            infos.reverse();

        let col = 0;
        infos.forEach(fc => {
            const [valid_, timestamp] = fc.get_value_update();
            let timeStr = Util.formatTime(new Date(timestamp * 1000), {
                timeOnly: true
            });
            const [, tempValue] = fc.get_value_temp(imports.gi.GWeather.TemperatureUnit.DEFAULT);
            const tempPrefix = tempValue >= 0 ? ' ' : '';

            let time = new St.Label({
                text: timeStr,
                x_align: Clutter.ActorAlign.CENTER,
            });
            time.style = "font-size: 0.8em;"
            let icon = new St.Icon({
                style_class: 'weather-forecast-icon',
                icon_name: fc.get_symbolic_icon_name(),
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
            });
            let temp = new St.Label({
                text: '%s%.0f°'.format(tempPrefix, tempValue),
                x_align: Clutter.ActorAlign.CENTER,
            });

            temp.clutter_text.ellipsize = imports.gi.Pango.EllipsizeMode.NONE;
            time.clutter_text.ellipsize = imports.gi.Pango.EllipsizeMode.NONE;

            layout.attach(time, col, 0, 1, 1);
            layout.attach(icon, col, 1, 1, 1);
            layout.attach(temp, col, 2, 1, 1);
            col++;
        });
    }

    _setStatusLabel(text) {
        let layout = this._forecastGrid.layout_manager;
        let label = new St.Label({ text });
        layout.attach(label, 0, 0, 1, 1);
    }

    _updateForecasts() {
        this._forecastGrid.destroy_all_children();

        if (!this._weatherClient.hasLocation) {
            this._setStatusLabel(_("Select a location…"));
            return;
        }

        let info = this._weatherClient.info;
        let loc = info.get_location();
        if (loc.get_level() !== imports.gi.GWeather.LocationLevel.CITY && loc.has_coords()) {
            let world = imports.gi.GWeather.Location.get_world();
            loc = world.find_nearest_city(...loc.get_coords());
        }
        this._titleLocation.text = loc.get_name();

        if (this._weatherClient.loading) {
            this._setStatusLabel(_("Loading…"));
            return;
        }

        if (info.is_valid()) {
            this._addForecasts();
            return;
        }

        if (info.network_error())
            this._setStatusLabel(_("Go online for weather information"));
        else
            this._setStatusLabel(_("Weather information is currently unavailable"));
    }

    _sync() {
        this.visible = this._weatherClient.available;

        if (!this.visible)
            return;

        this._titleLocation.visible = this._weatherClient.hasLocation;

        this._updateForecasts();
    }
});

function _isToday(date) {
    let now = new Date();
    return now.getYear() == date.getYear() &&
           now.getMonth() == date.getMonth() &&
           now.getDate() == date.getDate();
}
