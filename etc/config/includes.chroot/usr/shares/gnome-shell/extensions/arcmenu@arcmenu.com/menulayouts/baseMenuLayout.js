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

const {Clutter, GLib, Gio, GMenu, Gtk, Shell, St} = imports.gi;
const AppFavorites = imports.ui.appFavorites;
const appSys = Shell.AppSystem.get_default();
const ArcSearch = Me.imports.search;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MenuLayouts = Me.imports.menulayouts;
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;

//This class handles the core functionality of all the menu layouts.
//Each menu layout extends this class.
var BaseLayout = class {
    constructor(menuButton, layoutProperties){
        this.menuButton = menuButton;
        this._settings = menuButton._settings;
        this.mainBox = menuButton.mainBox; 
        this.contextMenuManager = menuButton.contextMenuManager;
        this.subMenuManager = menuButton.subMenuManager;
        this.arcMenu = menuButton.arcMenu;
        this.section = menuButton.section;
        this.layout = this._settings.get_enum('menu-layout');
        this.layoutProperties = layoutProperties;
        this.isRunning = true;
        this._focusChild = null;
        this.shouldLoadPinnedApps = true;
        this.hasPinnedApps = false;

        if(this.layoutProperties.Search)
            this.searchResults = new ArcSearch.SearchResults(this);

        this._mainBoxKeyPressId = this.mainBox.connect('key-press-event', this._onMainBoxKeyPress.bind(this));
        
        this._tree = new GMenu.Tree({ menu_basename: 'applications.menu' });
        this._treeChangedId = this._tree.connect('changed', () => {
            this.needsReload = true;
        });

        this._gnomeFavoritesReloadID = AppFavorites.getAppFavorites().connect('changed', () => {
            if(this.categoryDirectories){
                let categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.FAVORITES);
                if(categoryMenuItem)
                    this._loadGnomeFavorites(categoryMenuItem);
            }
        });

        this.mainBox.vertical = this.layoutProperties.VerticalMainBox;

        this.createLayout();
        this.updateStyle();
    }

    createLayout(){
        this.disableFadeEffect = this._settings.get_boolean('disable-scrollview-fade-effect');
        this.activeCategoryType = -1;
        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: this.layoutProperties.ColumnSpacing,
            row_spacing: this.layoutProperties.RowSpacing 
        });
        this.applicationsGrid = new St.Widget({ 
            x_expand: true,
            x_align: this.layoutProperties.AppType === Constants.AppDisplayType.LIST ? Clutter.ActorAlign.FILL : Clutter.ActorAlign.CENTER,
            layout_manager: layout 
        });
        layout.hookup_style(this.applicationsGrid);
    }

    updateIcons(){
        this.applicationsMap.forEach((value,key,map)=>{
            map.get(key)._updateIcon();
        });
        let categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.PINNED_APPS);
        if(categoryMenuItem){
            for(let menuItem of categoryMenuItem.appList){
                menuItem._updateIcon();
            }
        }
        if(this.layoutProperties.Search)
            this.searchResults._reset(); 
    }

    resetSearch(){
        this.searchBox.clear();
        this.setDefaultMenuView();  
    }

    setDefaultMenuView(){
        if(this.layoutProperties.Search){
            this.searchBox.clear();
            this.searchResults._reset();
        }

        this._clearActorsFromBox();
        this.resetScrollBarPosition();

        if(this.vertSep)
            this.vertSep.queue_repaint(); 
    }

    resetScrollBarPosition(){
        let appsScrollBoxAdj;

        if(this.applicationsScrollBox){
            appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
            appsScrollBoxAdj.set_value(0);
        }
        if(this.categoriesScrollBox){
            appsScrollBoxAdj = this.categoriesScrollBox.get_vscroll_bar().get_adjustment();
            appsScrollBoxAdj.set_value(0);
        }
        if(this.shortcutsScrollBox){
            appsScrollBoxAdj = this.shortcutsScrollBox.get_vscroll_bar().get_adjustment();
            appsScrollBoxAdj.set_value(0);
        }
        if(this.actionsScrollBox){
            appsScrollBoxAdj = this.actionsScrollBox.get_vscroll_bar().get_adjustment();
            appsScrollBoxAdj.set_value(0);
        }
    }

    reload(){
        let isReload = true;
        this.hasPinnedApps = false;
        this.destroy(isReload);
        if(this.layoutProperties.Search){
            this.searchResults = new ArcSearch.SearchResults(this);    
        }
        this.createLayout();
        this.updateStyle();
    }

    updateStyle(){
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
        if(this.layoutProperties.Search){
            this.searchBox.updateStyle(this._settings.get_boolean('disable-searchbox-border'))
            customStyle ? this.searchResults.setStyle('arc-menu-status-text') : this.searchResults.setStyle(''); 
            if(customStyle){
                this.searchBox.remove_style_class_name('default-search-entry');
                this.searchBox.add_style_class_name('arc-search-entry');
            }
            else{
                this.searchBox.remove_style_class_name('arc-search-entry');
                this.searchBox.add_style_class_name('default-search-entry');
            } 
        }
        if(this.actionsBox){
            this.actionsBox.get_children().forEach((actor) => {
                if(actor instanceof St.Button){
                    customStyle ? actor.add_style_class_name('arc-menu-action') : actor.remove_style_class_name('arc-menu-action');
                }
            });
        }
    }

    loadCategories(categoryWidget = MW.CategoryMenuItem){  
        this.applicationsMap = new Map();    
        this._tree.load_sync();
        let root = this._tree.get_root_directory();
        let iter = root.iter();
        let nextType;
        while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
            if (nextType == GMenu.TreeItemType.DIRECTORY) {
                let dir = iter.get_directory();                  
                if (!dir.get_is_nodisplay()) {
                    let categoryId = dir.get_menu_id();
                    let categoryMenuItem = new categoryWidget(this, dir, this.layoutProperties.AppType);
                    this.categoryDirectories.set(categoryId, categoryMenuItem);
                    let foundRecentlyInstallApp = this._loadCategory(categoryId, dir);
                    categoryMenuItem.setRecentlyInstalledIndicator(foundRecentlyInstallApp);
                    //Sort the App List Alphabetically
                    categoryMenuItem.appList.sort((a, b) => {
                        return a.get_name().toLowerCase() > b.get_name().toLowerCase();
                    });
                }
            }
        }
        let categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.ALL_PROGRAMS);
        if(categoryMenuItem){
            let appList = [];
            this.applicationsMap.forEach((value,key,map) => {
                appList.push(key);
                //Show Recently Installed Indicator on All Programs category
                if(value.isRecentlyInstalled && !categoryMenuItem.isRecentlyInstalled)
                    categoryMenuItem.setRecentlyInstalledIndicator(true);
            });
            appList.sort((a, b) => {
                return a.get_name().toLowerCase() > b.get_name().toLowerCase();
            });
            categoryMenuItem.appList = appList;
        }
        categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.FAVORITES);
        if(categoryMenuItem){
            this._loadGnomeFavorites(categoryMenuItem);
        }
        categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.FREQUENT_APPS);
        if(categoryMenuItem){
            let mostUsed = Shell.AppUsage.get_default().get_most_used();
            for (let i = 0; i < mostUsed.length; i++) {
                if (mostUsed[i] && mostUsed[i].get_app_info().should_show())
                    categoryMenuItem.appList.push(mostUsed[i]);
            }
        }
        categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.PINNED_APPS);
        if(categoryMenuItem){
            this.hasPinnedApps = true;
            categoryMenuItem.appList = categoryMenuItem.appList.concat(this.pinnedAppsArray);
            for(let menuItem of categoryMenuItem.appList){
                menuItem._updateIcon();
            }
        }
        categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.RECENT_FILES);
        if(categoryMenuItem){
            this._loadRecentFiles(categoryMenuItem);
        }
            
    }

    _loadCategory(categoryId, dir, submenuItem) {
        let iter = dir.iter();
        let nextType;
        let foundRecentlyInstallApp = false;
        let isLayoutSimple2 = this.layout == Constants.MenuLayout.SIMPLE_2;
        while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
            if (nextType == GMenu.TreeItemType.ENTRY) {
                let entry = iter.get_entry();
                let id;
                try {
                    id = entry.get_desktop_file_id();
                } catch (e) {
                    continue;
                }
                let app = appSys.lookup_app(id);
                if (!app)
                    app = new Shell.App({ app_info: entry.get_app_info() });
                if (app.get_app_info().should_show()){
                    let item = this.applicationsMap.get(app);
                    if (!item) {
                        item = new MW.ApplicationMenuItem(this, app, this.layoutProperties.AppType);
                    }
                    let disabled = this._settings.get_boolean("disable-recently-installed-apps")
                    if(!disabled && item.isRecentlyInstalled)
                        foundRecentlyInstallApp = true;
                    if(!submenuItem){
                        let categoryMenuItem = this.categoryDirectories.get(categoryId);
                        categoryMenuItem.appList.push(app);
                        this.applicationsMap.set(app, item);
                    }
                    else{
                        submenuItem.applicationsMap.set(app, item);
                    }
                } 
            } 
            else if (nextType == GMenu.TreeItemType.DIRECTORY) {
                let subdir = iter.get_directory();
                if (!subdir.get_is_nodisplay()){
                    if(this._settings.get_boolean('enable-sub-menus') && this.layoutProperties.AppType === Constants.AppDisplayType.LIST && !isLayoutSimple2){
                        let submenuItem = this.applicationsMap.get(subdir);
                        if (!submenuItem) {
                            submenuItem = new MW.CategorySubMenuItem(this, subdir);
                            submenuItem._setParent(this.arcMenu);
                            let categoryMenuItem = this.categoryDirectories.get(categoryId);
                            categoryMenuItem.appList.push(subdir);
                            this.applicationsMap.set(subdir, submenuItem);
                        }
                        let recentlyInstallApp = this._loadCategory(categoryId, subdir, submenuItem);
                        if(recentlyInstallApp)
                            foundRecentlyInstallApp = true;
                        submenuItem.setRecentlyInstalledIndicator(foundRecentlyInstallApp);
                    }
                    else{
                        let recentlyInstallApp = this._loadCategory(categoryId, subdir);
                        if(recentlyInstallApp)
                            foundRecentlyInstallApp = true;
                    }
                }    
            }
        }
        return foundRecentlyInstallApp;
    }

    setRecentlyInstalledIndicator(){
        let disabled = this._settings.get_boolean("disable-recently-installed-apps")
        if(!disabled){
            for(let categoryMenuItem of this.categoryDirectories.values()){
                categoryMenuItem.setRecentlyInstalledIndicator(false);
                for(let i = 0; i < categoryMenuItem.appList.length; i++){
                    let item = this.applicationsMap.get(categoryMenuItem.appList[i]);
                    if(!item)
                        continue;
                    if(item instanceof MW.CategorySubMenuItem){
                        item.setRecentlyInstalledIndicator(false);
                        for(let menuItem of item.applicationsMap.values()){
                            if(menuItem.isRecentlyInstalled){
                                item.setRecentlyInstalledIndicator(true);
                                break;
                            }
                        }
                    }
                    if(item.isRecentlyInstalled){
                        categoryMenuItem.setRecentlyInstalledIndicator(true);
                        break;
                    }   
                }
            }
        }
    }   

    displayCategories(categoriesBox){
        if(!categoriesBox){
            categoriesBox = this.applicationsBox;
        }
        this._clearActorsFromBox(categoriesBox);
        
        let isActiveMenuItemSet = false;
        for(let categoryMenuItem of this.categoryDirectories.values()){
            categoriesBox.add_actor(categoryMenuItem.actor);	
            if(!isActiveMenuItemSet){
                isActiveMenuItemSet = true;
                this.activeMenuItem = categoryMenuItem;
                if(this.arcMenu.isOpen){
                    this.mainBox.grab_key_focus();
                }
            }	 
        }
    }

    _loadGnomeFavorites(categoryMenuItem){
        let appList = AppFavorites.getAppFavorites().getFavorites();

        //Show Recently Installed Indicator on GNOME favorites category
        for(let i = 0; i < appList.length; i++){
            let item = this.applicationsMap.get(appList[i]);
            if(item && item.isRecentlyInstalled && !categoryMenuItem.isRecentlyInstalled)
                categoryMenuItem.setRecentlyInstalledIndicator(true);
        }

        categoryMenuItem.appList = appList;
        if(this.activeCategoryType === Constants.CategoryType.FAVORITES)
            categoryMenuItem.displayAppList();
    }

    _loadRecentFiles(){
        if(!this.recentManager)
            this.recentManager = new Gtk.RecentManager();

        this._recentFiles = this.recentManager.get_items();

        if(!this._recentFilesChangedID){
            this._recentFilesChangedID = this.recentManager.connect('changed', () => {
                this._recentFiles = this.recentManager.get_items();
            });
        }
    }

    displayRecentFiles(box = this.applicationsBox){
        this._clearActorsFromBox(box);
        const homeRegExp = new RegExp('^(' + GLib.get_home_dir() + ')');
        let activeMenuItemSet = false;
        for(let i = 0; i < this._recentFiles.length; i++){
            let file = Gio.File.new_for_uri(this._recentFiles[i].get_uri()).get_path();
            let name = this._recentFiles[i].get_display_name();
            let icon = Gio.content_type_get_symbolic_icon(this._recentFiles[i].get_mime_type()).to_string();
            let placeMenuItem = this.createMenuItem([name, icon, file], Constants.MenuItemType.MENU_ITEM);
            placeMenuItem.description = this._recentFiles[i].get_uri_display().replace(homeRegExp, '~');
            placeMenuItem._updateIcon();
            placeMenuItem.fileUri = this._recentFiles[i].get_uri();
            placeMenuItem._removeBtn = new St.Button({
                style_class: this._settings.get_boolean('enable-custom-arc-menu') ? 'arc-menu-action button' : 'button',
                style: 'padding: 0px 8px;',
                x_expand: true,
                x_align: Clutter.ActorAlign.END
            });
            placeMenuItem._removeBtn.child = new St.Icon({
                icon_name: 'edit-delete-symbolic',
                style_class: 'popup-menu-icon',
                icon_size: 16
            });
            placeMenuItem._removeBtn.connect('clicked', () =>  {
                try {
                    this.recentManager.remove_item(placeMenuItem.fileUri);
                    box.remove_actor(placeMenuItem);
                    placeMenuItem.destroy();
                } catch(err) {
                    log(err);
                }
            });
            placeMenuItem.add(placeMenuItem._removeBtn);
            box.add_actor(placeMenuItem);
            if(!activeMenuItemSet){
                this.activeMenuItem = placeMenuItem;
                activeMenuItemSet = true;
                if(this.arcMenu.isOpen)
                    this.mainBox.grab_key_focus();
            }
        }
    }

    _displayPlaces() {
        var SHORTCUT_TRANSLATIONS = [_("Home"), _("Documents"), _("Downloads"), _("Music"), _("Pictures"), _("Videos"), _("Computer"), _("Network")];
        let directoryShortcuts = this._settings.get_value('directory-shortcuts-list').deep_unpack();
        for (let i = 0; i < directoryShortcuts.length; i++) {
            let directory = directoryShortcuts[i];
            let placeMenuItem = this.createMenuItem(directory, Constants.MenuItemType.MENU_ITEM);
            if(placeMenuItem)
                this.shortcutsBox.add_actor(placeMenuItem.actor);
        }
    }

    loadExtraPinnedApps(pinnedAppsArray, separatorIndex){
        let pinnedApps = pinnedAppsArray;
        //if the extraPinnedApps array is empty, create a default list of apps. 
        if(!pinnedApps.length || !Array.isArray(pinnedApps)){
            pinnedApps = this._createExtraPinnedAppsList();
        }
        
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');

        for(let i = 0;i < pinnedApps.length; i += 3){
            if(i === separatorIndex * 3 && i !== 0)
                this._addSeparator();
            let placeMenuItem = this.createMenuItem([pinnedApps[i],pinnedApps[i + 1], pinnedApps[i + 2]], Constants.MenuItemType.BUTTON);
            if(customStyle) 
                placeMenuItem.actor.add_style_class_name('arc-menu-action');
            if(this.layout === Constants.MenuLayout.MINT)
                placeMenuItem.actor.style = 'min-height: 20px;';
            placeMenuItem.actor.x_expand = false;
            placeMenuItem.actor.y_expand = false;
            placeMenuItem.actor.y_align = Clutter.ActorAlign.CENTER;
            placeMenuItem.actor.x_align = Clutter.ActorAlign.CENTER;
            this.actionsBox.add(placeMenuItem.actor);
        }  
    }

    createMenuItem(menuItemArray, menuItemType){
        let placeInfo, placeMenuItem;
        let command = menuItemArray[2];
        let app = Shell.AppSystem.get_default().lookup_app(command);
        let ShortcutMenuItemClass = menuItemType === Constants.MenuItemType.MENU_ITEM ? MW.ShortcutMenuItem : MW.ShortcutButtonItem;
        let PlaceMenuItemClass = menuItemType === Constants.MenuItemType.MENU_ITEM ? MW.PlaceMenuItem : MW.PlaceButtonItem;

        if(command === "ArcMenu_Home"){
            let homePath = GLib.get_home_dir();
            placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(homePath), _("Home"));
            placeMenuItem = new PlaceMenuItemClass(this, placeInfo);
        }
        else if(command === "ArcMenu_Computer"){
            placeInfo = new PlaceDisplay.RootInfo();
            placeMenuItem = new PlaceMenuItemClass(this, placeInfo);
        }
        else if(command === "ArcMenu_Network"){
            placeInfo = new PlaceDisplay.PlaceInfo('network', Gio.File.new_for_uri('network:///'), _('Network'),'network-workgroup-symbolic');
            placeMenuItem = new PlaceMenuItemClass(this, placeInfo);
        }
        else if(command === "ArcMenu_Software"){
            let software = Utils.findSoftwareManager();
            if(software)
                placeMenuItem = new ShortcutMenuItemClass(this, _("Software"), 'system-software-install-symbolic', software, Constants.AppDisplayType.LIST);
        }
        else if(command === "ArcMenu_Trash"){
            placeMenuItem = new ShortcutMenuItemClass(this, _("Trash"), '', "ArcMenu_Trash", Constants.AppDisplayType.LIST);
        }
        else if(command === Constants.ArcMenuSettingsCommand || command === "ArcMenu_Suspend" || command === "ArcMenu_LogOut" || command === "ArcMenu_PowerOff"
            || command === "ArcMenu_Lock" || command === "ArcMenu_Restart" || command === "ArcMenu_HybridSleep" || command === "ArcMenu_Hibernate" || app){

                placeMenuItem = new ShortcutMenuItemClass(this, menuItemArray[0], menuItemArray[1], menuItemArray[2], Constants.AppDisplayType.LIST);
        }
        else if(command.startsWith("ArcMenu_")){
            let path = command.replace("ArcMenu_",'');

            if(path === "Documents")
                path = imports.gi.GLib.UserDirectory.DIRECTORY_DOCUMENTS;
            else if(path === "Downloads")
                path = imports.gi.GLib.UserDirectory.DIRECTORY_DOWNLOAD;
            else if(path === "Music")
                path = imports.gi.GLib.UserDirectory.DIRECTORY_MUSIC;
            else if(path === "Pictures")
                path = imports.gi.GLib.UserDirectory.DIRECTORY_PICTURES;
            else if(path === "Videos")
                path = imports.gi.GLib.UserDirectory.DIRECTORY_VIDEOS;

            path = GLib.get_user_special_dir(path);
            if (path !== null){
                placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _(menuItemArray[0]));
                placeMenuItem = new PlaceMenuItemClass(this, placeInfo);
            }
        }
        else{
            let path = command;
            placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _(menuItemArray[0]), (menuItemArray[1] !== "ArcMenu_Folder") ? Gio.icon_new_for_string(menuItemArray[1]) : null);
            placeMenuItem = new PlaceMenuItemClass(this, placeInfo);
        }
        return placeMenuItem;
    }

    loadPinnedApps(){
        let pinnedApps = this._settings.get_strv('pinned-app-list');
        this.pinnedAppsArray = null;
        this.pinnedAppsArray = [];
        for(let i = 0; i < pinnedApps.length; i += 3){
            if(i === 0 && pinnedApps[0] === "ArcMenu_WebBrowser")
                this._updatePinnedAppsWebBrowser(pinnedApps);
            let pinnedAppsMenuItem = new MW.PinnedAppsMenuItem(this, pinnedApps[i], pinnedApps[i + 1], pinnedApps[i + 2], this.layoutProperties.AppType);
            pinnedAppsMenuItem.connect('saveSettings', ()=> {
                let array = [];
                for(let i = 0; i < this.pinnedAppsArray.length; i++){
                    array.push(this.pinnedAppsArray[i]._name);
                    array.push(this.pinnedAppsArray[i]._iconPath);
                    array.push(this.pinnedAppsArray[i]._command);		   
                }
                this._settings.set_strv('pinned-app-list',array);
            });
            this.pinnedAppsArray.push(pinnedAppsMenuItem);
        }  
        let categoryMenuItem = this.categoryDirectories ? this.categoryDirectories.get(Constants.CategoryType.PINNED_APPS) : null;
        if(categoryMenuItem){
            categoryMenuItem.appList = null;
            categoryMenuItem.appList = [];
            categoryMenuItem.appList = categoryMenuItem.appList.concat(this.pinnedAppsArray);
            for(let menuItem of categoryMenuItem.appList){
                menuItem._updateIcon();
            }
        } 
    }

    _updatePinnedAppsWebBrowser(pinnedApps){
        //Find the Default Web Browser, if found add to pinned apps list, if not found delete the placeholder.
        //Will only run if placeholder is found. Placeholder only found with default settings set.
        if(pinnedApps[0] === "ArcMenu_WebBrowser"){     
            let [res, stdout, stderr, status] = GLib.spawn_command_line_sync("xdg-settings get default-web-browser");
            let webBrowser = String.fromCharCode.apply(null, stdout);
            let browserName = webBrowser.split(".desktop")[0];
            browserName += ".desktop";
            this._app = appSys.lookup_app(browserName);
            if(this._app){
                pinnedApps[0] = this._app.get_name();
                pinnedApps[1] = '';
                pinnedApps[2] = this._app.get_id();
            }
            else{
                pinnedApps.splice(0,3);
            }
            this.shouldLoadPinnedApps = false; // We don't want to trigger a setting changed event
            this._settings.set_strv('pinned-app-list', pinnedApps);
            this.shouldLoadPinnedApps = true;
        }
    }

    displayPinnedApps(){
        this._clearActorsFromBox();
        this._displayAppList(this.pinnedAppsArray, Constants.CategoryType.PINNED_APPS, this.applicationsGrid);
    }

    placesAddSeparator(id){
        this._sections[id].add_actor(this._createHorizontalSeparator(Constants.SeparatorStyle.SHORT));  
    }

    _redisplayPlaces(id) {
        if(this._sections[id].get_n_children() > 0){
            this.bookmarksShorctus = false;
            this.externalDevicesShorctus = false;
            this.networkDevicesShorctus = false;
            this._sections[id].destroy_all_children();
        }
        this._createPlaces(id);
    }

    _createPlaces(id) {
        let places = this.placesManager.get(id);
        if(this.placesManager.get('network').length > 0)
            this.networkDevicesShorctus = true; 
        if(this.placesManager.get('devices').length > 0)
            this.externalDevicesShorctus=true;  
        if(this.placesManager.get('bookmarks').length > 0)
            this.bookmarksShorctus = true;

        if(this._settings.get_boolean('show-bookmarks')){
            if(id === 'bookmarks' && places.length > 0){
                for (let i = 0; i < places.length; i++){
                    let item = new PlaceDisplay.PlaceMenuItem(this, places[i]);
                    this._sections[id].add_actor(item); 
                } 
                //create a separator if bookmark and software shortcut are both shown
                if(this.bookmarksShorctus && this.softwareShortcuts){
                    this.placesAddSeparator(id);
                }
            }
        }
        if(this._settings.get_boolean('show-external-devices')){
            if(id === 'devices'){
                for (let i = 0; i < places.length; i++){
                    let item = new PlaceDisplay.PlaceMenuItem(this, places[i]);
                    this._sections[id].add_actor(item); 
                }
                if((this.externalDevicesShorctus && !this.networkDevicesShorctus) && (this.bookmarksShorctus || this.softwareShortcuts))
                    this.placesAddSeparator(id);
            }
            if(id === 'network'){
                for (let i = 0; i < places.length; i++){
                    let item = new PlaceDisplay.PlaceMenuItem(this, places[i]);
                    this._sections[id].add_actor(item); 
                }
                if(this.networkDevicesShorctus && (this.bookmarksShorctus || this.softwareShortcuts))
                    this.placesAddSeparator(id);
            }
        }
    }   

    setActiveCategory(category, setActive = true){
        this.activeMenuItem = category;
        if(setActive && this.arcMenu.isOpen)
            this.activeMenuItem.actor.grab_key_focus();
        else if(this.arcMenu.isOpen)
            this.mainBox.grab_key_focus();
    }

    setFrequentAppsList(categoryMenuItem){
        categoryMenuItem.appList = [];
        let mostUsed = Shell.AppUsage.get_default().get_most_used();
        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show())
                categoryMenuItem.appList.push(mostUsed[i]);
        }
    }

    _clearActorsFromBox(box){
        if(!box){
            box = this.applicationsBox;
            this.activeCategoryType = -1;
        }
        let parent = box.get_parent();
        if(parent instanceof St.ScrollView){
            let scrollBoxAdj = parent.get_vscroll_bar().get_adjustment();
            scrollBoxAdj.set_value(0);
        }
        let actors = box.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            if(actor instanceof St.Widget && actor.layout_manager instanceof Clutter.GridLayout){
                actor.get_children().forEach(gridChild => {
                    if(gridChild instanceof MW.CategorySubMenuItem)
                        gridChild.menu.close();
                });
            }
            box.remove_actor(actor);
        }
    }

    displayCategoryAppList(appList, category){
        this._clearActorsFromBox();
        this._displayAppList(appList, category, this.applicationsGrid);
    }

    _displayAppList(apps, category, grid){
        this.activeCategoryType = category;
        grid.remove_all_children();
        let count = 0;
        let top = -1;
        let left = 0;
        let activeMenuItemSet = false;
        let currentCharacter;
        let alphabetizeAllPrograms = this._settings.get_boolean("alphabetize-all-programs") && this.layoutProperties.AppType === Constants.AppDisplayType.LIST;
        let rtl = this.mainBox.get_text_direction() == Clutter.TextDirection.RTL;

        for (let i = 0; i < apps.length; i++) {
            let app = apps[i];
            let item;
            let shouldShow = true;

            if(category === Constants.CategoryType.PINNED_APPS || category === Constants.CategoryType.HOME_SCREEN){
                item = app;
                if(!item.shouldShow)
                    shouldShow = false;
            }
            else{
                item = this.applicationsMap.get(app);
                if (!item) {
                    item = new MW.ApplicationMenuItem(this, app, this.layoutProperties.AppType);
                    this.applicationsMap.set(app, item);
                }
            }

            if(item.actor.get_parent())
                item.actor.get_parent().remove_actor(item.actor);

            if(shouldShow){
                if(!rtl && (count % this.layoutProperties.GridColumns === 0)){
                    top++;
                    left = 0;
                }
                else if(rtl && (left === 0)){
                    top++;
                    left = this.layoutProperties.GridColumns;
                }

                if(alphabetizeAllPrograms && category === Constants.CategoryType.ALL_PROGRAMS){
                    if(currentCharacter !== app.get_name().charAt(0).toLowerCase()){
                        currentCharacter = app.get_name().charAt(0).toLowerCase();

                        let label = this._createHeaderLabel(currentCharacter.toUpperCase());
                        grid.layout_manager.attach(label, left, top, 1, 1);
                        top++;
                    }
                }

                grid.layout_manager.attach(item, left, top, 1, 1);
                item.gridLocation = [left, top];

                if(item instanceof MW.CategorySubMenuItem){
                    top++;
                    grid.layout_manager.attach(item.menu.actor, left, top, 1, 1);
                }
                
                if(!rtl)
                    left++;
                else if(rtl)
                    left--;
                count++;
    
                if(!activeMenuItemSet && grid === this.applicationsGrid){
                    this.activeMenuItem = item;
                    activeMenuItemSet = true;
                    if(this.arcMenu.isOpen)
                        this.mainBox.grab_key_focus();
                }
            }
        }
        if(this.applicationsBox && !this.applicationsBox.contains(this.applicationsGrid))
            this.applicationsBox.add(this.applicationsGrid);
            
        if(this.arcMenu.isOpen)
            this.mainBox.grab_key_focus();
    }

    displayAllApps(){
        let appList = [];
        this.applicationsMap.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });
        this._clearActorsFromBox();
        this._displayAppList(appList, Constants.CategoryType.ALL_PROGRAMS, this.applicationsGrid);
    }

    get activeMenuItem() {
        return this._activeMenuItem;
    }

    set activeMenuItem(item) {
        let itemChanged = item !== this._activeMenuItem;
        if(itemChanged){
            this._activeMenuItem = item;
            if(this.layout === Constants.MenuLayout.LAUNCHER)
                this.createActiveSearchItemPanel(item);
        }
    }
    
    _onSearchBoxKeyPress(searchBox, event) {
        let symbol = event.get_key_symbol();
        switch (symbol) {
            case Clutter.KEY_Up:
            case Clutter.KEY_Down:
            case Clutter.KEY_Left:
            case Clutter.KEY_Right:
                let direction;
                if (symbol === Clutter.KEY_Down || symbol === Clutter.KEY_Up)
                    return Clutter.EVENT_PROPAGATE;
                if (symbol === Clutter.KEY_Right)
                    direction = St.DirectionType.RIGHT;
                if (symbol === Clutter.KEY_Left)
                    direction = St.DirectionType.LEFT;

                let cursorPosition = this.searchBox.clutter_text.get_cursor_position();

                if(cursorPosition === Constants.CaretPosition.END && symbol === Clutter.KEY_Right)
                    cursorPosition = Constants.CaretPosition.END;
                else if(cursorPosition === Constants.CaretPosition.START && symbol === Clutter.KEY_Left)
                    cursorPosition = Constants.CaretPosition.START;
                else
                    cursorPosition = Constants.CaretPosition.MIDDLE;

                if(cursorPosition === Constants.CaretPosition.END){
                    this.searchResults.highlightDefault(false);
                    return this.mainBox.navigate_focus(this.activeMenuItem, direction, false);
                }
                else if(cursorPosition === Constants.CaretPosition.START){
                    this.searchResults.highlightDefault(false);
                    return this.mainBox.navigate_focus(this.activeMenuItem, direction, false);
                }
                return Clutter.EVENT_PROPAGATE;
            default:
                return Clutter.EVENT_PROPAGATE;
        }
    }

    _onSearchBoxKeyFocusIn(searchBox) {
        if (!searchBox.isEmpty()) {
            this.searchResults.highlightDefault(false);
        }
    }

    _onSearchBoxChanged(searchBox, searchString) {        
        if(searchBox.isEmpty()){  
            this.searchResults.setTerms([]);
            this.setDefaultMenuView();                     	          	
            this.searchResults.actor.hide();
        }            
        else{         
            this._clearActorsFromBox(); 
            let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
            appsScrollBoxAdj.set_value(0);
            this.applicationsBox.add(this.searchResults.actor);
            this.searchResults.actor.show();
            searchString = searchString.replace(/^\s+/g, '').replace(/\s+$/g, '');
            this.searchResults.setTerms(searchString.split(/\s+/));
            this.searchResults.highlightDefault(true);
        }            	
    }

    _onMainBoxKeyPress(actor, event) {
        if (event.has_control_modifier()) {
            if(this.searchBox)
                this.searchBox.grabKeyFocus();
            return Clutter.EVENT_PROPAGATE;
        }

        let symbol = event.get_key_symbol();
        let key = event.get_key_unicode();

        switch (symbol) {
            case Clutter.KEY_BackSpace:
                if(this.searchBox && !this.searchBox.hasKeyFocus() && !this.searchBox.isEmpty()){
                    this.searchBox.grabKeyFocus();
                    let newText = this.searchBox.getText().slice(0, -1);
                    this.searchBox.setText(newText);
                }
                return Clutter.EVENT_PROPAGATE;
            case Clutter.KEY_Up:
            case Clutter.KEY_Down:
            case Clutter.KEY_Left:
            case Clutter.KEY_Right:
                let direction;
                if (symbol === Clutter.KEY_Down)
                    direction = St.DirectionType.DOWN;
                if (symbol === Clutter.KEY_Right)
                    direction = St.DirectionType.RIGHT
                if (symbol === Clutter.KEY_Up)
                    direction = St.DirectionType.UP;
                if (symbol === Clutter.KEY_Left)
                    direction = St.DirectionType.LEFT;

                if(this.layoutProperties.Search && this.searchBox.hasKeyFocus() && this.searchResults.hasActiveResult() && this.searchResults.actor.get_parent()){
                    this.searchResults.highlightDefault(false);
                    this.searchResults.getTopResult().actor.grab_key_focus();
                    return actor.navigate_focus(global.stage.key_focus, direction, false);  
                }
                else if(global.stage.key_focus === this.mainBox || (this.layoutProperties.Search && global.stage.key_focus === this.searchBox.actor)){
                    this.activeMenuItem.actor.grab_key_focus();
                    return Clutter.EVENT_STOP;
                }
                return actor.navigate_focus(global.stage.key_focus, direction, false);
            case Clutter.KEY_Tab:
            case Clutter.KEY_KP_Tab:
            case Clutter.KEY_KP_Enter:
            case Clutter.KEY_Return:
            case Clutter.KEY_Escape:
                return Clutter.EVENT_PROPAGATE;
            default:
                if (key.length != 0 && this.searchBox) {
                    this.searchBox.grabKeyFocus();
                    let newText = this.searchBox.getText() + key;
                    this.searchBox.setText(newText);
                }
        }
        return Clutter.EVENT_PROPAGATE;
    }

    destroy(isReload){
        if(this.applicationsBox){
            if(this.applicationsBox.contains(this.applicationsGrid))
                this.applicationsBox.remove_child(this.applicationsGrid);
        }

        if(this.applicationsMap){
            this.applicationsMap.forEach((value,key,map)=>{
                if(value && value.needsDestroy)
                    value.destroy();
            });
            this.applicationsMap = null;
        }

        if(this.categoryDirectories){
            this.categoryDirectories.forEach((value,key,map)=>{
                if(value && value.needsDestroy)
                    value.destroy();
            });
            this.categoryDirectories = null;    
        }

        if(this.pinnedAppsArray){
            for(let i = 0; i < this.pinnedAppsArray.length; i++){
                if(this.pinnedAppsArray[i] && this.pinnedAppsArray[i].needsDestroy)
                    this.pinnedAppsArray[i].destroy();
            }
            this.pinnedAppsArray = null;
        }
        
        if(this.network){
            this.network.destroy();
            this.networkMenuItem.destroy();
        }

        if(this.computer){
            this.computer.destroy();
            this.computerMenuItem.destroy();
        }

        if(this.placesManager){
            for(let id in this._sections){
                this._sections[id].get_children().forEach((child) =>{
                    child.destroy();
                });
            };
            if(this.placeManagerUpdatedID){
                this.placesManager.disconnect(this.placeManagerUpdatedID);
                this.placeManagerUpdatedID = null;
            }
            this.placesManager.destroy();
        }
        if(this.recentManager){
            if(this._recentFilesChangedID){
                this.recentManager.disconnect(this._recentFilesChangedID);
                this._recentFilesChangedID = null;
            }
        }
        if(this.searchBox){
            if (this._searchBoxChangedId > 0) {
                this.searchBox.disconnect(this._searchBoxChangedId);
                this._searchBoxChangedId = 0;
            }
            if (this._searchBoxKeyPressId > 0) {
                this.searchBox.disconnect(this._searchBoxKeyPressId);
                this._searchBoxKeyPressId = 0;
            }
            if (this._searchBoxKeyFocusInId > 0) {
                this.searchBox.disconnect(this._searchBoxKeyFocusInId);
                this._searchBoxKeyFocusInId = 0;
            }
        }

        if(this.searchResults){
            this.searchResults.destroy();
        }

        if(!isReload){
            if (this._mainBoxKeyPressId > 0) {
                this.mainBox.disconnect(this._mainBoxKeyPressId);
                this._mainBoxKeyPressId = 0;
            }

            if (this._treeChangedId > 0) {
                this._tree.disconnect(this._treeChangedId);
                this._treeChangedId = 0;
                this._tree = null;
            }
            if(this._gnomeFavoritesReloadID){
                AppFavorites.getAppFavorites().disconnect(this._gnomeFavoritesReloadID);
                this._gnomeFavoritesReloadID = null;
            }

            this.isRunning = false;
        }

        this.mainBox.destroy_all_children();
    }

    _createScrollBox(params){
        let scrollBox = new MW.ScrollView(params);    
        let panAction = new Clutter.PanAction({ interpolate: false });
        panAction.connect('pan', (action) => {
            this._blockActivateEvent = true;
            this.onPan(action, scrollBox);
        });
        panAction.connect('gesture-cancel',(action) => this.onPanEnd(action, scrollBox));
        panAction.connect('gesture-end', (action) => this.onPanEnd(action, scrollBox));
        scrollBox.add_action(panAction);

        scrollBox.set_policy(St.PolicyType.NEVER, St.PolicyType.AUTOMATIC);
        scrollBox.clip_to_allocation = true;

        return scrollBox;
    }

    _createHeaderLabel(headerLabel){
        let label = new PopupMenu.PopupMenuItem(_(headerLabel), {
            hover: false,
            can_focus: false
        });
        label.actor.add_style_pseudo_class = () => { return false;};
        label.actor.add(this._createHorizontalSeparator(Constants.SeparatorStyle.LONG));
        label.actor.style = 'font-weight: bold;'
        return label;
    }

    createLabelRow(title){
        let labelRow = new PopupMenu.PopupMenuItem(_(title), {
            hover: false,
            can_focus: false
        });  
        labelRow.actor.add_style_pseudo_class = () => { return false;};
        labelRow.label.style = 'font-weight: bold;';
        return labelRow;
    }

    _keyFocusIn(actor) {
        if (this._focusChild == actor)
            return;
        this._focusChild = actor;
        Utils.ensureActorVisibleInScrollView(actor);
    }

    onPan(action, scrollbox) {
        let [dist_, dx_, dy] = action.get_motion_delta(0);
        let adjustment = scrollbox.get_vscroll_bar().get_adjustment();
        adjustment.value -=  dy;
        return false;
    }
    
    onPanEnd(action, scrollbox) {
        let velocity = -action.get_velocity(0)[2];
        let adjustment = scrollbox.get_vscroll_bar().get_adjustment();
        let endPanValue = adjustment.value + velocity * 2;
        adjustment.value = endPanValue;
    }

    _createHorizontalSeparator(style){
        let alignment = Constants.SeparatorAlignment.HORIZONTAL;
        let hSep = new MW.SeparatorDrawingArea(this._settings, alignment, style,{
            x_expand: true,
            y_expand: false,
            y_align: Clutter.ActorAlign.END
        });
        hSep.queue_repaint();
        return hSep;
    }

    _createVerticalSeparator(style){    
        let alignment = Constants.SeparatorAlignment.VERTICAL;
        style = style ? style : Constants.SeparatorStyle.NORMAL;
        this.vertSep = new MW.SeparatorDrawingArea(this._settings, alignment, style,{
            x_expand: true,
            y_expand: true,
            style_class: 'vert-sep'
        });
        this.vertSep.queue_repaint();
        return this.vertSep;
    }
};
