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

const {Clutter, GLib, Gio, Gtk, St} = imports.gi;
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
            GridColumns: 5,
            ColumnSpacing: 10,
            RowSpacing: 10,
            IconGridSize: 36,
            PinnedAppsColumns: 1,
            ListSearchResults_IconSize: 24,
            IconGridStyle: 'SmallIconGrid',
            VerticalMainBox: false
        });
    }
    createLayout(){  
        super.createLayout();   
        this.actionsBox = new St.BoxLayout({
            x_expand: false,
            y_expand: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.actionsBox.style = "margin: 0px 5px 0px 10px; spacing: 10px;";
        this.mainBox.add(this.actionsBox);

        this.pinnedAppsButton = new MW.PinnedAppsButton(this);
        this.pinnedAppsButton.actor.y_expand = true;
        this.pinnedAppsButton.actor.y_align= Clutter.ActorAlign.START;
        this.pinnedAppsButton.actor.margin = 5;
        this.actionsBox.add(this.pinnedAppsButton.actor);
        let userButton = new MW.CurrentUserButton(this);
        this.actionsBox.add(userButton.actor);
        let path = GLib.get_user_special_dir(imports.gi.GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        if (path != null){
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

        this.subMainBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            vertical: true
        });
        this.mainBox.add(this.subMainBox);

        let userMenuBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.START,
            vertical: false
        })
        this.user = new MW.UserMenuIcon(this, 55);
        this.user.actor.x_align = Clutter.ActorAlign.CENTER;
        this.user.actor.y_align = Clutter.ActorAlign.CENTER;
        this.user.userNameLabel.x_align = Clutter.ActorAlign.CENTER;
        this.user.userNameLabel.y_align = Clutter.ActorAlign.CENTER;
        this.user.userNameLabel.style = "margin-left: 10px;"
        userMenuBox.add(this.user.actor);
        userMenuBox.add(this.user.userNameLabel);
        this.subMainBox.add(userMenuBox);

        this.searchBox = new MW.SearchBox(this);
        this.searchBox.name = "ArcSearchEntryRound";
        this.searchBox.style = "margin: 15px 10px 10px 10px;";
        this._searchBoxChangedId = this.searchBox.connect('search-changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('entry-key-press', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('entry-key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.subMainBox.add(this.searchBox.actor);

        this.applicationsBox = new St.BoxLayout({
            vertical: true
        });

        this.applicationsScrollBox = this._createScrollBox({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class:  this.disableFadeEffect ? '' : 'vfade',
        });   
        this.applicationsScrollBox.style = "width:525px;";   

        this.applicationsScrollBox.add_actor( this.applicationsBox);
        this.subMainBox.add(this.applicationsScrollBox);
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
        
        this.loadPinnedApps();
        this.loadCategories();

        this._createPinnedAppsMenu();
        this.setDefaultMenuView();
    }

    loadPinnedApps(){
        this.layoutProperties.AppType = Constants.AppDisplayType.LIST;
        super.loadPinnedApps();
        this.layoutProperties.AppType = Constants.AppDisplayType.GRID;
    }

    _createPinnedAppsMenu(){
        this.dummyCursor = new St.Widget({ width: 0, height: 0, opacity: 0 });
        Main.uiGroup.add_actor(this.dummyCursor);
        this.pinnedAppsMenu = new PopupMenu.PopupMenu(this.dummyCursor, 0, St.Side.TOP);
        this.pinnedAppsMenu.connect('open-state-changed', (menu, open) => {
            if(!open){
                this.pinnedAppsButton.fake_release();
                this.pinnedAppsButton.set_hover(false);
            }
            else{
                if(this.menuButton.tooltipShowingID){
                    GLib.source_remove(this.menuButton.tooltipShowingID);
                    this.menuButton.tooltipShowingID = null;
                    this.menuButton.tooltipShowing = false;
                }
                if(this.pinnedAppsButton.tooltip){
                    this.pinnedAppsButton.tooltip.hide();
                    this.menuButton.tooltipShowing = false;
                }
            }
        });
        this.section = new PopupMenu.PopupMenuSection();
        this.pinnedAppsMenu.addMenuItem(this.section);  
        
        this.leftPanelPopup = new St.BoxLayout({
            vertical: true
        });   
        this.leftPanelPopup._delegate = this.leftPanelPopup;
        let headerBox = new St.BoxLayout({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            vertical: true
        });    
        this.leftPanelPopup.add(headerBox);

        this.backButton = new MW.BackMenuItem(this);
        this.backButton.connect("activate", () => this.togglePinnedAppsMenu());
        headerBox.add(this.backButton.actor);
        headerBox.add(this._createHorizontalSeparator(Constants.SeparatorStyle.LONG));
        headerBox.add(this.createLabelRow(_("Pinned Apps")));

        this.pinnedAppsScrollBox = this._createScrollBox({
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class:  this.disableFadeEffect ? '' : 'small-vfade',
            overlay_scrollbars: true,
            reactive:true
        });   
        
        this.leftPanelPopup.add(this.pinnedAppsScrollBox);
       
        this.pinnedAppsBox = new St.BoxLayout({
            vertical: true
        });     
        this.pinnedAppsScrollBox.add_actor(this.pinnedAppsBox);

        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: 0,
            row_spacing: 0 
        });
        this.pinnedAppsGrid = new St.Widget({ 
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            layout_manager: layout 
        });
        this.pinnedAppsGrid.isPinnedAppsGrid = true;
        layout.hookup_style(this.pinnedAppsGrid);

        let themeContext = St.ThemeContext.get_for_stage(global.stage);
        let scaleFactor = themeContext.scale_factor;
        let height = Math.round(this._settings.get_int('menu-height') / scaleFactor) - 1;
        this.leftPanelPopup.style = `height: ${height}px`;        
        this.section.actor.add_actor(this.leftPanelPopup); 
        this.displayPinnedApps();
        this.subMenuManager.addMenu(this.pinnedAppsMenu);
        this.pinnedAppsMenu.actor.hide();
        Main.uiGroup.add_actor(this.pinnedAppsMenu.actor);
    }

    togglePinnedAppsMenu(){
        let appsScrollBoxAdj = this.pinnedAppsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);

        let customStyle=this._settings.get_boolean('enable-custom-arc-menu');
        this.pinnedAppsMenu.actor.style_class = customStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.pinnedAppsMenu.actor.add_style_class_name( customStyle ? 'arc-menu' : 'popup-menu');
        this.pinnedAppsButton.tooltip.hide();
        let themeNode = this.arcMenu.actor.get_theme_node();
        let rise = themeNode.get_length('-arrow-rise');
        let backgroundColor = themeNode.get_color('-arrow-background-color');
        let shadeColor;
        let drawBoxshadow = true;
        if(backgroundColor.alpha ==0 || !backgroundColor || backgroundColor === Clutter.Color.TRANSPARENT){
            backgroundColor = themeNode.get_color('background-color');
            if(backgroundColor.alpha==0 || !backgroundColor || backgroundColor === Clutter.Color.TRANSPARENT){
                    drawBoxshadow = false;
            }
                
        }
        let styleProperties;
        if(drawBoxshadow){
            shadeColor = backgroundColor.shade(.35);
            backgroundColor = "rgba("+backgroundColor.red+","+backgroundColor.green+","+backgroundColor.blue+","+backgroundColor.alpha+")";
            shadeColor ="rgba("+shadeColor.red+","+shadeColor.green+","+shadeColor.blue+","+shadeColor.alpha+")";
            styleProperties = "box-shadow: 3px 0px 8px 0px "+shadeColor+";background-color: "+backgroundColor+";";
        }

        let borderRadius = themeNode.get_length('-arrow-border-radius');
        this.pinnedAppsMenu.actor.style = "-boxpointer-gap: 0px; -arrow-border-color:transparent; -arrow-border-width:0px; width: 250px;"
                                            +"-arrow-base:0px;-arrow-rise:0px; -arrow-background-color:transparent;"
                                            +" border-radius: "+borderRadius+"px;" + styleProperties;

        let base = themeNode.get_length('-arrow-base');
        let borderWidth = themeNode.get_length('-arrow-border-width');

        this.arcMenu.actor.get_allocation_box();
        let [x, y] = this.arcMenu.actor.get_transformed_position();
        if(this.arcMenu._arrowSide === St.Side.TOP)
            y += rise + 1;
        else 
            y += 1;
        if(this.arcMenu._arrowSide === St.Side.LEFT)
            x = x + (borderRadius * 2) + rise + 1;
        else
            x = x + (borderRadius * 2);
        this.dummyCursor.set_position(Math.round(x+borderWidth), Math.round(y+borderWidth));
        this.pinnedAppsMenu.toggle();
    }
    
    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.displayAllApps();
        this.activeMenuItem = this.applicationsGrid.layout_manager.get_child_at(0, 0);
        if(!this.applicationsBox.contains(this.applicationsGrid))
            this.applicationsBox.add(this.applicationsGrid);
        let appsScrollBoxAdj = this.pinnedAppsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
    }

    _reload() {
        super.reload();
        let themeContext = St.ThemeContext.get_for_stage(global.stage);
        let scaleFactor = themeContext.scale_factor;
        let height =  Math.round(this._settings.get_int('menu-height') / scaleFactor);
        this.leftPanelPopup.style = `height: ${height}px`;  
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 
        this.hasPinnedApps = true;
        super.loadCategories();
    }
    
    _clearActorsFromBox(box){
        super._clearActorsFromBox(box);
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
    }

    displayPinnedApps() {
        this._clearActorsFromBox(this.pinnedAppsBox);
        this.layoutProperties.GridColumns = 1;
        this._displayAppList(this.pinnedAppsArray, Constants.CategoryType.PINNED_APPS, this.pinnedAppsGrid);
        if(!this.pinnedAppsBox.contains(this.pinnedAppsGrid))
            this.pinnedAppsBox.add(this.pinnedAppsGrid);
        this.updateStyle();  
        this.layoutProperties.GridColumns = 5;
    }
}
