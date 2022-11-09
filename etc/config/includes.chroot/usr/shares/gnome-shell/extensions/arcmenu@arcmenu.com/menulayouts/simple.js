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

const {Clutter, GMenu, St} = imports.gi;
const AppFavorites = imports.ui.appFavorites;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const PopupMenu = imports.ui.popupMenu;
const _ = Gettext.gettext;

var createMenu =  class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton, {
            Search: false,
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
        this.mainBox.style = null;
        this.section = this.menuButton.section;
        let actors = this.section.actor.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            this.section.actor.remove_actor(actor);
        }
        this.section.actor.add_actor(this.mainBox);  

        this.loadPinnedApps();
        this.loadCategories();
        this._display(); 
    }

    setDefaultMenuView(){
        this.activeMenuItem = this.categoryDirectories.values().next().value;
    }

    _display() {
        this.displayCategories();
        this.activeMenuItem = this.categoryDirectories.values().next().value;       
    }

    updateStyle(){
        for(let categoryMenuItem of this.categoryDirectories.values()){
            categoryMenuItem.updateStyle(); 
        }
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(shouldShow){
                let categoryMenuItem = new MW.SimpleMenuItem(this, categoryEnum);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }        
        
        super.loadCategories(MW.SimpleMenuItem);
    }
    
    displayCategories(){
        super.displayCategories(this.mainBox);
    }

    displayPinnedApps() {
        this._clearActorsFromBox();
        let categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.PINNED_APPS);
        if(categoryMenuItem){
            this._displayAppList(this.pinnedAppsArray, Constants.CategoryType.PINNED_APPS, categoryMenuItem);
        }
    }

    _clearActorsFromBox(box) {
        let parent = this.applicationsGrid.get_parent();
        if(!parent)
            return;
        let scrollViewParent = parent.get_parent();

        if(scrollViewParent && scrollViewParent instanceof St.ScrollView){
            let scrollBoxAdj = scrollViewParent.get_vscroll_bar().get_adjustment();
            scrollBoxAdj.set_value(0);
        }
        let actors = parent.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            if(actor instanceof St.Widget && actor.layout_manager instanceof Clutter.GridLayout){
                actor.get_children().forEach(gridChild => {
                    if(gridChild instanceof MW.CategorySubMenuItem)
                        gridChild.menu.close();
                });
            }
            parent.remove_actor(actor);
        }
    }

    displayCategoryAppList(appList, category, categoryMenuItem){
        this._clearActorsFromBox();
        this._displayAppList(appList, category, categoryMenuItem);
    }

    displayRecentFiles(){
        let categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.RECENT_FILES);
        let children = categoryMenuItem.applicationsBox.get_children();
        for (let i = 0; i < children.length; i++) {
            let actor = children[i];
            if(actor._delegate instanceof MW.CategorySubMenuItem)
                actor._delegate.menu.close();
            categoryMenuItem.applicationsBox.remove_actor(actor);
        }
        super.displayRecentFiles(categoryMenuItem.applicationsBox);
    }

    _displayAppList(apps, category, categoryMenuItem) {
        super._displayAppList(apps, category, this.applicationsGrid);
        if(!categoryMenuItem.applicationsBox.contains(this.applicationsGrid))
            categoryMenuItem.applicationsBox.add(this.applicationsGrid);
    }
}
