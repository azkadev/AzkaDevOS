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
const Main = imports.ui.main;
const MW = Me.imports.menuWidgets;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var createMenu =  class extends BaseMenuLayout.BaseLayout{
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

        this.dummyCursor = new St.Widget({ width: 0, height: 0, opacity: 0 });
        Main.uiGroup.add_actor(this.dummyCursor);
        this.updateLocation();

        //store old ArcMenu variables
        this.oldSourceActor = this.arcMenu.sourceActor;
        this.oldFocusActor = this.arcMenu.focusActor;
        this.oldArrowAlignment = this.arcMenu.actor._arrowAlignment;

        this.arcMenu.sourceActor = this.dummyCursor;
        this.arcMenu.focusActor = this.dummyCursor;
        this.arcMenu._boxPointer.setPosition(this.dummyCursor, 0.5);
        this.arcMenu.close();
        this.arcMenu._boxPointer.hide();

        this.topBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            vertical: false
        });

        this.searchBox = new MW.SearchBox(this);
        this.searchBox.style = "margin: 5px 10px 5px 10px;";
        this._searchBoxChangedId = this.searchBox.connect('search-changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('entry-key-press', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('entry-key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.runnerTweaksButton = new MW.RunnerTweaksButton(this);
        this.runnerTweaksButton.actor.x_expand = false;
        this.runnerTweaksButton.actor.y_expand = false;
        this.runnerTweaksButton.actor.y_align = Clutter.ActorAlign.CENTER;
        this.runnerTweaksButton.actor.x_align = Clutter.ActorAlign.CENTER;
        this.runnerTweaksButton.actor.style = "margin-right: 10px; padding: 8px;";

        this.topBox.add(this.searchBox.actor);
        this.topBox.add(this.runnerTweaksButton);
        this.mainBox.add(this.topBox);

        this.applicationsScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            x_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: this.disableFadeEffect ? '' : 'small-vfade',
            reactive:true
        });

        this.mainBox.add(this.applicationsScrollBox);
        this.applicationsBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.setDefaultMenuView();
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this._clearActorsFromBox();
        if(this._settings.get_boolean("runner-show-frequent-apps"))
            this.displayFrequentApps();
    }

    displayFrequentApps(){
        let labelRow = this.createLabelRow(_("Frequent Apps"));
        this.applicationsBox.add(labelRow);
        let mostUsed = Shell.AppUsage.get_default().get_most_used();
        let appList = [];
        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show()){
                let item = new MW.ApplicationMenuItem(this, mostUsed[i]);
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

    updateLocation(){
        if(!this.rise){
            let themeNode = this.arcMenu.actor.get_theme_node();
            this.rise = themeNode.get_length('-arrow-rise');
        }
        this.arcMenu.actor.style = "-arrow-base:0px; -arrow-rise:0px;";
        this.arcMenu._boxPointer.setSourceAlignment(0.5);
        this.arcMenu._arrowAlignment = 0.5;
        
        let monitorIndex = Main.layoutManager.findIndexForActor(this.menuButton);
        let rect = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);

        //Position the runner menu in the center of the current monitor, at top of screen.
        let positionX = Math.round(rect.x + (rect.width / 2));
        let positionY = rect.y + (this._settings.get_boolean('runner-use-theme-gap') ? this.rise : 0);
        if(this._settings.get_enum('runner-position') == 1)
            positionY = Math.round(rect.y + (rect.height / 2) - 125);
        this.dummyCursor.set_position(positionX,  positionY);

        if(!this.topBox)
            return;

        this._runnerWidth = this._settings.get_int("runner-menu-width");
        this._runnerHeight = this._settings.get_int("runner-menu-height");
        this._runnerFontSize = this._settings.get_int("runner-font-size");
        this.mainBox.style = `max-height: ${this._runnerHeight}px;`;
        if(this._runnerFontSize > 0){
            this.mainBox.style += `font-size: ${this._runnerFontSize}pt;`
            this.searchBox.style += `font-size: ${this._runnerFontSize}pt;`
        }
        else{
            this.searchBox.style = "margin: 5px 10px 5px 10px;";
        }
        this.topBox.style = `width: ${this._runnerWidth}px;`;
        this.applicationsScrollBox.style = `width: ${this._runnerWidth}px;`;
    }
    
    updateIcons(){
        this.searchResults._reset();
    }

    updateStyle(){
        super.updateStyle();
        this.arcMenu.actor.style = "-arrow-base:0px; -arrow-rise:0px;";
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
        customStyle ? this.runnerTweaksButton.actor.add_style_class_name('arc-menu-action') : this.runnerTweaksButton.actor.remove_style_class_name('arc-menu-action');
    }

    updateSearch(){
        this.searchResults._reloadRemoteProviders();
    }

    loadCategories(){
    }

    destroy(isReload){
        this.arcMenu.actor.style = null;
        this.arcMenu.sourceActor = this.oldSourceActor;
        this.arcMenu.focusActor = this.oldFocusActor;
        this.arcMenu._boxPointer.setPosition(this.oldSourceActor, this.oldArrowAlignment);
        this.arcMenu.close();
        this.arcMenu._boxPointer.hide();
        Main.uiGroup.remove_actor(this.dummyCursor);
        this.dummyCursor.destroy();
        super.destroy(isReload);
    }
}
