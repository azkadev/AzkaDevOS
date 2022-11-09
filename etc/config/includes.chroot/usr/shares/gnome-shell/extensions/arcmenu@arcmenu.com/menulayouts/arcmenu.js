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

const {Clutter, Gtk, Shell, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton,{
            Search: true,
            AppType: Constants.AppDisplayType.LIST,
            SearchType: Constants.AppDisplayType.LIST,
            GridColumns: 1,
            ColumnSpacing: 0,
            RowSpacing: 0,
            VerticalMainBox: true
        });
    }

    createLayout(){
        super.createLayout();
        this.searchBox = new MW.SearchBox(this);
        this._searchBoxChangedId = this.searchBox.connect('search-changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('entry-key-press', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('entry-key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        if(this._settings.get_enum('searchbar-default-bottom-location') === Constants.SearchbarLocation.TOP){
            this.searchBox.style = "margin: 0px 10px 5px 10px;";
            this.mainBox.add(this.searchBox.actor);
        }
            
        this.buttonPressEventID = global.stage.connect("button-press-event", () => {
            if(this.arcMenu.isOpen && this.backButton.visible){
                let event = Clutter.get_current_event();
                if(event.get_button() === 8){
                    this.backButton.activate(event);
                }
            }
        });

        //subMainBox stores left and right box
        this.subMainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL
        });
        this.mainBox.add(this.subMainBox);

        this.leftBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            vertical: true,
            y_align: Clutter.ActorAlign.FILL,
            style_class: 'left-box'
        });

        //Applications Box - Contains Favorites, Categories or programs
        this.applicationsScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: true, 
            y_align: Clutter.ActorAlign.START,
            style_class: 'left-scroll-area ' + (this.disableFadeEffect ? '' : 'small-vfade'),
            overlay_scrollbars: true,
            reactive:true
        });
        this.leftBox.add(this.applicationsScrollBox);
        this.applicationsBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox.add_actor(this.applicationsBox);

        this.navigateBox = new St.BoxLayout({ 
            vertical: true,
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.END
        });
        this.navigateBox.add(this._createHorizontalSeparator(Constants.SeparatorStyle.LONG));
        
        this.backButton = new MW.BackMenuItem(this);
        this.navigateBox.add(this.backButton.actor);
        
        this.viewProgramsButton = new MW.ViewAllPrograms(this);
        this.navigateBox.add(this.viewProgramsButton.actor);
        this.leftBox.add(this.navigateBox);
        if(this._settings.get_enum('searchbar-default-bottom-location') === Constants.SearchbarLocation.BOTTOM){
            this.searchBox.style = "margin: 10px 10px 5px 10px;";
            this.leftBox.add(this.searchBox.actor);
        }
            
        this.rightBox = new St.BoxLayout({
            vertical: true,
            style_class: 'right-box'
        });

        let horizonalFlip = this._settings.get_boolean("enable-horizontal-flip");
        this.subMainBox.add(horizonalFlip ? this.rightBox : this.leftBox);  
        this.subMainBox.add(this._createVerticalSeparator());
        this.subMainBox.add(horizonalFlip ? this.leftBox : this.rightBox);

        this.placesShortcuts = false;
        this.externalDevicesShorctus = false;
        this.networkDevicesShorctus = false;
        this.bookmarksShorctus = false;
        this.softwareShortcuts = false;

        if(!this._settings.get_boolean('disable-user-avatar')){
            this.user = new MW.UserMenuItem(this);
            this.rightBox.add(this.user.actor);
            this.rightBox.add(this._createHorizontalSeparator(Constants.SeparatorStyle.SHORT));
        }

        this.shortcutsBox = new St.BoxLayout({
            vertical: true
        });

        this.shortcutsScrollBox = this._createScrollBox({
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: this.disableFadeEffect ? '' : 'small-vfade',
        });    

        this.shortcutsScrollBox.add_actor(this.shortcutsBox);
        this.rightBox.add(this.shortcutsScrollBox);

        // Add place shortcuts to menu (Home,Documents,Downloads,Music,Pictures,Videos)
        this._displayPlaces();

        //draw bottom right horizontal separator + logic to determine if should show
        let shouldDraw = false;
        if(this._settings.get_value('directory-shortcuts-list').deep_unpack().length>0){
            this.placesShortcuts=true;
        }
        if(this._settings.get_value('application-shortcuts-list').deep_unpack().length>0){
            this.softwareShortcuts = true;
        }
        
        //check to see if should draw separator
        if(this.placesShortcuts && (this._settings.get_boolean('show-external-devices') || this.softwareShortcuts || this._settings.get_boolean('show-bookmarks'))  )
            shouldDraw=true;  
        if(shouldDraw){
            this.shortcutsBox.add(this._createHorizontalSeparator(Constants.SeparatorStyle.SHORT));
        }

        //External Devices and Bookmarks Shortcuts
        this.externalDevicesBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true
        });	
        this.shortcutsBox.add(this.externalDevicesBox);   

        this._sections = { };
        this.placesManager = new PlaceDisplay.PlacesManager();
        for (let i = 0; i < Constants.SECTIONS.length; i++) {
            let id = Constants.SECTIONS[i];
            this._sections[id] = new St.BoxLayout({
                vertical: true
            });	
            this.placeManagerUpdatedID = this.placesManager.connect(`${id}-updated`, () => {
                this._redisplayPlaces(id);
            });

            this._createPlaces(id);
            this.externalDevicesBox.add(this._sections[id]);
        }

        //Add Application Shortcuts to menu (Software, Settings, Tweaks, Terminal)
        let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview"), _("ArcMenu Settings")];
        let applicationShortcuts = this._settings.get_value('application-shortcuts-list').deep_unpack();
        for(let i = 0; i < applicationShortcuts.length; i++){
            let applicationName = applicationShortcuts[i][0];
            let shortcutMenuItem = new MW.ShortcutMenuItem(this, _(applicationName), applicationShortcuts[i][1], applicationShortcuts[i][2], Constants.AppDisplayType.LIST);
            if(shortcutMenuItem.shouldShow)
                this.shortcutsBox.add(shortcutMenuItem.actor);
        }
        this.actionsScrollBox = new St.ScrollView({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.END,
            hscrollbar_policy: St.PolicyType.AUTOMATIC,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            clip_to_allocation: true,
            overlay_scrollbars: true,
            style_class: 'hfade'
        });

        //create new section for Power, Lock, Logout, Suspend Buttons
        this.actionsBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            style: "spacing: 6px;"
        });	
        this.actionsScrollBox.add_actor(this.actionsBox);  

        let powerOptions = this._settings.get_value("power-options").deep_unpack();
        for(let i = 0; i < powerOptions.length; i++){
            let powerType = powerOptions[i][0];
            let shouldShow = powerOptions[i][1];
            if(shouldShow){
                let powerButton = new MW.PowerButton(this, powerType);
                this.actionsBox.add(powerButton);
            }
        }
        this.rightBox.add(this.actionsScrollBox);
        
        let rightPanelWidth = this._settings.get_int('right-panel-width');
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.shortcutsScrollBox.style = "width: " + rightPanelWidth + "px;";
        
        this.loadPinnedApps();
        this.loadCategories();
        this.setDefaultMenuView(); 
    }

    loadCategories(){
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();
        let defaultMenuView = this._settings.get_enum('default-menu-view');
        if(defaultMenuView === Constants.DefaultMenuView.PINNED_APPS)
            this.hasPinnedApps = true;

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            //If ArcMenu layout set to "Pinned Apps" default view and Extra Categories "Pinned Apps" is enabled,
            //do not display "Pinned Apps" as an extra category -- Same for "Frequent Apps"
            if(categoryEnum == Constants.CategoryType.PINNED_APPS && shouldShow && defaultMenuView === Constants.DefaultMenuView.PINNED_APPS)
                shouldShow = false;
            if(categoryEnum == Constants.CategoryType.FREQUENT_APPS && shouldShow && defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS)
                shouldShow = false;
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuItem(this, categoryEnum);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }        

        super.loadCategories();
    }

    displayPinnedApps(){
        this.activeCategoryType = Constants.CategoryType.PINNED_APPS;
        let defaultMenuView = this._settings.get_enum('default-menu-view');
        if(defaultMenuView === Constants.DefaultMenuView.PINNED_APPS){
            this.viewProgramsButton.actor.show();
            this.backButton.actor.hide();
        }
        else if (defaultMenuView === Constants.DefaultMenuView.CATEGORIES_LIST){
            this.viewProgramsButton.actor.hide();
            this.backButton.actor.show();
        }
        else if (defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS){
            this.viewProgramsButton.actor.show();
            this.backButton.actor.hide();
        }
        super.displayPinnedApps();
    }

    displayAllApps(){
        super.displayAllApps();
        this.backButton.actor.show();
        this.viewProgramsButton.actor.hide();  
    }

    displayCategories(){
        this.activeCategoryType = Constants.CategoryType.CATEGORIES_LIST;
        let defaultMenuView = this._settings.get_enum('default-menu-view');
        if(defaultMenuView === Constants.DefaultMenuView.PINNED_APPS || defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS){
            this.viewProgramsButton.actor.hide();
            this.backButton.actor.show();
        }
        else{
            this.viewProgramsButton.actor.show();
            this.backButton.actor.hide();
        }
        
        super.displayCategories();
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        let defaultMenuView = this._settings.get_enum('default-menu-view');
        if(defaultMenuView === Constants.DefaultMenuView.PINNED_APPS)
            this.displayPinnedApps();
        else if(defaultMenuView === Constants.DefaultMenuView.CATEGORIES_LIST)
            this.displayCategories();
        else if(defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS)
            this.displayFrequentApps();
        
        this.backButton.actor.hide();
        this.viewProgramsButton.actor.show();
    }

    displayCategoryAppList(appList, category){
        super.displayCategoryAppList(appList, category);
        this.backButton.actor.show();
        this.viewProgramsButton.actor.hide();
        this.activeCategoryType = Constants.CategoryType.CATEGORY_APP_LIST; 
    }

    displayFrequentApps(){
        this._clearActorsFromBox();
        this.viewProgramsButton.actor.show();
        this.backButton.actor.hide();
        let mostUsed = Shell.AppUsage.get_default().get_most_used();
        let appList = [];
        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show()){
                let item = new MW.ApplicationMenuItem(this, mostUsed[i]);
                item.forceLargeIcon();
                appList.push(item);
            }
        }
        let activeMenuItemSet = false;
        for (let i = 0; i < appList.length; i++) {
            let item = appList[i];
            if(item.actor.get_parent())
                item.actor.get_parent().remove_actor(item.actor);
            if (!item.actor.get_parent()) 
                this.applicationsBox.add_actor(item.actor);
            if(!activeMenuItemSet){
                activeMenuItemSet = true;  
                this.activeMenuItem = item;
                if(this.arcMenu.isOpen){
                    this.mainBox.grab_key_focus();
                }
            }    
        }
    }

    _onSearchBoxChanged(searchBox, searchString){  
        super._onSearchBoxChanged(searchBox, searchString);  
        if(!searchBox.isEmpty()){  
            this.backButton.actor.show();
            this.viewProgramsButton.actor.hide(); 
            this.activeCategoryType = Constants.CategoryType.SEARCH_RESULTS;   
        }            
    }

    destroy(isReload){
        if(this.buttonPressEventID){
            global.stage.disconnect(this.buttonPressEventID);
            this.buttonPressEventID = null;
        }
        super.destroy(isReload)
    }
}
