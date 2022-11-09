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

const {Clutter, Gtk, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MW = Me.imports.menuWidgets;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton, {
            Search: true,
            AppType: Constants.AppDisplayType.GRID,
            SearchType: Constants.AppDisplayType.GRID,
            GridColumns: 4,
            ColumnSpacing: 10,
            RowSpacing: 10,
            IconGridSize: 36,
            ListSearchResults_IconSize: 32,
            IconGridStyle: 'SmallIconGrid',
            VerticalMainBox: false
        });
    }
    createLayout(){
        super.createLayout();
        let homeScreen = this._settings.get_boolean('enable-unity-homescreen');
        if(homeScreen)
            this.activeCategory = _("Pinned Apps");
        else
            this.activeCategory = _("All Programs");

        this.arcMenu.actor.style = "-arrow-base:0px;-arrow-rise:0px; -boxpointer-gap: 0px;"; 
        this.arcMenu.box.style = "padding-bottom:0px; padding-top:0px; margin:0px;";
        this.actionsBoxContainer = new St.BoxLayout({
            x_expand: false,
            y_expand: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });

        this.actionsBox = new St.BoxLayout({
            x_expand: false,
            y_expand: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: true
        });
        this.actionsBoxContainer.add(this.actionsBox);
        this.actionsBox.style = "spacing: 5px;";
        this.actionsBoxContainer.style = "margin: 0px 0px 0px 0px; spacing: 10px;background-color:rgba(186, 196,201, 0.1) ; padding: 5px 5px;"+
                                "border-color:rgba(186, 196,201, 0.2) ; border-right-width: 1px;";
        this.mainBox.add(this.actionsBoxContainer);

        this.topBox = new St.BoxLayout({
            x_expand: true,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            vertical: false
        });

        //Sub Main Box -- stores left and right box
        this.subMainBox= new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.subMainBox.add(this.topBox);
        this.mainBox.add(this.subMainBox);
        this.searchBox = new MW.SearchBox(this);
        this.searchBox.name = "ArcSearchEntryRound";
        this.searchBox.style = "margin: 25px 10px 10px 10px;";
        this._searchBoxChangedId = this.searchBox.connect('search-changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('entry-key-press', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('entry-key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.topBox.add(this.searchBox.actor);

        this.applicationsBox = new St.BoxLayout({
            x_align: Clutter.ActorAlign.FILL,
            vertical: true,
            style: "padding-bottom: 10px;"
        });


        this.applicationsScrollBox = this._createScrollBox({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: this.disableFadeEffect ? '' : 'vfade',
        });   
        this.applicationsScrollBox.style = "width:410px;";    
  
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.subMainBox.add(this.applicationsScrollBox);
   
        this.weatherBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.END,
            vertical: true
        });
        this.weatherBox.style = "width:410px;"; 
        this._weatherItem = new MW.WeatherSection();
        this._weatherItem.style = "border-radius:4px; padding: 10px; margin: 0px 25px 25px 25px;";
        this._weatherItem.connect("clicked", ()=> this.arcMenu.close());
        this._clocksItem = new MW.WorldClocksSection();
        this._clocksItem.x_expand = true;
        this._clocksItem.x_align = Clutter.ActorAlign.FILL;
        this._clocksItem.style = "border-radius:4px; padding: 10px; margin: 0px 25px 25px 25px;";
        this._clocksItem.connect("clicked", ()=> this.arcMenu.close());

        this.weatherBox.add(this._clocksItem);
        this.weatherBox.add(this._weatherItem);
        
        this.appShortcuts = [];
        this.shortcutsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: true
        });

        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: this.layoutProperties.ColumnSpacing,
            row_spacing: this.layoutProperties.RowSpacing
        });
        this.shortcutsGrid = new St.Widget({ 
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            layout_manager: layout 
        });
        layout.hookup_style(this.shortcutsGrid);

        this.shortcutsBox.add(this.shortcutsGrid);

        //Add Application Shortcuts to menu (Software, Settings, Tweaks, Terminal)
        let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview"), _("ArcMenu Settings")];
        let applicationShortcuts = this._settings.get_value('application-shortcuts-list').deep_unpack();
        for(let i = 0; i < applicationShortcuts.length; i++){
            let applicationName = applicationShortcuts[i][0];
            let shortcutMenuItem = new MW.ShortcutMenuItem(this, _(applicationName), applicationShortcuts[i][1], applicationShortcuts[i][2], Constants.AppDisplayType.GRID);
            this.appShortcuts.push(shortcutMenuItem);
        }

        this.loadPinnedApps();
        this.loadCategories();
        this.displayCategories();
        this.setDefaultMenuView();
    }

    updateLocation(){       
        let monitorIndex = Main.layoutManager.findIndexForActor(this.menuButton);
        let scaleFactor = Main.layoutManager.monitors[monitorIndex].geometry_scale;
        let monitorWorkArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);

        let screenHeight = monitorWorkArea.height;   
     
        let height =  Math.round(screenHeight / scaleFactor);
        this.mainBox.style = `height: ${height}px`;
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        let homeScreen = this._settings.get_boolean('enable-unity-homescreen');
        if(homeScreen){
            this.activeCategory = _("Pinned Apps");
            this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
            this.displayPinnedApps();
        }
        else{
            this.activeCategory = _("All Programs");
            let isGridLayout = true;
            this.displayAllApps(isGridLayout);   
            this.activeCategoryType = Constants.CategoryType.ALL_PROGRAMS;
        }
    }

    updateStyle(){
        super.updateStyle();
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
        let gapAdjustment = this._settings.get_int('gap-adjustment');

        customStyle ? this._clocksItem.add_style_class_name('arc-menu-action') : this._clocksItem.remove_style_class_name('arc-menu-action');
        customStyle ? this._weatherItem.add_style_class_name('arc-menu-action') : this._weatherItem.remove_style_class_name('arc-menu-action');

        this.arcMenu.actor.style = "-arrow-base:0px; -arrow-rise:0px; -boxpointer-gap: " + gapAdjustment + "px;";
        this.arcMenu.box.style = "padding-bottom:0px; padding-top:0px; margin:0px;";
        for(let categoryMenuItem of this.categoryDirectories.values()){
            categoryMenuItem.updateStyle();	 
        }    
        this.updateLocation();
    }

    updateSearch(){
        this.searchResults._reloadRemoteProviders();
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 
        let categoryMenuItem = new MW.CategoryMenuButton(this, Constants.CategoryType.HOME_SCREEN);
        this.categoryDirectories.set(Constants.CategoryType.HOME_SCREEN, categoryMenuItem);
        this.hasPinnedApps = true;

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(categoryEnum == Constants.CategoryType.PINNED_APPS)
                shouldShow = false;
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuButton(this, categoryEnum);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }

        super.loadCategories(MW.CategoryMenuButton);
    }

    displayCategories(){
        for(let categoryMenuItem of this.categoryDirectories.values()){
            this.actionsBox.add_actor(categoryMenuItem.actor);	 
        }
    }

    displayPinnedApps() {
        if(this.activeCategoryType === Constants.CategoryType.HOME_SCREEN)
            this._clearActorsFromBox(this.applicationsBox);
        else
            this._clearActorsFromBox();
        this.activeCategory = _("Pinned Apps");
        this._displayAppList(this.pinnedAppsArray, Constants.CategoryType.PINNED_APPS, this.applicationsGrid);
        this.activeCategory = _("Shortcuts");
        this._displayAppList(this.appShortcuts, Constants.CategoryType.HOME_SCREEN, this.shortcutsGrid);
        if(!this.applicationsBox.contains(this.shortcutsBox))
            this.applicationsBox.add(this.shortcutsBox);
        let actors = this.weatherBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            this.weatherBox.remove_actor(actors[i]);
        }
        if(this._settings.get_boolean('enable-clock-widget-raven')){
            this.weatherBox.add(this._clocksItem);
        }
        if(this._settings.get_boolean('enable-weather-widget-raven')){
            this.weatherBox.add(this._weatherItem);
        }
        if(!this.subMainBox.contains(this.weatherBox))
            this.subMainBox.add(this.weatherBox);
    }

    displayRecentFiles(){
        super.displayRecentFiles();
        let label = this._createHeaderLabel(_("Recent Files"));
        label.remove_actor(label._ornamentLabel);
        this.applicationsBox.insert_child_at_index(label, 0);
        this.activeCategoryType = Constants.CategoryType.RECENT_FILES;
    }

    displayCategoryAppList(appList, category){
        this._clearActorsFromBox();
        this._displayAppList(appList, category, this.applicationsGrid);
    }
    
    _clearActorsFromBox(box) {
        if(this.subMainBox.contains(this.weatherBox)){
            this.subMainBox.remove_actor(this.weatherBox);
        }
        super._clearActorsFromBox(box);
    }

    _displayAppList(apps, category, grid){      
        super._displayAppList(apps, category, grid);
        let label = this._createHeaderLabel(this.activeCategory);
        label.remove_actor(label._ornamentLabel);

        if(grid === this.applicationsGrid){
            label.actor.style = "padding-left: 10px;";
            this.applicationsBox.insert_child_at_index(label.actor, 0);
        }
        else{
            label.actor.style = "padding-left: 10px; padding-top: 20px;";
            this.applicationsBox.insert_child_at_index(label.actor, 2);
        }
    }
   
    destroy(isReload){
        if(this._clocksItem)
            this._clocksItem.destroy();
        if(this._weatherItem)
            this._weatherItem.destroy();
        
        this.arcMenu.box.style = null;
        this.arcMenu.actor.style = null;
            
        super.destroy(isReload);
    }
}
