/*
 * ArcMenu - A traditional application menu for GNOME 3
 *
 * ArcMenu Lead Developer and Maintainer
 * Andrew Zaech https://gitlab.com/AndrewZaech
 * 
 * ArcMenu Founder, Former Maintainer, and Former Graphic Designer
 * LinxGem33 https://gitlab.com/LinxGem33 - (No Longer Active)
 * 
 * Budgie.js Layout Created By: MagneFire https://gitlab.com/MagneFire 
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
const MW = Me.imports.menuWidgets;
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
            VerticalMainBox: true
        });
    }
    createLayout(){
        super.createLayout();
        this.searchBox = new MW.SearchBox(this);
        this._searchBoxChangedId = this.searchBox.connect('search-changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('entry-key-press', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('entry-key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        if(this._settings.get_enum('searchbar-default-top-location') === Constants.SearchbarLocation.TOP){
            this.searchBox.style = "margin: 0px 10px 10px 10px;";
            this.mainBox.add(this.searchBox.actor);
            let horizontalSep = this._createHorizontalSeparator(Constants.SeparatorStyle.MAX);
            horizontalSep.style = "margin-bottom: 6px;";
            this.mainBox.add(horizontalSep);
        }
        
        //Sub Main Box -- stores left and right box
        this.subMainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL
        });
        this.mainBox.add(this.subMainBox);

        this.rightBox = new St.BoxLayout({
            vertical: true,
            style_class: 'right-box',
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL
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
        rightPanelWidth += 70;
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.applicationsScrollBox.style = "width: " + rightPanelWidth + "px;";

        // Disable horizontal scrolling, hide vertical scrollbar, but allow vertical scrolling.
        this.applicationsScrollBox.set_policy(St.PolicyType.NEVER, St.PolicyType.EXTERNAL);

        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.rightBox.add(this.applicationsScrollBox);

        this.leftBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL
        });
        
        let horizonalFlip = this._settings.get_boolean("enable-horizontal-flip");
        this.subMainBox.add(horizonalFlip ? this.rightBox : this.leftBox);  
        this.subMainBox.add(this._createVerticalSeparator());
        this.subMainBox.add(horizonalFlip ? this.leftBox : this.rightBox);

        this.categoriesScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class: 'left-scroll-area-small ' + (this.disableFadeEffect ? '' : 'small-vfade'),
            overlay_scrollbars: true
        });
        this.leftBox.add(this.categoriesScrollBox);   
         
        this.categoriesBox = new St.BoxLayout({ vertical: true });
        this.categoriesScrollBox.add_actor(this.categoriesBox);

        if(this._settings.get_boolean('enable-activities-shortcut')){
            this.activitiesBox = new St.BoxLayout({ 
                vertical: true,
                x_expand: true, 
                y_expand: true,
                y_align: Clutter.ActorAlign.END
            });
            this.activities = new MW.ActivitiesMenuItem(this);
            this.activitiesBox.add(this.activities.actor);
            this.leftBox.add(this.activitiesBox);
        }

        if(this._settings.get_enum('searchbar-default-top-location') === Constants.SearchbarLocation.BOTTOM){
            let horizontalSep = this._createHorizontalSeparator(Constants.SeparatorStyle.MAX);
            horizontalSep.style = "margin-top: 6px;";
            this.mainBox.add(horizontalSep);
            this.searchBox.style = "margin: 10px 10px 0px 10px;";
            this.mainBox.add(this.searchBox.actor); 
        }
        
        this.loadPinnedApps();
        this.loadCategories();
        this.displayCategories();
        this.setDefaultMenuView(); 
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.categoryDirectories.values().next().value.displayAppList();
        this.activeMenuItem = this.categoryDirectories.values().next().value;
    }
    
    reload() {
        let rightPanelWidth = this._settings.get_int('right-panel-width');
        rightPanelWidth += 70;
        this.rightBox.style = "width: " + rightPanelWidth + "px;";
        this.applicationsScrollBox.style = "width: " + rightPanelWidth + "px;";
        super.reload(); 
    }

    loadCategories(){
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
        for(let categoryMenuItem of this.categoryDirectories.values()){
            categoryMenuItem.actor.style = "padding-top: 8px; padding-bottom: 8px; margin: 0; spacing: 0;";
            categoryMenuItem.remove_actor(categoryMenuItem._icon);
            if(categoryMenuItem._arrowIcon)
                categoryMenuItem.remove_actor(categoryMenuItem._arrowIcon);
        }
    }
    
    displayCategories(){
        super.displayCategories(this.categoriesBox);
    }
}
