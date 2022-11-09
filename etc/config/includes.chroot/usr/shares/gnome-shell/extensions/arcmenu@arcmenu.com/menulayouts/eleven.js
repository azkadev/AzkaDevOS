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

const {Clutter, Gio, GLib, Gtk, Shell, St} = imports.gi;
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
            AppType: Constants.AppDisplayType.LIST,
            SearchType: Constants.AppDisplayType.GRID,
            GridColumns: 6,
            ColumnSpacing: 10,
            RowSpacing: 10,
            IconGridSize: 38,
            ListSearchResults_IconSize: 38,
            IconGridStyle: 'SmallIconGrid',
            VerticalMainBox: true,
        });
    }

    createLayout(){
        super.createLayout();

        this.topBox = new St.BoxLayout({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            vertical: false
        });

        this.subMainBox= new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.mainBox.add(this.subMainBox);

        this.searchBox = new MW.SearchBox(this);
        this.searchBox.name = "ArcSearchEntryRound";
        this.searchBox.style = "margin: 5px 25px 10px 25px;";
        this._searchBoxChangedId = this.searchBox.connect('search-changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('entry-key-press', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('entry-key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.topBox.add(this.searchBox.actor);

        this.applicationsBox = new St.BoxLayout({
            vertical: true,
            style: "padding-bottom: 10px;"
        });
        this.applicationsScrollBox = this._createScrollBox({
            clip_to_allocation: true,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            style_class: this.disableFadeEffect ? '' : 'vfade',
        });   
        this.applicationsScrollBox.style = "width:700px;";    
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.subMainBox.add(this.applicationsScrollBox);

        this.arcMenu.box.style = "padding-bottom:0px;";
        this.actionsContainerBoxStyle = "margin: 0px; spacing: 0px;background-color:rgba(186, 196,201, 0.1) ; padding: 12px 5px;"+
                                            "border-color:rgba(186, 196,201, 0.2) ; border-top-width: 1px;";
        this.themeNodeBorderRadius = "";
        this.actionsContainerBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.END,
            vertical: false,
            style: this.actionsContainerBoxStyle + this.themeNodeBorderRadius
        });

        this.subMainBox.add(this.actionsContainerBox);
        
        this.actionsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: false
        });
        this.actionsBox.style = "margin: 0px 25px; spacing: 10px;";
        this.appsBox = new St.BoxLayout({
            vertical: true
        });
        this.actionsContainerBox.add(this.actionsBox);

        this.appShortcuts = [];
        this.shortcutsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: true,
            style: 'padding: 0px 40px;'
        });

        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: this.layoutProperties.ColumnSpacing,
            row_spacing: this.layoutProperties.RowSpacing,
            column_homogeneous: true
        });
        this.shortcutsGrid = new St.Widget({ 
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            layout_manager: layout 
        });
        layout.hookup_style(this.shortcutsGrid);
        this.shortcutsBox.add(this.shortcutsGrid);

        this.user = new MW.UserMenuItem(this);
        this.user.x_expand = false;
        this.user.x_align = Clutter.ActorAlign.CENTER;
        this.user.style = "width: 250px; margin: 0px 115px 0px 10px;"
        this.actionsBox.add(this.user.actor);

        let path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD);
        if (path !== null){
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _("Downloads"));
            let placeMenuItem = new MW.PlaceButtonItem(this, placeInfo);
            this.actionsBox.add_actor(placeMenuItem.actor);
        }

        path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        if (path !== null){
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _("Documents"));
            let placeMenuItem = new MW.PlaceButtonItem(this, placeInfo);
            this.actionsBox.add_actor(placeMenuItem.actor);
        }

        let settingsButton = new MW.SettingsButton(this);
        settingsButton.actor.expand = false;
        settingsButton.actor.margin = 5;
        this.actionsBox.add(settingsButton.actor);

        this.leaveButton = new MW.LeaveButton(this);
        this.leaveButton.actor.expand = false;
        this.leaveButton.actor.margin = 5;
        this.actionsBox.add(this.leaveButton.actor);

        this.loadPinnedApps();
        this.layoutProperties.AppType = Constants.AppDisplayType.LIST;
        this.loadCategories();
        this.setDefaultMenuView();
        this.updateIcons();
    }

    updateIcons(){
        let iconSize = this.layoutProperties.IconGridSize;
        this.applicationsMap.forEach((value,key,map)=>{
            map.get(key).forceLargeIcon(iconSize);
        });
        if(this.layoutProperties.Search)
            this.searchResults._reset();
    }

    loadPinnedApps(){
        this.layoutProperties.AppType = Constants.AppDisplayType.GRID;
        super.loadPinnedApps();
    }

    loadFrequentApps(){
        let labelRow = this.createLabelRow(_("Frequent Apps"));
        this.applicationsBox.add(labelRow);
        let mostUsed = Shell.AppUsage.get_default().get_most_used();
        this.appShortcuts = [];
        
        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show()){
                let item = new MW.ApplicationMenuItem(this, mostUsed[i]);
                item.forceLargeIcon(this.layoutProperties.IconGridSize);
                this.appShortcuts.push(item);
            }
        }
    }
    
    setDefaultMenuView(){
        this.setGridLayout(Constants.AppDisplayType.GRID, 6, 10);
        super.setDefaultMenuView();
        this.loadFrequentApps();
        this.activeCategory = _("Pinned Apps");
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
        this.displayPinnedApps();
    }

    _clearActorsFromBox(box){
        if(this.allAppsLabel && this.mainBox.contains(this.allAppsLabel)){
            this.mainBox.remove_actor(this.allAppsLabel);
        }
        super._clearActorsFromBox(box);
    }

    displayAllApps(){
        this.setGridLayout(Constants.AppDisplayType.LIST, 1, 5);
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

    reload() {
        this.shortcutsBox.destroy_all_children();  
        super.reload();
    }

    updateStyle(){
        super.updateStyle();
        let removeMenuArrow = this._settings.get_boolean('remove-menu-arrow'); 
       
        let themeNode = this.arcMenu.actor.get_theme_node();
        let borderRadius = themeNode.get_length('-arrow-border-radius');
        this.themeNodeBorderRadius = "border-radius: 0px 0px " + borderRadius + "px " + borderRadius + "px;";
        this.actionsContainerBox.style = this.actionsContainerBoxStyle + this.themeNodeBorderRadius;
        
        if(removeMenuArrow)
            this.arcMenu.box.style = "padding-bottom:0px; margin:0px;";
        else
            this.arcMenu.box.style = "padding-bottom:0px;";
    }

    setGridLayout(appType, columns, spacing){
        this.applicationsGrid.x_align = appType === Constants.AppDisplayType.LIST ? Clutter.ActorAlign.FILL : Clutter.ActorAlign.CENTER;
        this.applicationsGrid.style = appType === Constants.AppDisplayType.LIST ? 'padding: 0px 10px 0px 25px;' : null;
        this.applicationsGrid.layout_manager.column_spacing = spacing;
        this.applicationsGrid.layout_manager.row_spacing = spacing;
        this.layoutProperties.GridColumns = columns;
        this.layoutProperties.AppType = appType;
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();
        this.hasPinnedApps = true;
        super.loadCategories();
    }

    displayPinnedApps() {
        this._clearActorsFromBox(this.applicationsBox);
        this.activeCategory = _("Pinned Apps");
        this._displayAppList(this.pinnedAppsArray, Constants.CategoryType.PINNED_APPS, this.applicationsGrid);

        if(this.appShortcuts.length > 0){
            this.activeCategory = _("Frequent Apps");
            this.setGridLayout(Constants.AppDisplayType.GRID, 2, 10);
            this._displayAppList(this.appShortcuts, Constants.CategoryType.HOME_SCREEN, this.shortcutsGrid);
            this.setGridLayout(Constants.AppDisplayType.GRID, 6, 10);
        }

        if(!this.applicationsBox.contains(this.shortcutsBox))
            this.applicationsBox.add(this.shortcutsBox);
    }

    _displayAppList(apps, category, grid){      
        super._displayAppList(apps, category, grid);
        let label = this.createLabelRow(this.activeCategory);

        if(category === Constants.CategoryType.PINNED_APPS){
            label.style = 'padding: 0px 15px;'
            label.label.style = 'font-weight: bold; padding: 15px 0px;';
            label.add(new MW.AllAppsButton(this));
            this.applicationsBox.insert_child_at_index(label, 0);
        }
        else if(category === Constants.CategoryType.HOME_SCREEN){
            label.style = 'padding: 0px 15px;'
            label.label.style = 'font-weight: bold; padding: 15px 0px;';
            this.applicationsBox.insert_child_at_index(label, 2);
        }
        else if(category === Constants.CategoryType.ALL_PROGRAMS){
            this.allAppsLabel = label;
            label.style = 'padding: 0px 30px 0px 15px;';
            label.label.style = 'font-weight: bold; padding: 15px 0px;';
            label.add(new MW.BackButton(this));
            this.mainBox.insert_child_at_index(this.allAppsLabel, 0);        
        }      
    }

    _onSearchBoxChanged(searchBox, searchString) {        
        if(searchBox.isEmpty()){
            if(this.mainBox.contains(this.topBox))
                this.mainBox.remove_actor(this.topBox);
        }    
        else{
            if(!this.mainBox.contains(this.topBox))
                this.mainBox.insert_child_at_index(this.topBox, 0);
        }
            
        super._onSearchBoxChanged(searchBox, searchString);
    }

    destroy(isReload){        
        this.arcMenu.box.style = null;
        this.arcMenu.actor.style = null;

        super.destroy(isReload);
    }
}
