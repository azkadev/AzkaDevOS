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

const {Clutter, GLib, Gtk, Shell, St} = imports.gi;
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
            GridColumns: 6,
            ColumnSpacing: 15,
            RowSpacing: 15,
            IconGridSize: 52,
            ListSearchResults_IconSize: 32,
            IconGridStyle: 'LargeIconGrid',
            VerticalMainBox: true,
        });
    }

    createLayout(){
        super.createLayout();
        let homeScreen = this._settings.get_boolean('enable-unity-homescreen');
        if(homeScreen)
            this.activeCategory = _("Pinned Apps");
        else
            this.activeCategory = _("All Programs");

        this.topBox = new St.BoxLayout({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            vertical: false
        });

        this.categoriesTopBox = new St.BoxLayout({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: true
        });

        this.categoriesTopBox.style = "padding: 0px 15px 0px 0px; margin-bottom: 10px;";
        this.mainBox.add(this.topBox);
        this.categoriesButton = new MW.CategoriesButton(this);
        this.categoriesButton.actor.x_expand = false;
        this.categoriesButton.actor.y_expand = false;
        this.categoriesButton.actor.y_align = Clutter.ActorAlign.CENTER;
        this.categoriesButton.actor.x_align = Clutter.ActorAlign.END;
        this.categoriesTopBox.add(this.categoriesButton.actor);
        
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
        this.searchBox.style = "margin: 4px 10px 0px 10px;";
        this._searchBoxChangedId = this.searchBox.connect('search-changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('entry-key-press', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('entry-key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.topBox.add(this.searchBox.actor);
        this.topBox.add(this.categoriesTopBox);

        this.applicationsBox = new St.BoxLayout({
            vertical: true,
            style: "padding-bottom: 10px;"
        });

        this.applicationsScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: this.disableFadeEffect ? '' : 'vfade',
        });   
        this.applicationsScrollBox.style = "width:750px;";    
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.subMainBox.add(this.applicationsScrollBox);

        this.arcMenu.box.style = "padding-bottom:0px;";

        this.actionsContainerBoxStyle = "margin: 0px; spacing: 0px;background-color:rgba(186, 196,201, 0.1) ; padding: 5px 5px;"+
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
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: false
        });
        this.actionsBox.style = "spacing: 10px;";
        this.appsBox = new St.BoxLayout({
            vertical: true
        });
        this.actionsContainerBox.add(this.actionsBox);

        this.widgetBox = new St.BoxLayout({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.END,
            vertical: false,
            style_class: 'datemenu-displays-box'
        });
        
        this.widgetBox.style = "margin: 0px; spacing: 10px; padding: 10px 50px;";   
        this._weatherItem = new MW.WeatherSection();
        this._weatherItem.style = "border-radius:4px; width: 350px; padding: 10px; margin: 0px";
        this._weatherItem.connect("clicked", ()=> this.arcMenu.close());
        this._clocksItem = new MW.WorldClocksSection();
        this._clocksItem.style = "border-radius:4px; padding: 10px; margin: 0px";
        this._clocksItem.connect("clicked", ()=> this.arcMenu.close());

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
        this._createCategoriesMenu();
        this.loadExtraPinnedApps();

        this.setDefaultMenuView();
    }

    _addSeparator(){
        this.actionsBox.add(this._createVerticalSeparator(Constants.SeparatorStyle.SHORT));
    }

    loadExtraPinnedApps(){
        this.actionsContainerBox.remove_actor(this.actionsBox);
        this.actionsBox.destroy_all_children();
        this.actionsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: false
        });
        this.actionsBox.style = "spacing: 10px;";
        this.actionsContainerBox.add(this.actionsBox);

        super.loadExtraPinnedApps(this._settings.get_strv('unity-pinned-app-list'), this._settings.get_int('unity-separator-index'));
    }

    _createExtraPinnedAppsList(){
        let pinnedApps = [];      
        pinnedApps.push(_("Home"), "ArcMenu_Home", "ArcMenu_Home");
        pinnedApps.push(_("Documents"), "ArcMenu_Documents", "ArcMenu_Documents");
        pinnedApps.push(_("Downloads"), "ArcMenu_Downloads", "ArcMenu_Downloads");

        let software = Utils.findSoftwareManager();
        if(software)
            pinnedApps.push(_("Software"), 'system-software-install-symbolic', software);
        else
            pinnedApps.push(_("Computer"), "ArcMenu_Computer", "ArcMenu_Computer");
        
        pinnedApps.push(_("Files"), "system-file-manager", "org.gnome.Nautilus.desktop");
        pinnedApps.push(_("Log Out"), "application-exit-symbolic", "ArcMenu_LogOut");
        pinnedApps.push(_("Lock"), "changes-prevent-symbolic", "ArcMenu_Lock");
        pinnedApps.push(_("Power Off"), "system-shutdown-symbolic", "ArcMenu_PowerOff");

        this.shouldLoadPinnedApps = false; // We don't want to trigger a setting changed event
        this._settings.set_strv('unity-pinned-app-list', pinnedApps);
        this.shouldLoadPinnedApps = true;
        return pinnedApps;  
    }

    _createCategoriesMenu(){
        this.categoriesMenu = new PopupMenu.PopupMenu(this.categoriesButton.actor, 0.5, St.Side.TOP);
        this.categoriesMenu.blockSourceEvents = true;
        this.categoriesMenu.connect('open-state-changed', (menu, open) => {
            if(!open){
                this.categoriesButton.fake_release();
                this.categoriesButton.set_hover(false);
            }
            else{
                if(this.menuButton.tooltipShowingID){
                    GLib.source_remove(this.menuButton.tooltipShowingID);
                    this.menuButton.tooltipShowingID = null;
                    this.menuButton.tooltipShowing = false;
                }
                if(this.categoriesButton.tooltip){
                    this.categoriesButton.tooltip.hide();
                    this.menuButton.tooltipShowing = false;
                }
            }
        });
        this.section = new PopupMenu.PopupMenuSection();
        this.categoriesMenu.addMenuItem(this.section);  
        
        this.leftPanelPopup = new St.BoxLayout({
            vertical: true
        });   
        this.leftPanelPopup._delegate = this.leftPanelPopup;
        this.categoriesScrollBox = this._createScrollBox({
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class: this.disableFadeEffect ? '' : 'small-vfade',
            overlay_scrollbars: true,
            reactive:true
        });        
        this.leftPanelPopup.add(this.categoriesScrollBox);
       
        this.categoriesBox = new St.BoxLayout({
            vertical: true
        });     
        this.categoriesScrollBox.add_actor(this.categoriesBox);
        this.categoriesScrollBox.clip_to_allocation = true;
       
        let themeContext = St.ThemeContext.get_for_stage(global.stage);
        let scaleFactor = themeContext.scale_factor;
        let height =  Math.round(350 / scaleFactor);
        this.leftPanelPopup.style = `max-height: ${height}px`;        
        this.section.actor.add_actor(this.leftPanelPopup); 
        this._displayCategories();
        this.subMenuManager.addMenu(this.categoriesMenu);
        this.categoriesMenu.actor.hide();
        Main.uiGroup.add_actor(this.categoriesMenu.actor);
    }

    toggleCategoriesMenu(){
        let appsScrollBoxAdj = this.categoriesScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);

        let customStyle=this._settings.get_boolean('enable-custom-arc-menu');
        this.categoriesMenu.actor.style_class = customStyle ? 'arc-right-click-boxpointer': 'popup-menu-boxpointer';
        this.categoriesMenu.actor.add_style_class_name( customStyle ? 'arc-right-click' : 'popup-menu');
        this.categoriesButton.tooltip.hide();

        this.categoriesMenu.toggle();
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

    reload() {
        this.shortcutsBox.destroy_all_children();  
        super.reload();
        let themeContext = St.ThemeContext.get_for_stage(global.stage);
        let scaleFactor = themeContext.scale_factor;
        let height =  Math.round(350 / scaleFactor);
        this.leftPanelPopup.style = `max-height: ${height}px`;   
    }

    updateStyle(){
        super.updateStyle();
        let customStyle=this._settings.get_boolean('enable-custom-arc-menu');
        let removeMenuArrow = this._settings.get_boolean('remove-menu-arrow'); 
       
        let themeNode = this.arcMenu.actor.get_theme_node();
        let borderRadius = themeNode.get_length('-arrow-border-radius');
        this.themeNodeBorderRadius = "border-radius: 0px 0px " + borderRadius + "px " + borderRadius + "px;";
        this.actionsContainerBox.style = this.actionsContainerBoxStyle + this.themeNodeBorderRadius;

        let actor = this.categoriesButton.actor;
        customStyle ? actor.add_style_class_name('arc-menu-action') : actor.remove_style_class_name('arc-menu-action');

        customStyle ? this._clocksItem.add_style_class_name('arc-menu-action') : this._clocksItem.remove_style_class_name('arc-menu-action');
        customStyle ? this._weatherItem.add_style_class_name('arc-menu-action') : this._weatherItem.remove_style_class_name('arc-menu-action');
        
        if(removeMenuArrow)
            this.arcMenu.box.style = "padding-bottom:0px; margin:0px;";
        else
            this.arcMenu.box.style = "padding-bottom:0px;";
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 
        let categoryMenuItem = new MW.CategoryMenuItem(this, Constants.CategoryType.HOME_SCREEN);
        this.categoryDirectories.set(Constants.CategoryType.HOME_SCREEN, categoryMenuItem);
        this.hasPinnedApps = true;

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(categoryEnum == Constants.CategoryType.PINNED_APPS)
                shouldShow = false;
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuItem(this, categoryEnum);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }

        super.loadCategories();
        for(let categoryMenuItem of this.categoryDirectories.values()){
            if(categoryMenuItem._arrowIcon)
                categoryMenuItem.remove_actor(categoryMenuItem._arrowIcon);
        }
    }
   
    _displayCategories(){
        for(let categoryMenuItem of this.categoryDirectories.values()){
            this.categoriesBox.add_actor(categoryMenuItem.actor);	 
        }
    }

    displayPinnedApps() {
        if(this.activeCategoryType === Constants.CategoryType.HOME_SCREEN)
            this._clearActorsFromBox(this.applicationsBox);
        else
            this._clearActorsFromBox();
        this.subMainBox.remove_actor(this.actionsContainerBox);
        this.activeCategory = _("Pinned Apps");
        this._displayAppList(this.pinnedAppsArray, Constants.CategoryType.PINNED_APPS, this.applicationsGrid);
        this.activeCategory = _("Shortcuts");
        this._displayAppList(this.appShortcuts, Constants.CategoryType.HOME_SCREEN, this.shortcutsGrid);
        if(!this.applicationsBox.contains(this.shortcutsBox))
            this.applicationsBox.add(this.shortcutsBox);
        this.widgetBox.remove_all_children();
        if(this._settings.get_boolean('enable-clock-widget-unity'))
            this.widgetBox.add(this._clocksItem);
        if(this._settings.get_boolean('enable-weather-widget-unity'))
            this.widgetBox.add(this._weatherItem);
        if(!this.subMainBox.contains(this.widgetBox))
            this.subMainBox.add(this.widgetBox);
        this.subMainBox.add(this.actionsContainerBox);     
    }

    displayRecentFiles(){
        super.displayRecentFiles();
        let label = this._createHeaderLabel(_("Recent Files"));
        this.applicationsBox.insert_child_at_index(label, 0);
        this.activeCategoryType = Constants.CategoryType.RECENT_FILES;
    }

    displayCategoryAppList(appList, category){
        this._clearActorsFromBox();
        this._displayAppList(appList, category, this.applicationsGrid);
    }

    _clearActorsFromBox(box) {
        if(this.categoriesMenu.isOpen)
            this.categoriesMenu.toggle();
        if(this.subMainBox.contains(this.widgetBox)){
            this.subMainBox.remove_actor(this.widgetBox);
        }
        super._clearActorsFromBox(box);
    }

    _displayAppList(apps, category, grid){      
        super._displayAppList(apps, category, grid);

        let label = this._createHeaderLabel(this.activeCategory);
        if(grid === this.applicationsGrid)
            this.applicationsBox.insert_child_at_index(label.actor, 0);
        else
            this.applicationsBox.insert_child_at_index(label.actor, 2);
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
