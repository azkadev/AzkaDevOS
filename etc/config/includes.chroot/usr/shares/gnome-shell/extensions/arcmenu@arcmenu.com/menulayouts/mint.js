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

const {Clutter, GLib, Gio, Gtk, Shell, St} = imports.gi;
const appSys = Shell.AppSystem.get_default();
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton, {
            Search: true,
            AppType: Constants.AppDisplayType.LIST,
            SearchType: Constants.AppDisplayType.LIST,
            GridColumns: 1,
            ColumnSpacing: 0,
            RowSpacing: 0,
            SupportsCategoryOnHover: true,
            VerticalMainBox: false
        });
    }
    createLayout(){
        super.createLayout();
        //Stores the Pinned Icons on the left side
        this.actionsScrollBox = new St.ScrollView({
            x_expand: false,
            y_expand: false,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'small-vfade'
        });   
        this.actionsScrollBox.set_policy(St.PolicyType.NEVER, St.PolicyType.EXTERNAL);
        this.actionsBox = new St.BoxLayout({ 
            vertical: true
        });
        this.actionsScrollBox.add_actor(this.actionsBox);
        this.actionsScrollBox.clip_to_allocation = true;
        
        this.actionsScrollBox.style = "width: 62px; margin: 10px 20px; background-color:rgba(186, 196,201, 0.1); border-color:rgba(186, 196,201, 0.2); border-width: 1px; border-radius: 5px;";
        this.actionsBox.style = "margin: 0px; spacing: 10px; padding: 21px 0px;";
        //check if custom ArcMenu is enabled
        if( this._settings.get_boolean('enable-custom-arc-menu'))
            this.actionsBox.add_style_class_name('arc-menu');

        this.mainBox.add(this.actionsScrollBox);
        this.rightMenuBox= new St.BoxLayout({ 
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true 
        });
        this.mainBox.add(this.rightMenuBox);

        this.searchBox = new MW.SearchBox(this);
        this._searchBoxChangedId = this.searchBox.connect('search-changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('entry-key-press', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('entry-key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        if(this._settings.get_enum('searchbar-default-top-location') === Constants.SearchbarLocation.TOP){
            this.searchBox.style = "margin: 10px 20px 10px 0px;";
            this.rightMenuBox.add(this.searchBox.actor);
        }
        else
            this.rightMenuBox.style = "margin-top: 10px;";
        
        //Sub Main Box -- stores left and right box
        this.subMainBox= new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL
        });
        this.rightMenuBox.add(this.subMainBox);

        this.rightBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true,
            style_class: 'right-box'
        });

        this.applicationsBox = new St.BoxLayout({
            vertical: true
        });

        this.applicationsScrollBox = this._createScrollBox({
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: this.disableFadeEffect ? '' : 'small-vfade',
        });   

        let rightPanelWidth = this._settings.get_int('right-panel-width');
        rightPanelWidth += 45;
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.applicationsScrollBox.style = "width: " + rightPanelWidth + "px;";

        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.rightBox.add(this.applicationsScrollBox);

        this.leftBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true,
            style_class: 'left-box'
        });

        let horizonalFlip = this._settings.get_boolean("enable-horizontal-flip");
        this.subMainBox.add(horizonalFlip ? this.rightBox : this.leftBox);  
        this.subMainBox.add(this._createVerticalSeparator());
        this.subMainBox.add(horizonalFlip ? this.leftBox : this.rightBox);

        this.categoriesScrollBox = this._createScrollBox({
            x_expand: true, 
            y_expand: false,
            y_align: Clutter.ActorAlign.START,
            style_class: 'left-scroll-area ' + (this.disableFadeEffect ? '' : 'small-vfade'),
            overlay_scrollbars: true
        });

        this.leftBox.add(this.categoriesScrollBox);
        this.categoriesBox = new St.BoxLayout({ vertical: true });

        this.categoriesScrollBox.add_actor( this.categoriesBox);  
        this.categoriesScrollBox.clip_to_allocation = true;
        if(this._settings.get_enum('searchbar-default-top-location') === Constants.SearchbarLocation.BOTTOM){
            this.searchBox.style = "margin: 10px 20px 10px 0px;";
            this.rightMenuBox.add(this.searchBox.actor);
        }
        this.loadPinnedApps();
        this.loadExtraPinnedApps();
        this.loadCategories();
        this.displayCategories();
        this.setDefaultMenuView(); 
    }

    _addSeparator(){
        this.actionsBox.add(this._createHorizontalSeparator(Constants.SeparatorStyle.SHORT));
    }    

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.categoryDirectories.values().next().value.displayAppList();
        this.activeMenuItem = this.categoryDirectories.values().next().value;
    }

    _reload() {
        super.reload(); 
        let rightPanelWidth = this._settings.get_int('right-panel-width');
        rightPanelWidth += 45;
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.applicationsScrollBox.style = "width: " + rightPanelWidth + "px;";
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuItem(this, categoryEnum);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }

        super.loadCategories();
    }

    loadExtraPinnedApps(){
        this.actionsBox.destroy_all_children();
        super.loadExtraPinnedApps(this._settings.get_strv('mint-pinned-app-list'), this._settings.get_int('mint-separator-index'));
    }

    _createExtraPinnedAppsList(){
        let pinnedApps = [];
        //Find the Default Web Browser, if found add to pinned apps list, if not found delete the placeholder.
        //Will only run if placeholder is found. Placeholder only found with default settings set.  
        let [res, stdout, stderr, status] = GLib.spawn_command_line_sync("xdg-settings get default-web-browser");
        let webBrowser = String.fromCharCode.apply(null, stdout);
        let browserName = webBrowser.split(".desktop")[0];
        browserName+=".desktop";
        this._app = appSys.lookup_app(browserName);
        if(this._app){
            let appIcon = this._app.create_icon_texture(25);
            let iconName = '';
            if(appIcon.icon_name)
                iconName = appIcon.icon_name;
            else if(appIcon.gicon)
                iconName = appIcon.gicon.to_string();
            pinnedApps.push(this._app.get_name(), iconName, this._app.get_id());
        }
        pinnedApps.push(_("Terminal"), "utilities-terminal", "org.gnome.Terminal.desktop");
        pinnedApps.push(_("Settings"), "emblem-system-symbolic", "gnome-control-center.desktop");

        let software = Utils.findSoftwareManager();
        if(software)
            pinnedApps.push(_("Software"), 'system-software-install-symbolic', software);
        else
            pinnedApps.push(_("Documents"), "ArcMenu_Documents", "ArcMenu_Documents");
        
        pinnedApps.push(_("Files"), "system-file-manager", "org.gnome.Nautilus.desktop");
        pinnedApps.push(_("Log Out"), "application-exit-symbolic", "ArcMenu_LogOut");
        pinnedApps.push(_("Lock"), "changes-prevent-symbolic", "ArcMenu_Lock");
        pinnedApps.push(_("Power Off"), "system-shutdown-symbolic", "ArcMenu_PowerOff");

        this.shouldLoadPinnedApps = false; // We don't want to trigger a setting changed event
        this._settings.set_strv('mint-pinned-app-list', pinnedApps);
        this.shouldLoadPinnedApps = true;
        return pinnedApps;  
    }   

    displayCategories(){
        super.displayCategories(this.categoriesBox);
    }
}
