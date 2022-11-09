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

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Gdk, GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const ByteArray = imports.byteArray;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const LayoutTweaks = Me.imports.menulayouts.tweaks;
const PW = Me.imports.prefsWidgets;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

const SCHEMA_PATH = '/org/gnome/shell/extensions/arcmenu/';
const GSET = 'gnome-shell-extension-tool';

var MenuSettingsPinnedAppsPage = GObject.registerClass(
    class Arc_Menu_MenuSettingsPinnedAppsPage extends Gtk.Box {
        _init(settings) {
            super._init({
                orientation: Gtk.Orientation.VERTICAL,
            });
    
            this.scrollBox = new Gtk.ScrolledWindow();
            this.scrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
    
            this.mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
                spacing: 20,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
    
            this.scrollBox.add_with_viewport(this.mainBox);
            this.add(this.scrollBox);
            this._settings = settings;

            this.pinnedAppsScrollWindow = new Gtk.ScrolledWindow({
                valign: Gtk.Align.FILL,
                vexpand: true
            });
            this.pinnedAppsScrollWindow.set_min_content_height(300);
            this.pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            this.frame = new PW.FrameBox();
            this.saveButton = new Gtk.Button({
                label: _("Apply"),
                hexpand: true,
                halign: Gtk.Align.END,
                vexpand: false,
                valign: Gtk.Align.END
            });
            this._loadPinnedApps(this._settings.get_strv('pinned-app-list'));
            this.pinnedAppsScrollWindow.add_with_viewport(this.frame);
            this.mainBox.add(this.pinnedAppsScrollWindow);
            
            let addPinnedAppsFrame = new PW.FrameBox();
            let addPinnedAppsFrameRow = new PW.FrameBoxRow();
            let addPinnedAppsFrameLabel = new Gtk.Label({
                label: _("Add More Apps"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let addPinnedAppsButton = new PW.Button({
                icon_name: 'list-add-symbolic',
            });
            addPinnedAppsButton.connect('clicked', ()=> {
                let dialog = new AddAppsToPinnedListWindow(this._settings, this, Constants.DiaglogType.DEFAULT);
                dialog.show_all();
                dialog.connect('response', ()=> { 
                    if(dialog.get_response()) {
                        let newPinnedApps = dialog.get_newPinnedAppsArray();
                        let array = []; 
                        for(let i = 0; i < newPinnedApps.length; i++){
                            array.push(newPinnedApps[i]._name);
                            array.push(newPinnedApps[i]._icon);
                            array.push(newPinnedApps[i]._cmd);
                        }
                        this._loadPinnedApps(array);
                        dialog.destroy();
                        this.frame.show_all();
                        this.saveButton.set_sensitive(true);
                    }
                    else
                        dialog.destroy();
                }); 
            });
            addPinnedAppsFrameRow.add(addPinnedAppsFrameLabel);
            addPinnedAppsFrameRow.add(addPinnedAppsButton);
            addPinnedAppsFrame.add(addPinnedAppsFrameRow);
            this.mainBox.add(addPinnedAppsFrame);
            
            let addCustomAppFrame = new PW.FrameBox();
            let addCustomAppFrameRow = new PW.FrameBoxRow();
            let addCustomAppFrameLabel = new Gtk.Label({
                label: _("Add Custom Shortcut"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let addCustomAppButton = new PW.Button({
                icon_name: 'list-add-symbolic',
            });
            addCustomAppButton.connect('clicked', ()=> {
                let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.DiaglogType.DEFAULT);
                dialog.show_all();
                dialog.connect('response', ()=> { 
                    if(dialog.get_response()) {
                        let newPinnedApps = dialog.get_newPinnedAppsArray();
                        this._loadPinnedApps(newPinnedApps);
                        dialog.destroy();
                        this.frame.show_all();
                        this.saveButton.set_sensitive(true);
                    }
                    else
                        dialog.destroy();
                }); 
            });
            addCustomAppFrameRow.add(addCustomAppFrameLabel);
            addCustomAppFrameRow.add(addCustomAppButton);
            addCustomAppFrame.add(addCustomAppFrameRow);
            this.mainBox.add(addCustomAppFrame);
            
            let buttonRow = new Gtk.Box({
                valign: Gtk.Align.END,
                margin_top: 6,
                margin_bottom: 6,
                margin_start: 24,
                margin_end: 24,
            });
            this.saveButton.connect('clicked', ()=> {
                let array = [];
                for(let x = 0; x < this.frame.count; x++) {
                    array.push(this.frame.get_index(x)._name);
                    array.push(this.frame.get_index(x)._icon);
                    array.push(this.frame.get_index(x)._cmd);
                }
                this._settings.set_strv('pinned-app-list',array);
                this.saveButton.set_sensitive(false);
            }); 
            this.saveButton.set_halign(Gtk.Align.END);
            this.saveButton.set_sensitive(false);
            buttonRow.add(this.saveButton);
            this.add(buttonRow);
        }
         
        _loadPinnedApps(array) {
            for(let i = 0; i < array.length; i += 3) {
                let frameRow = new PW.FrameBoxDragRow(this.pinnedAppsScrollWindow);
                let iconString;
                frameRow._name = array[i];
                frameRow._icon = array[i + 1];
                frameRow._cmd = array[i + 2];
                frameRow.saveButton = this.saveButton;
                if(frameRow._icon === "ArcMenu_ArcMenuIcon"){
                    frameRow._icon = Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg';
                }
                iconString = frameRow._icon;
                if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd)){
                    iconString = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon() ? Gio.DesktopAppInfo.new(frameRow._cmd).get_icon().to_string() : "";
                }
                frameRow._gicon = Gio.icon_new_for_string(iconString);
                let arcMenuImage = new Gtk.Image( {
                    gicon: frameRow._gicon,
                    pixel_size: 22
                });
                let dragImage = new Gtk.Image( {
                    gicon: Gio.icon_new_for_string("drag-symbolic"),
                    pixel_size: 12
                });

                let arcMenuImageBox = new Gtk.Box({
                    margin_start: 0,
                    hexpand: false,
                    vexpand: false,
                    spacing: 5,
                });
                arcMenuImageBox.add(dragImage);
                arcMenuImageBox.add(arcMenuImage);
                frameRow.add(arcMenuImageBox);

                let frameLabel = new Gtk.Label({
                    use_markup: true,
                    xalign: 0,
                    hexpand: true
                });

                frameLabel.label = _(frameRow._name);

                checkIfValidShortcut(frameRow, frameLabel, arcMenuImage);

                frameRow.add(frameLabel);
                let buttonBox = new PW.EditEntriesBox({
                    frameRow: frameRow, 
                    frame: this.frame, 
                    buttons: [this.saveButton],
                    modifyButton: true,
                    deleteButton: true
                });

                buttonBox.connect('modify', ()=> {
                    let appArray = [frameRow._name,frameRow._icon,frameRow._cmd];
                    let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.DiaglogType.DEFAULT, true, appArray);
                    dialog.show_all();
                    dialog.connect('response', ()=> { 
                        if(dialog.get_response()) {
                            let newPinnedApps = dialog.get_newPinnedAppsArray();
                            frameRow._name = newPinnedApps[0];
                            frameRow._icon = newPinnedApps[1];
                            frameRow._cmd = newPinnedApps[2];
                            frameLabel.label = _(frameRow._name);
                            if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd))
                                arcMenuImage.gicon = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon();
                            else
                                arcMenuImage.gicon = Gio.icon_new_for_string(frameRow._icon);
                            dialog.destroy();
                            this.frame.show_all();
                            this.saveButton.set_sensitive(true);
                        }
                        else
                            dialog.destroy();
                    });  
                });
                frameRow.add(buttonBox);
                this.frame.add(frameRow);
            }
        }
});
 
var AddAppsToPinnedListWindow = GObject.registerClass(
    class Arc_Menu_AddAppsToPinnedListWindow extends PW.DialogWindow {
        _init(settings, parent, dialogType) {
            this._settings = settings;
            this._dialogType = dialogType;
            if(this._dialogType == Constants.DiaglogType.DEFAULT)  
                super._init(_('Add to your Pinned Apps'), parent);     
            else if(this._dialogType == Constants.DiaglogType.OTHER)
                super._init(_('Change Selected Pinned App'), parent);
            else if(this._dialogType == Constants.DiaglogType.APPLICATIONS)
                super._init(_('Select Application Shortcuts'), parent);
            else if(this._dialogType == Constants.DiaglogType.DIRECTORIES)
                super._init(_('Select Directory Shortcuts'), parent);
            this.newPinnedAppsArray=[];
            this.addResponse = false;
        }

        _createLayout(vbox) {
            let searchBar = new Gtk.SearchEntry({
                placeholder_text: _("Type to search…")
            });
            searchBar.connect('search-changed', ()=> {
                this._loadCategories();
                let applist = Gio.app_info_get_all();

                let pattern = searchBar.text;
                let searchResults = [];
                let res = [];
                for (let i in applist) {
                    let app = applist[i];
                    let match;
  
                    match = app.get_name().toLowerCase() + " ";
                    let info = Gio.DesktopAppInfo.new(app.get_id());
                
                    if (info.get_display_name()) 
                        match += info.get_display_name().toLowerCase() + " ";
                    if (info.get_executable()) 
                        match += info.get_executable().toLowerCase() + " ";
                    if (info.get_keywords()) 
                        match += info.get_keywords().toString().toLowerCase() + " ";
                    if (app.get_description()) 
                        match += app.get_description().toLowerCase();
                    

                    let index = match.indexOf(pattern);
                    if (index != -1) {
                        searchResults.push([index, app]);
                    }
                }
                let arcMenuSettings = _("ArcMenu Settings").toLowerCase();
                let index = arcMenuSettings.indexOf(pattern);
                let showArcMenuSettings = false;
                if (index != -1) {
                    showArcMenuSettings = true;
                }

                searchResults.sort(function(a,b) {
                    return a[0] > b[0];
                });
                res = searchResults.map(function(value,index) { return value[1]; });
                this.appsFrame.remove_all_children();
                this._loadCategories(res, showArcMenuSettings);
                this.appsFrame.show_all();

            });
            
            let pinnedAppsScrollWindow = new Gtk.ScrolledWindow({
                valign: Gtk.Align.FILL,
                vexpand: true
            });
            pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            pinnedAppsScrollWindow.set_min_content_height(400);
            pinnedAppsScrollWindow.set_min_content_width(650);
            this.appsFrame = new PW.FrameBox();
            let addAppsButton;
            if(this._dialogType == Constants.DiaglogType.DEFAULT || this._dialogType == Constants.DiaglogType.APPLICATIONS
                || this._dialogType == Constants.DiaglogType.DIRECTORIES){
                addAppsButton = new Gtk.Button({
                    label: _("Add")
                });

                addAppsButton.connect('clicked', ()=> {
                    this.addResponse = true;
                    this.response(-10);
                });
                addAppsButton.set_halign(Gtk.Align.END);
            }
            
            pinnedAppsScrollWindow.add_with_viewport(this.appsFrame);
            vbox.add(pinnedAppsScrollWindow);
            if(this._dialogType == Constants.DiaglogType.DEFAULT){
                this._loadCategories();
                vbox.add(addAppsButton);
                vbox.add(searchBar);
                vbox.reorder_child(searchBar, 0);
            }
            else if(this._dialogType == Constants.DiaglogType.DIRECTORIES){
                let defaultApplicationShortcuts = this._settings.get_default_value('directory-shortcuts-list').deep_unpack();
                defaultApplicationShortcuts.push([_("Computer"), "ArcMenu_Computer", "ArcMenu_Computer"]);
                defaultApplicationShortcuts.push([_("Network"), "ArcMenu_Network", "ArcMenu_Network"]);
                defaultApplicationShortcuts.push([_("Trash"), "user-trash-symbolic", "ArcMenu_Trash"]);
                for(let i = 0;i < defaultApplicationShortcuts.length; i++) {
                    let frameRow = new PW.FrameBoxRow();
                    
                    frameRow._name = _(defaultApplicationShortcuts[i][0]);
                    frameRow._icon = defaultApplicationShortcuts[i][1];
                    frameRow._cmd = defaultApplicationShortcuts[i][2];

                    let iconImage = new Gtk.Image( {
                        gicon: Gio.icon_new_for_string(getIconPath(defaultApplicationShortcuts[i])),
                        pixel_size: 22
                    });

                    let iconImageBox = new Gtk.Box( {
                        orientation: Gtk.Orientation.VERTICAL,
                        margin_start: 5,
                        hexpand: false,
                        vexpand: false
                    });
                    iconImageBox.add(iconImage);
                    frameRow.add(iconImageBox);

                    let frameLabel = new Gtk.Label( {
                        use_markup: false,
                        xalign: 0,
                        hexpand: true
                    });
                    frameLabel.label = frameRow._name;
                    frameRow.add(frameLabel);
                    
                    let checkButton = new Gtk.CheckButton({
                        margin_end: 20
                    });
                    checkButton.connect('toggled', ()=> {
                        if(checkButton.get_active())
                            this.newPinnedAppsArray.push(frameRow);
                        else {
                            let index= this.newPinnedAppsArray.indexOf(frameRow);
                            this.newPinnedAppsArray.splice(index,1);
                        }
                    });
                    frameRow.add(checkButton);
                    this.appsFrame.add(frameRow);
                }
                vbox.add(addAppsButton);
            }
            else if(this._dialogType == Constants.DiaglogType.APPLICATIONS){
                this._loadCategories();
                let defaultApplicationShortcutsFrame = new PW.FrameBox();
                let defaultApplicationShortcuts = this._settings.get_default_value('application-shortcuts-list').deep_unpack();
                defaultApplicationShortcuts.push([_("ArcMenu Settings"), Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg', Constants.ArcMenuSettingsCommand]);
                defaultApplicationShortcuts.push([_("Run Command..."), "system-run-symbolic", "ArcMenu_RunCommand"]);
                defaultApplicationShortcuts.push([_("Show All Applications"), "view-fullscreen-symbolic", "ArcMenu_ShowAllApplications"]);
                
                for(let i = 0;i < defaultApplicationShortcuts.length; i++) {
                    let frameRow = new PW.FrameBoxRow();
                    frameRow._name = _(defaultApplicationShortcuts[i][0]);
                    frameRow._icon = defaultApplicationShortcuts[i][1];
                    frameRow._cmd = defaultApplicationShortcuts[i][2];

                    let iconImage = new Gtk.Image( {
                        gicon: Gio.icon_new_for_string(frameRow._icon),
                        pixel_size: 22
                    });

                    let iconImageBox = new Gtk.Box( {
                        orientation: Gtk.Orientation.VERTICAL,
                        margin_start: 5,
                        hexpand: false,
                        vexpand: false
                    });
                    iconImageBox.add(iconImage);
                    frameRow.add(iconImageBox);

                    let frameLabel = new Gtk.Label( {
                        use_markup: false,
                        xalign: 0,
                        hexpand: true
                    });
                    frameLabel.label = frameRow._name;
                    frameRow.add(frameLabel);
                    
                    let checkButton = new Gtk.CheckButton({
                        margin_end: 20
                    });
                    checkButton.connect('toggled', ()=> {
                        if(checkButton.get_active()) {
                            this.newPinnedAppsArray.push(frameRow);
                        }
                        else {
                            let index= this.newPinnedAppsArray.indexOf(frameRow);
                            this.newPinnedAppsArray.splice(index,1);
                        }
                    });
                    frameRow.add(checkButton);
                    
                    defaultApplicationShortcutsFrame.add(frameRow);
                    
                }
                let notebook = new PW.Notebook();

                let defaultAppsPage = new PW.NotebookPage(_("Default Apps"));
                notebook.append_page(defaultAppsPage);
                defaultAppsPage.add(defaultApplicationShortcutsFrame);
                vbox.remove(pinnedAppsScrollWindow);
                let systemAppsPage = new PW.NotebookPage(_("System Apps"));
                notebook.append_page(systemAppsPage);
                systemAppsPage.add(pinnedAppsScrollWindow);
                systemAppsPage.add(searchBar);
                systemAppsPage.reorder_child(searchBar, 0);

                vbox.add(notebook);
                vbox.add(addAppsButton);
            }
            else{
                this._loadCategories();
                let defaultAppsWindow = new Gtk.ScrolledWindow({
                    valign: Gtk.Align.FILL,
                    vexpand: true
                });
                defaultAppsWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
                defaultAppsWindow.set_min_content_width(500);
                defaultAppsWindow.set_min_content_width(500);
            
                let defaultApplicationShortcutsFrame = new PW.FrameBox();
                defaultAppsWindow.add_with_viewport(defaultApplicationShortcutsFrame);
                let defaultApplicationShortcuts = this._settings.get_default_value('directory-shortcuts-list').deep_unpack();
                defaultApplicationShortcuts.push([_("Computer"), "ArcMenu_Computer", "ArcMenu_Computer"]);
                defaultApplicationShortcuts.push([_("Network"), "ArcMenu_Network", "ArcMenu_Network"]);
                defaultApplicationShortcuts.push([_("Trash"), "user-trash-symbolic", "ArcMenu_Trash"]);
                defaultApplicationShortcuts.push([_("Lock"), "changes-prevent-symbolic", "ArcMenu_Lock"]);
                defaultApplicationShortcuts.push([_("Log Out"), "application-exit-symbolic", "ArcMenu_LogOut"]);
                defaultApplicationShortcuts.push([_("Power Off"), "system-shutdown-symbolic", "ArcMenu_PowerOff"]);
                defaultApplicationShortcuts.push([_("Restart"), 'system-reboot-symbolic', "ArcMenu_Restart"]);
                defaultApplicationShortcuts.push([_("Suspend"), "media-playback-pause-symbolic", "ArcMenu_Suspend"]);
                defaultApplicationShortcuts.push([_("Hybrid Sleep"), Me.path + Constants.SleepIcon.PATH, "ArcMenu_HybridSleep"]);
                defaultApplicationShortcuts.push([_("Hibernate"), "document-save-symbolic", "ArcMenu_Hibernate"]);
                for(let i = 0;i < defaultApplicationShortcuts.length; i++) {
                    let frameRow = new PW.FrameBoxRow();

                    frameRow._name = _(defaultApplicationShortcuts[i][0]);
                    frameRow._icon = defaultApplicationShortcuts[i][1];
                    frameRow._cmd = defaultApplicationShortcuts[i][2];

                    let iconImage = new Gtk.Image( {
                        gicon: Gio.icon_new_for_string(getIconPath(defaultApplicationShortcuts[i])),
                        pixel_size: 22
                    });

                    let iconImageBox = new Gtk.Box( {
                        margin_start: 5,
                        hexpand: false,
                        vexpand: false
                    });
                    iconImageBox.add(iconImage);
                    frameRow.add(iconImageBox);

                    let frameLabel = new Gtk.Label( {
                        use_markup: false,
                        xalign: 0,
                        hexpand: true
                    });
                    frameLabel.label = frameRow._name;
                    frameRow.add(frameLabel);
                    
                    
                    let checkButton = new PW.Button({
                        icon_name: 'list-add-symbolic'
                    });
                    checkButton.margin_end = 20;
                    checkButton.connect('clicked', ()=> {
                        this.newPinnedAppsArray.push(frameRow._name, frameRow._icon, frameRow._cmd);
                        this.addResponse = true;
                        this.response(-10);
                    });
                    frameRow.add(checkButton);

                    defaultApplicationShortcutsFrame.add(frameRow);
                    
                }
                let notebook = new PW.Notebook();

                let defaultAppsPage = new PW.NotebookPage(_("Presets"));
                notebook.append_page(defaultAppsPage);
                defaultAppsPage.add(defaultAppsWindow);
                vbox.remove(pinnedAppsScrollWindow);
                let systemAppsPage = new PW.NotebookPage(_("System Apps"));
                notebook.append_page(systemAppsPage);
                systemAppsPage.add(pinnedAppsScrollWindow);
                systemAppsPage.add(searchBar);
                systemAppsPage.reorder_child(searchBar, 0);

                vbox.add(notebook);
            }
        }

        get_newPinnedAppsArray() {
            return this.newPinnedAppsArray;
        }

        get_response() {
            return this.addResponse;
        }

        _loadCategories(searchResults, showArcMenuSettings) {
            let allApps = searchResults ? searchResults : Gio.app_info_get_all();
            allApps.sort((a, b) => {
              let _a = a.get_display_name();
              let _b = b.get_display_name();
              return GLib.strcmp0(_a, _b);
            });

            let iter = -1;
            if(searchResults)
                iter = 0;
            if(showArcMenuSettings)
                iter = -1;    
            for(let i = iter; i < allApps.length; i++) {
                if(i == -1 ? true : allApps[i].should_show()) {
                    let frameRow = new PW.FrameBoxRow();
                    let icon;
                    if(i == -1){
                        frameRow._name = _("ArcMenu Settings");
                        icon = frameRow._icon = Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg';
                        frameRow._cmd = Constants.ArcMenuSettingsCommand;
                    }
                    else{
                        frameRow._app = allApps[i];
                        frameRow._name = allApps[i].get_display_name();
                        frameRow._icon = '';
                        if(allApps[i].get_icon())
                            icon = allApps[i].get_icon().to_string();
                        else 
                            icon = "dialog-information";
                            
                        frameRow._cmd = allApps[i].get_id();
                    }
                   
                    let iconImage = new Gtk.Image( {
                        gicon: Gio.icon_new_for_string(icon),
                        pixel_size: 22
                    });

                    let iconImageBox = new Gtk.Box( {
                        margin_start: 5,
                        hexpand: false,
                        vexpand: false
                    });
                    iconImageBox.add(iconImage);
                    frameRow.add(iconImageBox);

                    let frameLabel = new Gtk.Label( {
                        use_markup: false,
                        xalign: 0,
                        hexpand: true
                    });
                    frameLabel.label = frameRow._name;
                    frameRow.add(frameLabel);
                    if(this._dialogType == Constants.DiaglogType.DEFAULT || this._dialogType == Constants.DiaglogType.APPLICATIONS||
                        this._dialogType == Constants.DiaglogType.DIRECTORIES){
                        let checkButton = new Gtk.CheckButton({
                            margin_end: 20
                        });
                        checkButton.connect('toggled', ()=> {
                            if(checkButton.get_active())
                                this.newPinnedAppsArray.push(frameRow);
                            else {
                                let index= this.newPinnedAppsArray.indexOf(frameRow);
                                this.newPinnedAppsArray.splice(index,1);
                            }
                        });
                        frameRow.add(checkButton);
                    }
                    else{
                        let checkButton = new PW.Button({
                            icon_name: 'list-add-symbolic'
                        });
                        checkButton.margin_end = 20;
                        checkButton.connect('clicked', ()=> {
                            this.newPinnedAppsArray.push(frameRow._name, frameRow._icon, frameRow._cmd);
                            this.addResponse = true;
                            this.response(-10);
                        });
                        frameRow.add(checkButton);
                    }

                    this.appsFrame.add(frameRow);
                }
            }
        }
});
    
var AddCustomLinkDialogWindow = GObject.registerClass(
    class Arc_Menu_AddCustomLinkDialogWindow extends PW.DialogWindow {
        _init(settings, parent, dialogType, isAppEdit=false, appArray=null) {
            this._settings = settings;
            this.newPinnedAppsArray=[];
            this.addResponse = false;
            this.isAppEdit = isAppEdit;
            this._dialogType = dialogType;
            this.appArray = appArray;
            if(this._dialogType == Constants.DiaglogType.DEFAULT)  
                super._init(isAppEdit?_('Edit Pinned App'):_('Add a Custom Shortcut'), parent);    
            else if(this._dialogType == Constants.DiaglogType.OTHER)
                super._init(isAppEdit?_('Edit Pinned App'):_('Add a Custom Shortcut'), parent);
            else if(this._dialogType == Constants.DiaglogType.APPLICATIONS)
                super._init(isAppEdit?_('Edit Shortcut'):_('Add a Custom Shortcut'), parent);
            else if(this._dialogType == Constants.DiaglogType.DIRECTORIES)
                super._init(isAppEdit?_('Edit Custom Shortcut'):_('Add a Custom Shortcut'), parent);
        }

        _createLayout(vbox) {
            let mainFrame = new PW.FrameBox();
            let nameFrameRow = new PW.FrameBoxRow();
            let nameFrameLabel = new Gtk.Label({
                label: _('Shortcut Name:'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let nameEntry = new Gtk.Entry();
            nameEntry.set_width_chars(35);
            nameFrameRow.add(nameFrameLabel);
            nameFrameRow.add(nameEntry);
            nameEntry.grab_focus();
            mainFrame.add(nameFrameRow);

            let iconFrameRow = new PW.FrameBoxRow();
            let iconFrameLabel = new Gtk.Label({
                label: _("Icon:"),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let iconEntry = new Gtk.Entry();
            iconEntry.set_width_chars(35);

            let fileFilter = new Gtk.FileFilter();
            fileFilter.add_pixbuf_formats();
            let fileChooserButton = new Gtk.Button({
                label: _('Browse...')
            });

            fileChooserButton.connect('clicked', (widget) => {
                let dialog = new Gtk.FileChooserDialog({ 
                    title: _('Select an Icon'),
                    transient_for: this.get_toplevel(), 
                    modal: true,
                    action: Gtk.FileChooserAction.OPEN,
                });
                dialog.add_button("_Cancel", Gtk.ResponseType.CANCEL);
                dialog.add_button("_Open", Gtk.ResponseType.ACCEPT);

                dialog.set_filter(fileFilter);
        
                dialog.connect("response", (self, response) => {
                    if(response === Gtk.ResponseType.ACCEPT){
                        let iconFilepath = dialog.get_file().get_path();
                        iconEntry.set_text(iconFilepath);
                        dialog.destroy();
                    }
                    else if(response === Gtk.ResponseType.CANCEL)
                        dialog.destroy();
                })

                dialog.show_all();
            });

            iconFrameRow.add(iconFrameLabel);
            iconFrameRow.add(fileChooserButton);
            iconFrameRow.add(iconEntry);
            mainFrame.add(iconFrameRow);
            if(this._dialogType == Constants.DiaglogType.DIRECTORIES)
                iconEntry.set_text("ArcMenu_Folder");  

            let cmdFrameRow = new PW.FrameBoxRow();
            let cmdFrameLabel = new Gtk.Label({
                label: _('Terminal Command:'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            if(this._dialogType == Constants.DiaglogType.DIRECTORIES)
                cmdFrameLabel.label =  _("Shortcut Path:");
            let cmdEntry = new Gtk.Entry();
            cmdEntry.set_width_chars(35);
            cmdFrameRow.add(cmdFrameLabel);
            cmdFrameRow.add(cmdEntry);
            mainFrame.add(cmdFrameRow);

            let addButton = new Gtk.Button({
                label: this.isAppEdit ?_("Apply") :_("Add")
            });

            if(this.appArray!=null) {
                nameEntry.text=this.appArray[0];
                iconEntry.text=this.appArray[1];
                cmdEntry.text=this.appArray[2];
            }
            addButton.connect('clicked', ()=> {
                this.newPinnedAppsArray.push(nameEntry.get_text());
                this.newPinnedAppsArray.push(iconEntry.get_text());
                this.newPinnedAppsArray.push(cmdEntry.get_text());
                this.addResponse = true;
                this.response(-10);
            });
            addButton.set_halign(Gtk.Align.END);

            vbox.add(mainFrame);
            vbox.add(addButton);
        }

        get_newPinnedAppsArray(){
          return this.newPinnedAppsArray;
        }

        get_response(){
          return this.addResponse;
        }
});

var GeneralPage = GObject.registerClass(
    class Arc_Menu_GeneralPage extends Gtk.ScrolledWindow {
        _init(settings) {
            super._init();
            this.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
    
            this.mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
                spacing: 20,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
    
            this.add(this.mainBox);
            this._settings = settings;
            
            let arcMenuPlacementHeader = new Gtk.Label({
                label: "<b>" + _("Panel and Dock Options") + "</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            this.mainBox.add(arcMenuPlacementHeader);
            let menuPlacementFrame = new PW.FrameBox();
            this._createDisplayOnFrame(menuPlacementFrame, true);     
            this._settings.connect('changed::available-placement', ()=>{
                menuPlacementFrame.remove_all_children();
                this._createDisplayOnFrame(menuPlacementFrame, false);   
                menuPlacementFrame.show_all();
            }) 

            this.mainBox.add(menuPlacementFrame);
        
            let hotCornerHeader = new Gtk.Label({
                label: "<b>" + _("Activities Hot Corner Options") + "</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            this.mainBox.add(hotCornerHeader);

            let modifyHotCornerFrame = new PW.FrameBox();
            let modifyHotCornerRow = new PW.FrameBoxRow();
            let modifyHotCornerLabel = new Gtk.Label({
                label: _("Modify Activities Hot Corner"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            
            let modifyHotCornerButton = new PW.Button({
                icon_name: 'emblem-system-symbolic',
            });
            modifyHotCornerButton.connect('clicked', ()=> {
                let dialog = new ModifyHotCornerDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', ()=> { 
                    dialog.destroy();
                }); 
            });
            let modifyHotCornerSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
            });
            modifyHotCornerSwitch.set_active(this._settings.get_boolean('override-hot-corners'));
            modifyHotCornerButton.set_sensitive(this._settings.get_boolean('override-hot-corners'));
            modifyHotCornerSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('override-hot-corners',widget.get_active());
                modifyHotCornerButton.set_sensitive(widget.get_active());
                if(!widget.get_active()){
                    this._settings.set_enum('hot-corners',Constants.HotCornerAction.DEFAULT);
                }
            });
            modifyHotCornerRow.add(modifyHotCornerLabel);
            modifyHotCornerRow.add(modifyHotCornerButton);
            modifyHotCornerRow.add(modifyHotCornerSwitch);
            modifyHotCornerFrame.add(modifyHotCornerRow);
            this.mainBox.add(modifyHotCornerFrame);

            let keyReleaseRow = new PW.FrameBoxRow();
            let keyReleaseLabel = new Gtk.Label({
                label: _("Hotkey activation"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let keyReleaseCombo = new Gtk.ComboBoxText({ 
                halign: Gtk.Align.END,
            });
            keyReleaseCombo.append_text(_("Key Release"));
            keyReleaseCombo.append_text(_("Key Press"));
            if(this._settings.get_boolean('disable-hotkey-onkeyrelease'))
                keyReleaseCombo.set_active(1);
            else 
                keyReleaseCombo.set_active(0);
            keyReleaseCombo.connect('changed', (widget) => {
                if(widget.get_active()==0)
                    this._settings.set_boolean('disable-hotkey-onkeyrelease',false);
                if(widget.get_active()==1)
                    this._settings.set_boolean('disable-hotkey-onkeyrelease',true);
            });

            keyReleaseRow.add(keyReleaseLabel);
            keyReleaseRow.add(keyReleaseCombo);

            let menuHotkeyHeader = new Gtk.Label({
                label: "<b>" + _("Hotkey Options") + "</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            this.mainBox.add(menuHotkeyHeader);

            this.menuKeybindingFrame = new PW.FrameBox();
            let menuHotkeyLabelRow = new PW.FrameBoxRow();
            let menuHotkeyLabel = new Gtk.Label({
                label: _("Choose a Hotkey for ArcMenu"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            menuHotkeyLabelRow.add(menuHotkeyLabel);

            let menuHotkeyButtonRow = new PW.FrameBoxRow();
            let leftButton = new Gtk.RadioButton({
                label: _("Left Super Key"),
                halign: Gtk.Align.CENTER,
                hexpand: true,
                draw_indicator: false
            });   
            let rightButton = new Gtk.RadioButton({
                label: _("Right Super Key"),
                group: leftButton,
                halign: Gtk.Align.CENTER,
                hexpand: true,
                draw_indicator: false
            });   
            let customButton = new Gtk.RadioButton({
                label: _("Custom Hotkey"),
                group: leftButton,
                halign: Gtk.Align.CENTER,
                hexpand: true,
                draw_indicator: false 
            });   
            this.undefinedButton = new Gtk.RadioButton({
                label: _("None"),
                group: leftButton,
                halign: Gtk.Align.CENTER,
                hexpand: true,
                draw_indicator: false
            });  
            switch (this._settings.get_enum('menu-hotkey')) {
                case 0:
                    this.undefinedButton.set_active(true);
                    break;
                case 1:
                    leftButton.set_active(true);
                    break;
                case 2:
                    rightButton.set_active(true);
                    break;
                case 3:
                    customButton.set_active(true);
                    break;
            }
            this.undefinedButton.connect('toggled', () => {
                if(this.undefinedButton.get_active()){
                    if(this.menuKeybindingFrame.count > 2)
                        this.menuKeybindingFrame.removeChildrenAfterIndex(1);
                    this._settings.set_enum('menu-hotkey', 0);
                }
            });
            leftButton.connect('toggled', () => {
                if(leftButton.get_active()){
                    if(this.menuKeybindingFrame.count > 2)
                        this.menuKeybindingFrame.removeChildrenAfterIndex(1);
                    this._settings.set_enum('menu-hotkey', 1);
                }    
            });
            rightButton.connect('toggled', () => {
                if(rightButton.get_active()){
                    if(this.menuKeybindingFrame.count > 2)
                        this.menuKeybindingFrame.removeChildrenAfterIndex(1);
                    this.menuKeybindingFrame.add(keyReleaseRow);
                    this.menuKeybindingFrame.show_all();
                    this._settings.set_enum('menu-hotkey', 2);
                }
            });
            customButton.connect('toggled', () => {
                if(customButton.get_active()){
                    if(this.menuKeybindingFrame.count > 2)
                        this.menuKeybindingFrame.removeChildrenAfterIndex(1);
                    this.menuKeybindingFrame.add(menuKeybindingRow);
                    this.menuKeybindingFrame.add(keyReleaseRow);
                    this.menuKeybindingFrame.show_all();
                    this._settings.set_enum('menu-hotkey', 3);
                }
            });

            menuHotkeyButtonRow.add(this.undefinedButton);
            menuHotkeyButtonRow.add(leftButton);
            menuHotkeyButtonRow.add(rightButton);
            menuHotkeyButtonRow.add(customButton);

            this.menuKeybindingFrame.add(menuHotkeyLabelRow);
            this.menuKeybindingFrame.add(menuHotkeyButtonRow);

            let menuKeybindingRow = new PW.FrameBoxRow();    
            let currentHotkeyLabel = new Gtk.Label( {
                label: _("Current Hotkey"),
                use_markup: true,
                xalign: 0,
                hexpand: false
            });

            let shortcutCell = new Gtk.ShortcutsShortcut({
                halign: Gtk.Align.CENTER,
                hexpand: true,
            });
            shortcutCell.accelerator = this._settings.get_string('menu-keybinding-text');
            
            let modifyHotkeyButton = new Gtk.Button({
                label: _("Modify Hotkey"),
                halign: Gtk.Align.END,
                hexpand: false,
            });   
            menuKeybindingRow.add(currentHotkeyLabel);
            menuKeybindingRow.add(shortcutCell);
            menuKeybindingRow.add(modifyHotkeyButton);
            modifyHotkeyButton.connect('clicked', () => {
                let dialog = new CustomHotkeyDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', () => {   
                    if(dialog.addResponse) {
                        this._settings.set_enum('menu-hotkey', 0);
                        this._settings.set_string('menu-keybinding-text', dialog.resultsText);
                        this._settings.set_enum('menu-hotkey', 3);
                        shortcutCell.accelerator = dialog.resultsText;                   
                        dialog.destroy();
                    }
                    else {
                        shortcutCell.accelerator = this._settings.get_string('menu-keybinding-text');
                        this._settings.set_enum('menu-hotkey', 3);
                        dialog.destroy();
                    }
                }); 
            });
            if(this._settings.get_enum('menu-hotkey')==2)
                this.menuKeybindingFrame.add(keyReleaseRow);
            if(this._settings.get_enum('menu-hotkey')==3 ){
                this.menuKeybindingFrame.add(menuKeybindingRow);
                this.menuKeybindingFrame.add(keyReleaseRow);
            }
            this.mainBox.add(this.menuKeybindingFrame);
        }
        _createDisplayOnFrame(menuPlacementFrame, setComboBox){
            let menuPlacementRow = new PW.FrameBoxRow();
            let menuPlacementLabel = new Gtk.Label({
                label: _("Display ArcMenu On"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let menuPlacementCombo = new Gtk.ComboBoxText({ 
                halign: Gtk.Align.END,
            });

            let avaliablePlacement = this._settings.get_value('available-placement').deep_unpack();
            let dashExtensionName = _("Dash to Dock");
            let gnomeSettings = Gio.Settings.new("org.gnome.shell");
            let enabledExtensions = gnomeSettings.get_strv('enabled-extensions');
            if (enabledExtensions.includes('ubuntu-dock@ubuntu.com')) {
                dashExtensionName = _("Ubuntu Dock");
            }
    
            menuPlacementCombo.append_text(_("Main Panel"));
            menuPlacementCombo.append_text(_("Dash to Panel"));
            menuPlacementCombo.append_text(dashExtensionName);

            menuPlacementRow.add(menuPlacementLabel);
            menuPlacementRow.add(menuPlacementCombo);
            menuPlacementFrame.add(menuPlacementRow);

            let dashToDockWarningRow = new PW.FrameBoxRow();
            let dashToDockWarningLabel = new Gtk.Label({
                label: _("Dash to Dock extension not running!") + "\n" + _("Enable Dash to Dock for this feature to work."),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let showActivitiesRow = new PW.FrameBoxRow();
            let showActivitiesLabel = new Gtk.Label({
                label: _("Show Activities Button"),                 
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let showActivitiesSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
            });
            showActivitiesSwitch.set_active(this._settings.get_boolean('show-activities-button'));
            showActivitiesSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('show-activities-button', widget.get_active());
            });
            showActivitiesRow.add(showActivitiesLabel);
            showActivitiesRow.add(showActivitiesSwitch);

            let warningImage = new Gtk.Image({ 
                icon_name: 'warning-symbolic',
                pixel_size: 24
            });
            let warningImageBox = new Gtk.Box({
                margin_top: 0,
                margin_bottom: 0,
                margin_start: 10
            });
            warningImageBox.add(warningImage);

            if(!avaliablePlacement[Constants.ArcMenuPlacement.DASH]){
                dashToDockWarningRow.add(warningImageBox);
            }
            dashToDockWarningRow.add(dashToDockWarningLabel);

            let panelWarningRow = new PW.FrameBoxRow();
            let panelWarningLabel = new Gtk.Label({
                label: avaliablePlacement[Constants.ArcMenuPlacement.DTP] ? _("Main Panel not found!") :
                                            _("Dash to Panel extension not running!") + "\n" + _("Enable Dash to Panel for this feature to work."),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });    
            let panelWarningImage = new Gtk.Image({ 
                icon_name: 'warning-symbolic',
                pixel_size: 24
            });
            let panelWarningImageBox = new Gtk.Box({
                margin_top: 0,
                margin_bottom: 0,
                margin_start: 10
            });
            panelWarningImageBox.add(panelWarningImage);
            panelWarningRow.add(panelWarningImageBox);
            panelWarningRow.add(panelWarningLabel);

            let menuPositionRow = new PW.FrameBoxRow();
            let menuPositionBoxLabel = new Gtk.Label({
                label: _("Position in Panel"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let menuPositionLeftButton = new Gtk.RadioButton({
                label: _('Left'),
                draw_indicator: false
            });
            let menuPositionCenterButton = new Gtk.RadioButton({
                label: _('Center'),
                group: menuPositionLeftButton,
                draw_indicator: false
            });
            let menuPositionRightButton = new Gtk.RadioButton({
                label: _('Right'),
                group: menuPositionLeftButton,
                draw_indicator: false
            });
            

            switch (this._settings.get_enum('position-in-panel')) {
                case Constants.MenuPosition.LEFT:
                    menuPositionLeftButton.set_active(true);
                    break;
                case Constants.MenuPosition.CENTER:
                    menuPositionCenterButton.set_active(true);
                    break;
                case Constants.MenuPosition.RIGHT:
                    menuPositionRightButton.set_active(true);
                    break;
            }

            menuPositionRow.add(menuPositionBoxLabel);
            menuPositionRow.add(menuPositionLeftButton);
            menuPositionRow.add(menuPositionCenterButton);
            menuPositionRow.add(menuPositionRightButton);
            
            let menuPositionAdjustmentRow = new PW.FrameBoxRow();
            let menuPositionAdjustmentLabel = new Gtk.Label({
                label: _("Menu Alignment"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let alignmentScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL, 
                adjustment: new Gtk.Adjustment({lower: 0, upper: 100, step_increment: 1, page_increment: 1, page_size: 0}),
                digits: 0, round_digits: 0, hexpand: true,
            });
            alignmentScale.add_mark(0, Gtk.PositionType.BOTTOM, _("Left"));
            alignmentScale.add_mark(50, Gtk.PositionType.BOTTOM, _("Center"));
            alignmentScale.add_mark(100, Gtk.PositionType.BOTTOM, _("Right"));

            alignmentScale.set_value(this._settings.get_int('menu-position-alignment'));
            alignmentScale.connect('value-changed', (widget) => {
                this._settings.set_int('menu-position-alignment', widget.get_value());
            }); 
            menuPositionAdjustmentRow.add(menuPositionAdjustmentLabel);
            menuPositionAdjustmentRow.add(alignmentScale);

            let multiMonitorRow = new PW.FrameBoxRow();
            let multiMonitorLabel = new Gtk.Label({
                label: _("Display ArcMenu on all monitors"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let multiMonitorSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
            });
            multiMonitorSwitch.set_active(this._settings.get_boolean('multi-monitor'));
            multiMonitorSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('multi-monitor', widget.get_active());
            });

            multiMonitorRow.add(multiMonitorLabel);
            multiMonitorRow.add(multiMonitorSwitch);
            
            menuPlacementCombo.connect('changed', (widget) => {
                let placement = widget.get_active();
                this._settings.set_enum('arc-menu-placement', placement);
                menuPlacementFrame.remove_all_children();
                menuPlacementFrame.add(menuPlacementRow);
                if(menuPlacementCombo.get_active() == Constants.ArcMenuPlacement.PANEL){
                    if(avaliablePlacement[Constants.ArcMenuPlacement.PANEL] === false){
                        menuPlacementFrame.add(panelWarningRow);
                    }
                    else{
                        menuPlacementFrame.add(menuPositionRow);
                        if(this._settings.get_enum('position-in-panel') == Constants.MenuPosition.CENTER)
                            menuPlacementFrame.add(menuPositionAdjustmentRow);
                        if(avaliablePlacement[Constants.ArcMenuPlacement.DTP])
                            menuPlacementFrame.add(multiMonitorRow);
                        menuPlacementFrame.add(showActivitiesRow);
                    }
                    menuPlacementFrame.show_all();
                }
                else if(menuPlacementCombo.get_active() == Constants.ArcMenuPlacement.DTP){
                    if(avaliablePlacement[Constants.ArcMenuPlacement.DTP]){
                        menuPlacementFrame.add(menuPositionRow);
                        if(this._settings.get_enum('position-in-panel') == Constants.MenuPosition.CENTER)
                            menuPlacementFrame.add(menuPositionAdjustmentRow);
                        menuPlacementFrame.add(multiMonitorRow);
                        menuPlacementFrame.add(showActivitiesRow);
                    }
                    else
                        menuPlacementFrame.add(panelWarningRow);
    
                    menuPlacementFrame.show_all();
                }
                else{
                    if(avaliablePlacement[Constants.ArcMenuPlacement.DASH]){
                        menuPlacementFrame.add(multiMonitorRow);
                        menuPlacementFrame.add(showActivitiesRow);  
                    }
                    else
                        menuPlacementFrame.add(dashToDockWarningRow);

                    menuPlacementFrame.show_all();
                }
            });
            let placement = this._settings.get_enum('arc-menu-placement');
            if(setComboBox){
                if(placement == Constants.ArcMenuPlacement.PANEL && !avaliablePlacement[Constants.ArcMenuPlacement.PANEL])
                    menuPlacementCombo.set_active(Constants.ArcMenuPlacement.DTP);
                else if(placement == Constants.ArcMenuPlacement.DTP && !avaliablePlacement[Constants.ArcMenuPlacement.DTP])
                    menuPlacementCombo.set_active(Constants.ArcMenuPlacement.PANEL);  
                else
                    menuPlacementCombo.set_active(placement);
            }
            else
                menuPlacementCombo.set_active(placement);
            
            menuPositionLeftButton.connect('toggled', () => {
                this._settings.set_enum('position-in-panel', Constants.MenuPosition.LEFT);
                if(menuPlacementFrame.get_index(2) === menuPositionAdjustmentRow)
                    menuPlacementFrame.remove(menuPositionAdjustmentRow);
            });
            menuPositionCenterButton.connect('toggled', () => {
                this._settings.set_enum('position-in-panel', Constants.MenuPosition.CENTER);
                if(menuPlacementFrame.get_index(2) != menuPositionAdjustmentRow){
                    menuPlacementFrame.insert(menuPositionAdjustmentRow, 2);
                    menuPlacementFrame.show_all();
                }
            });
            menuPositionRightButton.connect('toggled', () => {
                this._settings.set_enum('position-in-panel', Constants.MenuPosition.RIGHT);
                if(menuPlacementFrame.get_index(2) === menuPositionAdjustmentRow)
                    menuPlacementFrame.remove(menuPositionAdjustmentRow);
            });
        }
});

var ModifyHotCornerDialogWindow = GObject.registerClass(
    class Arc_Menu_ModifyHotCornerDialogWindow extends PW.DialogWindow {
        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            super._init(_('Modify Activities Hot Corner'), parent);
            this.set_default_size(600,250);
        }

        _createLayout(vbox) {  
            let modifyHotCornerFrame = new PW.FrameBox();
            let modifyHotCornerRow = new PW.FrameBoxRow();
            let modifyHotCornerLabel = new Gtk.Label({
                label: _("Activities Hot Corner Action"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let hotCornerActionCombo = new Gtk.ComboBoxText({ 
                halign: Gtk.Align.END,
            });
            hotCornerActionCombo.append_text(_("GNOME Default"));
            hotCornerActionCombo.append_text(_("Disabled"));
            hotCornerActionCombo.append_text(_("Open ArcMenu"));
            hotCornerActionCombo.append_text(_("Custom"));
            
            let customHotCornerFrame = new PW.FrameBox();
            let customHeaderHotCornerRow = new PW.FrameBoxRow();
            
            let customHeaderHotCornerLabel = new Gtk.Label({
                label: "<b>"+_("Custom Activities Hot Corner Action") + "</b>\n" + _("Choose from a list of preset commands or use your own terminal command"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            customHeaderHotCornerLabel.set_sensitive(false);
            customHeaderHotCornerRow.add(customHeaderHotCornerLabel);
            
            let presetCustomHotCornerRow = new PW.FrameBoxRow();
            let presetCustomHotCornerLabel = new Gtk.Label({
                label: _("Preset commands"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let hotCornerPresetsCombo = new Gtk.ComboBoxText({ 
                hexpand: true
            });

            hotCornerPresetsCombo.append_text(_("Show all Applications"));
            hotCornerPresetsCombo.append_text(_("GNOME Terminal"));
            hotCornerPresetsCombo.append_text(_("GNOME System Monitor"));
            hotCornerPresetsCombo.append_text(_("GNOME Calculator"));
            hotCornerPresetsCombo.append_text(_("GNOME gedit"));
            hotCornerPresetsCombo.append_text(_("GNOME Screenshot"));
            hotCornerPresetsCombo.append_text(_("GNOME Weather"));
            hotCornerPresetsCombo.append_text(_("Run Command..."));
            hotCornerPresetsCombo.connect('changed', (widget) => {
                if(widget.get_active() === 0)
                    customHotCornerEntry.set_text("ArcMenu_ShowAllApplications");
                else if(widget.get_active() === 1)
                    customHotCornerEntry.set_text("gnome-terminal");
                else if(widget.get_active() === 2)
                    customHotCornerEntry.set_text("gnome-system-monitor");
                else if(widget.get_active() === 3)
                    customHotCornerEntry.set_text("gnome-calculator");
                else if(widget.get_active() === 4)
                    customHotCornerEntry.set_text("gedit");
                else if(widget.get_active() === 5)
                    customHotCornerEntry.set_text("gnome-screenshot");
                else if(widget.get_active() === 6)
                    customHotCornerEntry.set_text("gnome-weather");
                else if(widget.get_active() === 7)
                    customHotCornerEntry.set_text("ArcMenu_RunCommand");
            });
            presetCustomHotCornerRow.add(presetCustomHotCornerLabel);
            presetCustomHotCornerRow.add(hotCornerPresetsCombo);
            
            let customHotCornerRow = new PW.FrameBoxRow();
            let customHotCornerLabel = new Gtk.Label({
                label: _("Terminal Command"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let customHotCornerEntry = new Gtk.Entry({
            });
            customHotCornerEntry.set_text(this._settings.get_string('custom-hot-corner-cmd'));
            customHotCornerEntry.connect('changed', (widget) => {
                applyButton.set_sensitive(true); 
                let index = this.checkIfMatch(customHotCornerEntry.get_text());
                hotCornerPresetsCombo.set_active(index)
            });
            customHotCornerEntry.set_width_chars(40);
            
            let index = this.checkIfMatch(customHotCornerEntry.get_text());
            hotCornerPresetsCombo.set_active(index)
            customHotCornerRow.add(customHotCornerLabel);
            customHotCornerRow.add(customHotCornerEntry);

            customHotCornerFrame.add(customHeaderHotCornerRow);
            customHotCornerFrame.add(presetCustomHotCornerRow);
            customHotCornerFrame.add(customHotCornerRow);
            
            let applyButton = new Gtk.Button({
                label: _("Apply"),
                hexpand: true,
            });
            applyButton.connect('clicked', () => {
                this._settings.set_string('custom-hot-corner-cmd',customHotCornerEntry.get_text());
                this._settings.set_enum('hot-corners',hotCornerActionCombo.get_active());
                applyButton.set_sensitive(false);
                this.addResponse = true;
                this.response(-10);
            });
            applyButton.set_halign(Gtk.Align.END);
            applyButton.set_sensitive(false);
           

            let hotCornerAction = this._settings.get_enum('hot-corners');
            hotCornerActionCombo.set_active(hotCornerAction);
            hotCornerActionCombo.connect('changed', (widget) => {
                applyButton.set_sensitive(true);
                if(widget.get_active()==Constants.HotCornerAction.CUSTOM){
                    customHotCornerFrame.set_sensitive(true);
                }
                else{
                    customHotCornerFrame.set_sensitive(false);
                }
            });

            modifyHotCornerRow.add(modifyHotCornerLabel);
            modifyHotCornerRow.add(hotCornerActionCombo);
            modifyHotCornerFrame.add(modifyHotCornerRow);
            if(hotCornerActionCombo.get_active() == Constants.HotCornerAction.CUSTOM)
                customHotCornerFrame.set_sensitive(true);
            else
                customHotCornerFrame.set_sensitive(false);
            vbox.add(modifyHotCornerFrame);
            vbox.add(customHotCornerFrame);
            vbox.add(applyButton);
        }
        checkIfMatch(text){
            if(text === "ArcMenu_ShowAllApplications")
                return 0;
            else if(text === "gnome-terminal")
                return 1;
            else if(text === "gnome-system-monitor")
                return 2;
            else if(text === "gnome-calculator")
                return 3;
            else if(text === "gedit")
                return 4;
            else if(text === "gnome-screenshot")
                return 5;
            else if(text === "gnome-weather")
                return 6;
            else if(text === "ArcMenu_RunCommand")
                return 7;
            else
                return -1;
        }
});

var CustomHotkeyDialogWindow = GObject.registerClass({
    Signals: {
        'response': { param_types: [GObject.TYPE_INT] },
    },
},
    class Arc_Menu_CustomHotkeyDialogWindow extends Gtk.Window {
        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            
            super._init({
                modal: true,
                title: _("Set Custom Hotkey"),
                transient_for: parent.get_toplevel(),
                window_position: Gtk.WindowPosition.CENTER_ON_PARENT
            });
            this.set_size_request(500, 250);
            let vbox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 20,
                homogeneous: false,
                margin_top: 5,
                margin_bottom: 5,
                margin_start: 5,
                margin_end: 5,
                hexpand: true,
                halign: Gtk.Align.FILL
            });
            this.add(vbox);
            this._createLayout(vbox);
        }

        _createLayout(vbox) {
            let hotkeyKey = '';

            let modLabel = new Gtk.Label({
                label:_("Choose Modifiers"),
                use_markup: true,
                hexpand: true,
                halign: Gtk.Align.START
            });
            let modFrame = new PW.FrameBox();
            let modRow = new PW.FrameBoxRow();
            modRow.add(modLabel);

            let buttonBox = new Gtk.Box({
                hexpand: true,
                halign: Gtk.Align.END,
                spacing: 5
            });
            modRow.add(buttonBox);
            let ctrlButton = new Gtk.ToggleButton({
                label: _("Ctrl")
            });   
            let superButton = new Gtk.ToggleButton({
                label: _("Super")
            });   
            let shiftButton = new Gtk.ToggleButton({
                label: _("Shift")
            });   
            let altButton = new Gtk.ToggleButton({
                label: _("Alt")
            });  
            ctrlButton.connect('toggled', () => {
                this.resultsText=""; 
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += hotkeyKey;   
                resultsWidget.accelerator =  this.resultsText; 
                applyButton.set_sensitive(true);      
            });
            superButton.connect('toggled', () => {
                this.resultsText=""; 
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += hotkeyKey;   
                resultsWidget.accelerator =  this.resultsText;   
                applyButton.set_sensitive(true);    
            });
            shiftButton.connect('toggled', () => {
                this.resultsText=""; 
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += hotkeyKey;   
                resultsWidget.accelerator =  this.resultsText; 
                applyButton.set_sensitive(true);      
            });
            altButton.connect('toggled', () => {
                this.resultsText=""; 
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += hotkeyKey;   
                resultsWidget.accelerator =  this.resultsText;  
                applyButton.set_sensitive(true);     
            });
            buttonBox.add(ctrlButton);
            buttonBox.add(superButton);
            buttonBox.add(shiftButton);
            buttonBox.add(altButton);
            modFrame.add(modRow);
            vbox.add(modFrame);

            let keyFrame = new PW.FrameBox();
            let keyLabel = new Gtk.Label({
                label: _("Press any key"),
                use_markup: true,
                xalign: .5,
                hexpand: true,
                halign: Gtk.Align.CENTER
            });
            vbox.add(keyLabel);
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(Me.path + '/media/icons/prefs_icons/keyboard-symbolic.svg', 256, 72);
            let keyboardImage = new Gtk.Image({
                pixbuf: pixbuf
            });
            keyboardImage.hexpand = true;
            keyboardImage.vexpand = true;
            keyboardImage.halign = Gtk.Align.CENTER;
            keyboardImage.valign = Gtk.Align.CENTER;
            vbox.add(keyboardImage)

            let resultsRow = new PW.FrameBoxRow(); 
            let resultsLabel = new Gtk.Label({
                label: _("New Hotkey"),
                use_markup: true,
                xalign: .5,
                hexpand: false,
                halign: Gtk.Align.START
            });
            let resultsWidget = new Gtk.ShortcutsShortcut({
                hexpand: true,
                halign: Gtk.Align.END
            });
            resultsRow.add(resultsLabel);
            resultsRow.add(resultsWidget);
            keyFrame.add(resultsRow);

            let applyButton = new Gtk.Button({
                label: _("Apply"),
                halign: Gtk.Align.END
            });
            applyButton.connect('clicked', () => {
                this.addResponse = true;
                this.emit("response", -10);
            });
            applyButton.set_sensitive(false);

            this.connect('key-release-event', (widget, event) => {
                this.resultsText = "";
                let key = event.get_keyval()[1];
                hotkeyKey = Gtk.accelerator_name(key, 0);    
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += Gtk.accelerator_name(key,0);   
                resultsWidget.accelerator =  this.resultsText;   
                applyButton.set_sensitive(true);  
            });

            vbox.add(keyFrame);
            vbox.add(applyButton);    
        }
});

function getIconPixbuf(filePath){
    if (GLib.file_test(filePath, GLib.FileTest.EXISTS)) 
        return GdkPixbuf.Pixbuf.new_from_file_at_size(filePath, 25, 25);
    else
        return null;
}

var ButtonAppearancePage = GObject.registerClass(
    class Arc_Menu_ButtonAppearancePage extends Gtk.ScrolledWindow {
        _init(settings) {
            super._init();
            this.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
    
            this.mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
                spacing: 20,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
    
            this.add_with_viewport(this.mainBox);
            this._settings = settings;
            this.menuButtonColor = this._settings.get_string('menu-button-color');
            this.menuButtonHoverColor = this._settings.get_string('menu-button-hover-color');
            this.menuButtonActiveColor = this._settings.get_string('menu-button-active-color');
            this.menuButtonHoverBackgroundcolor = this._settings.get_string('menu-button-hover-backgroundcolor');
            this.menuButtonActiveBackgroundcolor = this._settings.get_string('menu-button-active-backgroundcolor');
            this._createLayout(this.mainBox);
        }

        _createLayout(vbox) {
            let menuButtonAppearanceHeaderLabel = new Gtk.Label({
                label: "<b>" + _('Menu Button Appearance') +"</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            this.mainBox.add(menuButtonAppearanceHeaderLabel);

            let menuButtonAppearanceFrame = new PW.FrameBox();
            let menuButtonAppearanceRow = new PW.FrameBoxRow();
            let menuButtonAppearanceLabel = new Gtk.Label({
                label: _('Appearance'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let menuButtonAppearanceCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            menuButtonAppearanceCombo.append_text(_("Icon"));
            menuButtonAppearanceCombo.append_text(_("Text"));
            menuButtonAppearanceCombo.append_text(_("Icon and Text"));
            menuButtonAppearanceCombo.append_text(_("Text and Icon"));
            menuButtonAppearanceCombo.append_text(_("Hidden"));
            menuButtonAppearanceCombo.set_active(this._settings.get_enum('menu-button-appearance'));
            menuButtonAppearanceCombo.connect('changed', (widget) => {
                this.resetButton.set_sensitive(true); 
                menuButtonAppearanceFrame.removeChildrenAfterIndex(0);
                if(widget.get_active() === Constants.MenuButtonAppearance.NONE){
                    menuButtonAppearanceFrame.show_all();
                }
                else if(widget.get_active() === Constants.MenuButtonAppearance.ICON){
                    menuButtonAppearanceFrame.add(menuButtonArrowIconBoxRow);
                    menuButtonAppearanceFrame.add(menuButtonPaddingRow);
                    menuButtonAppearanceFrame.show_all();
                }
                else if(widget.get_active() === Constants.MenuButtonAppearance.ICON_TEXT || widget.get_active() === Constants.MenuButtonAppearance.TEXT_ICON ||
                        widget.get_active() === Constants.MenuButtonAppearance.TEXT){
                    menuButtonAppearanceFrame.add(menuButtonArrowIconBoxRow);
                    menuButtonAppearanceFrame.add(menuButtonPaddingRow);
                    menuButtonAppearanceFrame.add(menuButtonCustomTextBoxRow);
                    menuButtonAppearanceFrame.show_all();
                }
                this._settings.set_enum('menu-button-appearance', widget.get_active());
            });
            
            menuButtonAppearanceRow.add(menuButtonAppearanceLabel);
            menuButtonAppearanceRow.add(menuButtonAppearanceCombo);
            menuButtonAppearanceFrame.add(menuButtonAppearanceRow);

            let menuButtonArrowIconBoxRow = new PW.FrameBoxRow();
            let menuButtonArrowIconLabel = new Gtk.Label({
                label: _('Show Arrow'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let enableArrowIconSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            enableArrowIconSwitch.set_active(this._settings.get_boolean('enable-menu-button-arrow'));
            enableArrowIconSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('enable-menu-button-arrow', widget.get_active());
                this.resetButton.set_sensitive(true);  
            });

            menuButtonArrowIconBoxRow.add(menuButtonArrowIconLabel);
            menuButtonArrowIconBoxRow.add(enableArrowIconSwitch);
            if(menuButtonAppearanceCombo.get_active() !== Constants.MenuButtonAppearance.NONE)
                menuButtonAppearanceFrame.add(menuButtonArrowIconBoxRow);

            let menuButtonPaddingRow = new PW.FrameBoxRow();
            let menuButtonPadding = this._settings.get_int('button-padding');
            let menuButtonPaddingLabel = new Gtk.Label({
                label: _('Menu Button Padding'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let paddingScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({
                    lower: -1,
                    upper: 25,
                    step_increment: 1,
                    page_increment: 1,
                    page_size: 0
                }),
                digits: 0,
                round_digits: 0,
                hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            paddingScale.connect('format-value', (scale, value) => { return value.toString() + ' px'; });
            paddingScale.add_mark(-1, Gtk.PositionType.TOP, _("Default"));
            paddingScale.set_value(menuButtonPadding);
            paddingScale.connect('value-changed', () => {
                this.resetButton.set_sensitive(true); 
                this._settings.set_int('button-padding', paddingScale.get_value());
                this._settings.set_boolean('reload-theme', true);
            });

            menuButtonPaddingRow.add(menuButtonPaddingLabel);
            menuButtonPaddingRow.add(paddingScale);
            if(menuButtonAppearanceCombo.get_active() !== Constants.MenuButtonAppearance.NONE)
                menuButtonAppearanceFrame.add(menuButtonPaddingRow);

            let menuButtonCustomTextBoxRow = new PW.FrameBoxRow();
            let menuButtonCustomTextLabel = new Gtk.Label({
                label: _('Text'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let menuButtonCustomTextEntry = new Gtk.Entry({ halign: Gtk.Align.END });
            menuButtonCustomTextEntry.set_width_chars(30);
            menuButtonCustomTextEntry.set_text(this._settings.get_string('custom-menu-button-text'));
            menuButtonCustomTextEntry.connect('changed', (widget) => {
                this.resetButton.set_sensitive(true); 
                let customMenuButtonText = widget.get_text();
                this._settings.set_string('custom-menu-button-text', customMenuButtonText);
            });

            menuButtonCustomTextBoxRow.add(menuButtonCustomTextLabel);
            menuButtonCustomTextBoxRow.add(menuButtonCustomTextEntry);
            if(this._settings.get_enum('menu-button-appearance') != Constants.MenuButtonAppearance.ICON && this._settings.get_enum('menu-button-appearance') != Constants.MenuButtonAppearance.NONE)
                menuButtonAppearanceFrame.add(menuButtonCustomTextBoxRow);
            vbox.add(menuButtonAppearanceFrame);

            let menuButtonIconHeaderLabel = new Gtk.Label({
                label: "<b>" + _('Icon Appearance') +"</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            this.mainBox.add(menuButtonIconHeaderLabel);    

            let menuButtonIconFrame = new PW.FrameBox();
            let menuButtonIconRow = new PW.FrameBoxRow();
            let menuButtonIconLabel = new Gtk.Label({
                label: _('Icon'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            
            let menuButtonIconButton = new PW.Button({
                title: _("Browse Icons") + " ",
                icon_name: 'icon-preview-symbolic',
                hexpand: false,
            });
            menuButtonIconButton.connect('clicked', () => {
                let dialog = new ArcMenuIconsDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.setVisibleChild();
                dialog.connect('response', ()=> {
                    this.resetButton.set_sensitive(this.checkIfResetButtonSensitive());
                    dialog.destroy();
                }); 
            });

            menuButtonIconRow.add(menuButtonIconLabel);
            menuButtonIconRow.add(menuButtonIconButton);
            menuButtonIconFrame.add(menuButtonIconRow);
            
            let menuButtonIconSizeRow = new PW.FrameBoxRow();
            let iconSize = this._settings.get_double('custom-menu-button-icon-size');
            let menuButtonIconSizeLabel = new Gtk.Label({
                label: _('Icon Size'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let menuButtonIconSizeScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({
                    lower: 14,
                    upper: 64,
                    step_increment: 1,
                    page_increment: 1,
                    page_size: 0
                }),
                digits: 0,
                round_digits: 0,
                hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            menuButtonIconSizeScale.connect('format-value', (scale, value) => { return value.toString() + ' px'; });
            menuButtonIconSizeScale.set_value(iconSize);
            menuButtonIconSizeScale.connect('value-changed', () => {
                this.resetButton.set_sensitive(true); 
                this._settings.set_double('custom-menu-button-icon-size', menuButtonIconSizeScale.get_value());
            });

            menuButtonIconSizeRow.add(menuButtonIconSizeLabel);
            menuButtonIconSizeRow.add(menuButtonIconSizeScale);
            menuButtonIconFrame.add(menuButtonIconSizeRow);

            vbox.add(menuButtonIconFrame);

            this.resetButton = new Gtk.Button({
                label: _("Restore Defaults"),
                halign: Gtk.Align.START,
                hexpand: true,
                valign: Gtk.Align.END,
                vexpand: true
            });

            let menuButtonColorHeaderLabel = new Gtk.Label({
                label: "<b>" + _('Menu Button Styling') +"</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            this.mainBox.add(menuButtonColorHeaderLabel);

            this.menuButtonIconColorFrame = new PW.FrameBox();

            let[menuButtonColorSwitch, menuButtonColorChooser] = this.newColorChooserRow({
                color: this.menuButtonColor,
                label: _("Color"),
                settingColorName: 'menu-button-color',
                settingOverrideName: 'override-menu-button-color',
            });
            
            let[menuButtonHoverColorSwitch, menuButtonHoverColorChooser] = this.newColorChooserRow({
                color: this.menuButtonHoverColor,
                label: _("Hover Color"),
                settingColorName: 'menu-button-hover-color',
                settingOverrideName: 'override-menu-button-hover-color',
            });

            let[menuButtonActiveColorSwitch, menuButtonActiveColorChooser] = this.newColorChooserRow({
                color: this.menuButtonActiveColor,
                label: _("Active Color"),
                settingColorName: 'menu-button-active-color',
                settingOverrideName: 'override-menu-button-active-color',
            });

            let[menuButtonHoverBackgroundcolorSwitch, menuButtonHoverBackgroundcolorChooser] = this.newColorChooserRow({
                color: this.menuButtonHoverBackgroundcolor,
                label: _("Hover Background Color"),
                settingColorName: 'menu-button-hover-backgroundcolor',
                settingOverrideName: 'override-menu-button-hover-background-color',
            });

            let[menuButtonActiveBackgroundcolorSwitch, menuButtonActiveBackgroundcolorChooser] = this.newColorChooserRow({
                color: this.menuButtonActiveBackgroundcolor,
                label: _("Active Background Color"),
                settingColorName: 'menu-button-active-backgroundcolor',
                settingOverrideName: 'override-menu-button-active-background-color',
            });

            let disableActiveIndicatorRow = new PW.FrameBoxRow();
            let disableActiveIndicatorRowLabel = new Gtk.Label({
                label: _("Disable Active Indicator"),
                xalign: 0,
                hexpand: true,
            });
            let disableActiveIndicatorRowSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                active: this._settings.get_boolean('disable-menu-button-active-indicator')
            });
            disableActiveIndicatorRowSwitch.connect("notify::active", (widget)=> {
                this.resetButton.set_sensitive(true);
                this._settings.set_boolean('disable-menu-button-active-indicator', widget.get_active())
                this._settings.set_boolean('reload-theme', true);
            });

            disableActiveIndicatorRow.add(disableActiveIndicatorRowLabel);
            disableActiveIndicatorRow.add(disableActiveIndicatorRowSwitch);

            this.menuButtonIconColorFrame.add(disableActiveIndicatorRow);

            vbox.add(this.menuButtonIconColorFrame);

            this.resetButton.set_sensitive(this.checkIfResetButtonSensitive());
            this.resetButton.connect('clicked', ()=> {
                menuButtonAppearanceCombo.set_active(0);
                menuButtonCustomTextEntry.set_text('Applications');
                paddingScale.set_value(-1);
                menuButtonIconSizeScale.set_value(20);
                let colorParse = new Gdk.RGBA();
                colorParse.parse('rgb(240,240,240)');
                menuButtonActiveColorChooser.set_rgba(colorParse);
                menuButtonColorChooser.set_rgba(colorParse);
                colorParse.parse('rgb(214,214,214)');
                menuButtonHoverColorChooser.set_rgba(colorParse);
                colorParse.parse('rgba(238,238,236,0.1)');
                menuButtonHoverBackgroundcolorChooser.set_rgba(colorParse);
                colorParse.parse('rgba(238,238,236,0.18)');
                menuButtonActiveBackgroundcolorChooser.set_rgba(colorParse);
                enableArrowIconSwitch.set_active(false);
                menuButtonColorSwitch.set_active(false);
                menuButtonHoverColorSwitch.set_active(false);
                menuButtonActiveColorSwitch.set_active(false);
                menuButtonHoverBackgroundcolorSwitch.set_active(false);
                menuButtonActiveBackgroundcolorSwitch.set_active(false);
                disableActiveIndicatorRowSwitch.set_active(false);
                this._settings.reset('menu-button-icon');
                this._settings.reset('arc-menu-icon');
                this._settings.reset('distro-icon');
                this._settings.reset('custom-menu-button-icon');
                this._settings.reset('menu-button-hover-color');
                this._settings.reset('menu-button-active-color');
                this._settings.reset('menu-button-hover-backgroundcolor');
                this._settings.reset('menu-button-active-backgroundcolor');
                this._settings.reset('menu-button-color');
                this._settings.reset('override-menu-button-hover-color');
                this._settings.reset('override-menu-button-active-color');
                this._settings.reset('override-menu-button-hover-background-color');
                this._settings.reset('override-menu-button-active-background-color');
                this._settings.reset('override-menu-button-color');
                this._settings.reset('disable-menu-button-active-indicator');
                this._settings.set_boolean('reload-theme', true);
  
                this.resetButton.set_sensitive(false);        
            });
            vbox.add(this.resetButton);
        }

        newColorChooserRow(params){
            let colorParse = new Gdk.RGBA();
            let colorRow = new PW.FrameBoxRow();
            let buttonsGrid = new Gtk.Grid({
                margin_top: 0,
                margin_bottom: 0,
                vexpand: false,
                hexpand: false,
                column_spacing: 10
            });
            
            let colorLabel = new Gtk.Label({
                label: params.label,
                xalign:0,
                hexpand: true,
            });
            let colorSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                active: this._settings.get_boolean(params.settingOverrideName)
            });
            colorSwitch.connect("notify::active", (widget)=> {
                this.resetButton.set_sensitive(true);
                this._settings.set_boolean(params.settingOverrideName, widget.get_active())
                colorChooser.sensitive = widget.get_active();
                this._settings.set_boolean('reload-theme', true);
            });

            let colorChooser = new Gtk.ColorButton({
                use_alpha: true,
                sensitive: colorSwitch.get_active()
            });  

            colorParse.parse(params.color);
            colorChooser.set_rgba(colorParse);  

            colorChooser.connect('color-set', ()=>{
                this.resetButton.set_sensitive(true); 
                params.color = colorChooser.get_rgba().to_string();
                this._settings.set_string(params.settingColorName, params.color);
                this._settings.set_boolean('reload-theme', true);
            });

            colorRow.add(colorLabel);
            buttonsGrid.attach(colorSwitch, 0, 0, 1, 1);
            buttonsGrid.attach(Gtk.Separator.new(Gtk.Orientation.VERTICAL), 1, 0, 1, 1);
            buttonsGrid.attach(colorChooser, 2, 0, 1, 1);
            colorRow.add(buttonsGrid);
            this.menuButtonIconColorFrame.add(colorRow);
            return [colorSwitch, colorChooser];
        }

        checkIfResetButtonSensitive(){
           if(  this._settings.get_string('menu-button-hover-backgroundcolor') != 'rgba(238,238,236,0.1)' ||  
                this._settings.get_string('menu-button-active-backgroundcolor') != 'rgba(238,238,236,0.18)' || 
                this._settings.get_string('menu-button-active-color') != 'rgb(240,240,240)' ||
                this._settings.get_string('menu-button-hover-color') != 'rgb(214,214,214)' ||
                this._settings.get_string('menu-button-color') != 'rgb(240,240,240)' ||
                this._settings.get_double('custom-menu-button-icon-size') != 20 ||
                this._settings.get_int('button-padding') != -1 ||
                this._settings.get_enum('menu-button-icon') != 0 ||
                this._settings.get_int('arc-menu-icon') != 0 ||
                this._settings.get_string('custom-menu-button-text') != 'Applications' ||
                this._settings.get_enum('menu-button-appearance') != 0 ||
                this._settings.get_boolean('enable-menu-button-arrow') || 
                this._settings.get_boolean('override-menu-button-color') ||
                this._settings.get_boolean('override-menu-button-hover-color') ||
                this._settings.get_boolean('override-menu-button-active-color') ||
                this._settings.get_boolean('override-menu-button-hover-background-color') ||
                this._settings.get_boolean('override-menu-button-active-background-color') ||
                this._settings.get_boolean('disable-menu-button-active-indicator'))
                    return true;
            else
                return false;
        }
});

var ArcMenuIconsDialogWindow = GObject.registerClass(
    class Arc_Menu_ArcMenuIconsDialogWindow extends PW.DialogWindow {
        _init(settings, parent) {
            this._settings = settings;
            super._init(_('ArcMenu Icons'), parent);
            this.set_default_size(550, 400);
        }

        _createLayout(vbox){
            this.stack = new Gtk.Stack({
                halign: Gtk.Align.FILL, 
                hexpand: true,
                transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT
            });

            let arcMenuIconsBox = new Gtk.ScrolledWindow();

            let arcMenuIconsFlowBox = new PW.IconGrid();
            arcMenuIconsFlowBox.connect('child-activated', ()=> {
                distroIconsBox.unselect_all();
                customIconFlowBox.unselect_all();
                let selectedChild = arcMenuIconsFlowBox.get_selected_children();
                let selectedChildIndex = selectedChild[0].get_index();
                this._settings.set_enum('menu-button-icon', Constants.MenuIcon.ARC_MENU);
                this._settings.set_int('arc-menu-icon', selectedChildIndex);
            });
            arcMenuIconsBox.add_with_viewport(arcMenuIconsFlowBox);
            Constants.MenuIcons.forEach((icon)=>{
                let iconName = icon.PATH.replace("/media/icons/menu_button_icons/icons/", '');
                iconName = iconName.replace(".svg", '');
                let iconImage = new Gtk.Image({
                    icon_name: iconName,
                    pixel_size: 36
                });
                arcMenuIconsFlowBox.add(iconImage);
            });

            let distroIconsBox = new PW.IconGrid();
            distroIconsBox.connect('child-activated', ()=> {
                arcMenuIconsFlowBox.unselect_all();
                customIconFlowBox.unselect_all();
                let selectedChild = distroIconsBox.get_selected_children();
                let selectedChildIndex = selectedChild[0].get_index();
                this._settings.set_enum('menu-button-icon', Constants.MenuIcon.DISTRO_ICON);
                this._settings.set_int('distro-icon', selectedChildIndex);
            });
            Constants.DistroIcons.forEach((icon)=>{
                let iconImage;
                if(icon.PATH === 'start-here-symbolic'){
                    iconImage = new Gtk.Image({
                        icon_name: 'start-here-symbolic',
                        pixel_size: 36
                    });
                }
                else{
                    let iconName1 = icon.PATH.replace("/media/icons/menu_button_icons/distro_icons/", '');
                    iconName1 = iconName1.replace(".svg", '');
                    iconImage = new Gtk.Image({
                        icon_name: iconName1,
                        pixel_size: 36
                    });
                }
                distroIconsBox.add(iconImage);
            });

            let customIconBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL
            });
            let customIconFlowBox = new PW.IconGrid();
            customIconFlowBox.vexpand = false;
            customIconFlowBox.homogeneous = false;
            customIconFlowBox.connect('child-activated', ()=> {
                arcMenuIconsFlowBox.unselect_all();
                distroIconsBox.unselect_all();
                let customIconPath = this._settings.get_string('custom-menu-button-icon');
                this._settings.set_string('custom-menu-button-icon', customIconPath)
                this._settings.set_enum('menu-button-icon', Constants.MenuIcon.CUSTOM);
            });
            customIconBox.add(customIconFlowBox);
            let customIconImage = new Gtk.Image({
                gicon: Gio.icon_new_for_string(this._settings.get_string('custom-menu-button-icon')),
                pixel_size: 36
            });
            customIconFlowBox.add(customIconImage);
            
            let fileChooserFrame = new PW.FrameBox();
            fileChooserFrame.margin_top = 20;
            fileChooserFrame.margin_bottom = 20;
            fileChooserFrame.margin_start = 20;
            fileChooserFrame.margin_end = 20;
            let fileChooserRow = new PW.FrameBoxRow();
            let fileChooserLabel = new Gtk.Label({
                label: _('Browse for a Custom Icon'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let fileFilter = new Gtk.FileFilter();
            fileFilter.add_pixbuf_formats();
            let fileChooserButton = new Gtk.Button({
                label: _('Select an Icon')
            });
            fileChooserButton.connect('clicked', (widget) => {
                let dialog = new Gtk.FileChooserDialog({ 
                    title: _('Select an Icon'),
                    transient_for: this.get_toplevel(),
                    modal: true,
                    action: Gtk.FileChooserAction.OPEN,
                });

                if(dialog.get_parent())
                    dialog.unparent();
                dialog.set_filter(fileFilter);    

                dialog.add_button("_Cancel", Gtk.ResponseType.CANCEL);
                dialog.add_button("_Open", Gtk.ResponseType.ACCEPT);
        
                dialog.connect("response", (self, response) => {
                    if(response === Gtk.ResponseType.ACCEPT){
                        arcMenuIconsFlowBox.unselect_all();
                        distroIconsBox.unselect_all();
                        customIconImage.gicon = Gio.icon_new_for_string(dialog.get_file().get_path());
                        this._settings.set_string('custom-menu-button-icon', dialog.get_file().get_path());
                        this._settings.set_enum('menu-button-icon', Constants.MenuIcon.CUSTOM);
                        customIconFlowBox.select_child(customIconFlowBox.get_child_at_index(0));
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                })

                dialog.show_all();
            });
    
            fileChooserRow.add(fileChooserLabel);
            fileChooserRow.add(fileChooserButton);
            fileChooserFrame.add(fileChooserRow);
            customIconBox.add(fileChooserFrame);
            
            this.stack.add_titled(arcMenuIconsBox, 'ArcMenu Icons', _('ArcMenu Icons'));
            this.stack.add_titled(distroIconsBox, 'Distro Icons', _('Distro Icons'));
            this.stack.add_titled(customIconBox, 'Custom Icon', _('Custom Icon'));

            let stackSwitcher = new Gtk.StackSwitcher({
                stack: this.stack,
                halign: Gtk.Align.CENTER
            });

            vbox.add(stackSwitcher);
            vbox.add(this.stack);           
            if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.ARC_MENU)
                this.stack.set_visible_child_name('ArcMenu Icons');
            else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.DISTRO_ICON)
                this.stack.set_visible_child_name('Distro Icons');
            else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.CUSTOM)
                this.stack.set_visible_child_name('Custom Icon');
            
            if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.ARC_MENU){
                let children = arcMenuIconsFlowBox.childrenCount;
                for(let i = 0; i < children; i++){
                    if(i === this._settings.get_int('arc-menu-icon')){
                        arcMenuIconsFlowBox.select_child(arcMenuIconsFlowBox.get_child_at_index(i));
                        break;
                    }
                }
            }
            else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.DISTRO_ICON){
                let children = distroIconsBox.childrenCount;
                for(let i = 0; i < children; i++){
                    if(i === this._settings.get_int('distro-icon')){
                        distroIconsBox.select_child(distroIconsBox.get_child_at_index(i));
                        break;
                    }
                }
            }
            else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.CUSTOM){
                customIconFlowBox.select_child(customIconFlowBox.get_child_at_index(0));
            }

            let distroInfoButton = new PW.Button({
                icon_name: 'info-circle-symbolic'
            });
            distroInfoButton.halign = Gtk.Align.START;
            distroInfoButton.connect('clicked', ()=> {
                let dialog = new DistroIconsDisclaimerWindow(this._settings, this);
                dialog.connect ('response', ()=> dialog.destroy());
                dialog.show_all();
            });
            vbox.add(distroInfoButton);
        }

        setVisibleChild(){
            if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.ARC_MENU)
                this.stack.set_visible_child_name('ArcMenu Icons');
            else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.DISTRO_ICON)
                this.stack.set_visible_child_name('Distro Icons');
            else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.CUSTOM)
                this.stack.set_visible_child_name('Custom Icon');
        }
});

var DistroIconsDisclaimerWindow = GObject.registerClass(
    class Arc_Menu_DistroIconsDisclaimerWindow extends Gtk.MessageDialog {
        _init(settings, parent) {
            this._settings = settings;
            super._init({
                text: "<b>" + _("Legal disclaimer for Distro Icons...") + "</b>",
                use_markup: true,
                message_type: Gtk.MessageType.OTHER,
                transient_for: parent.get_toplevel(),
                modal: true,
                buttons: Gtk.ButtonsType.OK
            });
            
            let vbox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 20,
                homogeneous: false,
                margin_top: 5,
                margin_bottom: 5,
                margin_start: 5,
                margin_end: 5,
            });
            this.get_content_area().add(vbox);
            this._createLayout(vbox);
        }

        _createLayout(vbox) {         
            let scrollWindow = new Gtk.ScrolledWindow({
                min_content_width: 500,
                max_content_width: 500,
                min_content_height: 400,
                max_content_height: 400,
                hexpand: false,
                halign: Gtk.Align.START,
            });
            scrollWindow.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
            let frame = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                hexpand: false,
                halign: Gtk.Align.START
            });
           
            let bodyLabel = new Gtk.Label({
                label: Constants.DistroIconsDisclaimer,
                use_markup: true,
                hexpand: false,
                halign: Gtk.Align.START,
                wrap: true
            });
            bodyLabel.set_size_request(500,-1);
    
            frame.add(bodyLabel);
            scrollWindow.add_with_viewport(frame);
            vbox.add(scrollWindow);
        }
});

var MenuLayoutPage = GObject.registerClass(
    class Arc_Menu_MenuLayoutPage extends Gtk.Box {
        _init(settings) {
            super._init({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 20,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
            this._settings = settings;
            
            this.scrollBox = new Gtk.ScrolledWindow({
                vexpand: true,
                valign: Gtk.Align.FILL
            });
            this.scrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
            
            this.mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 20,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
            this.scrollBox.add_with_viewport(this.mainBox);

            let currentLayoutLabel = new Gtk.Label({
                label: "<b>" + _("Current Menu Layout") + "</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let chooseNewLayoutLabel = new Gtk.Label({
                label: "<b>" + _("Available Menu Layouts") + "</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            this.mainBox.add(currentLayoutLabel);

            let currentLayoutFrame = new PW.FrameBox();

            let currentLayoutBoxLabel = new Gtk.Label({
                label: "<b>" + this.getMenuLayoutName(this._settings.get_enum('menu-layout')) + "</b>",
                use_markup: true,
                hexpand: true,
                vexpand: true,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER
            });
            let currentLayoutBoxRow = new PW.FrameBoxRow({
                selectable: false,
                activatable: false
            });
            currentLayoutBoxRow.activatable = true;
            currentLayoutBoxRow._grid.row_spacing = 0;
            currentLayoutBoxRow._grid.column_spacing = 0;

            let goNextImage = new Gtk.Image({
                icon_name: 'go-next-symbolic',
                halign: Gtk.Align.END
            });
            currentLayoutFrame._listBox.connect('row-activated', () => {
                this.displayLayoutTweaksPage();
            });

            this.layoutsTweaksPage = new LayoutTweaks.tweaks.TweaksPage(this._settings, this.getMenuLayoutTweaksName(this._settings.get_enum('menu-layout')));
            this.layoutsTweaksPage.connect("response", (page, response) => {
                if(response === -20)
                    this.stack.set_visible_child_name("LayoutsBox");
            });

            let currentLayoutImagePath = this.getMenuLayoutImagePath(this._settings.get_enum('menu-layout'));
            
            let currentLayoutImage = new Gtk.Image({
                gicon: Gio.icon_new_for_string(currentLayoutImagePath),
                pixel_size: 155,
                hexpand: false,
                halign: Gtk.Align.START,
                valign: Gtk.Align.CENTER,
            });
            let tweaksLabel = new Gtk.Label({
                label: this.getMenuLayoutTweaksName(this._settings.get_enum('menu-layout')),
                use_markup: true,
                halign: Gtk.Align.END,
                vexpand: true,
                hexpand: true
            }); 
            currentLayoutBoxRow._grid.attach(currentLayoutImage, 0, 0, 1, 1);
            currentLayoutBoxRow._grid.attach(currentLayoutBoxLabel, 0, 0, 1, 1);
            currentLayoutBoxRow._grid.attach(goNextImage, 0, 0, 1, 1);
            currentLayoutFrame.add(currentLayoutBoxRow);

            this.mainBox.add(currentLayoutFrame);
            this.mainBox.add(chooseNewLayoutLabel);

            this.stack = new Gtk.Stack({
                hhomogeneous: true,
                transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT
            });
            this.layoutTilesBox = new Gtk.Grid({
                column_homogeneous: true,
                column_spacing: 14,
                row_spacing: 6,
                hexpand: true,
                halign: Gtk.Align.FILL,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
            this.mainBox.add(this.layoutTilesBox);
            this.stack.add_named(this.scrollBox, "LayoutsBox");
            this.stack.add_named(this.layoutsTweaksPage, "LayoutsTweaks")
            let gridY = 0;
            Constants.MenuStyles.STYLES.forEach((style) => {
                let tile = new PW.LayoutTile(style.TITLE, style.IMAGE, style);
                this.layoutTilesBox.attach(tile, 0, gridY, 1, 1);
                let menuLayoutsBox = new MenuLayoutCategoryPage(this._settings, this, tile, style.TITLE);
                    gridY++;
                menuLayoutsBox.connect('menu-layout-response', (dialog, response) => { 
                    if(response === -10) {
                        this._settings.set_enum('menu-layout', dialog.index);
                        this._settings.set_boolean('reload-theme', true);
                        currentLayoutBoxLabel.label = "<b>" + this.getMenuLayoutName(dialog.index) + "</b>";
                        tweaksLabel.label = this.getMenuLayoutTweaksName(dialog.index);
                        currentLayoutImage.gicon = Gio.icon_new_for_string(this.getMenuLayoutImagePath(dialog.index));
                        this.stack.set_visible_child_name("LayoutsBox");
                        this.scrollBox.vadjustment.set_value(this.scrollBox.vadjustment.get_lower());
                    }
                    if(response === -20){
                        this.stack.set_visible_child_name("LayoutsBox");
                    }
                }); 
                this.stack.add_named(menuLayoutsBox, "Layout_" + style.TITLE);
                tile._listBox.connect('row-activated', ()=> {
                    this.stack.set_visible_child_name("Layout_" + style.TITLE);
                    menuLayoutsBox.enableSelectionMode();
                });
            });
            
            this.add(this.stack);         
    }

    displayLayoutTweaksPage(){
        let activeLayoutName = this.getMenuLayoutTweaksName(this._settings.get_enum('menu-layout'));
        this.layoutsTweaksPage.setActiveLayoutName(activeLayoutName);
        this.stack.set_visible_child_name("LayoutsTweaks");
    }

    getMenuLayoutName(index){
        for(let styles of Constants.MenuStyles.STYLES){
            for(let style of styles.MENU_TYPE){
                if(style.LAYOUT == index){
                    return _(style.TITLE);
                }
            }
        }
    }

    getMenuLayoutTweaksName(index){
        for(let styles of Constants.MenuStyles.STYLES){
            for(let style of styles.MENU_TYPE){
                if(style.LAYOUT == index){
                    return _("%s Layout Tweaks", style.TITLE).format(style.TITLE);
                }
            }
        }
    }

    getMenuLayoutImagePath(index){
        for(let styles of Constants.MenuStyles.STYLES){
            for(let style of styles.MENU_TYPE){
                if(style.LAYOUT == index){
                    return style.IMAGE;
                }
            }
        }
    }
        
});

var MenuThemePage = GObject.registerClass(
    class Arc_Menu_MenuThemePage extends Gtk.Box {
        _init(settings) {
            super._init({
                orientation: Gtk.Orientation.VERTICAL,
            });
    
            this.scrollBox = new Gtk.ScrolledWindow();
            this.scrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
    
            this.mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
                spacing: 20,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
    
            this.scrollBox.add_with_viewport(this.mainBox);
            this.add(this.scrollBox);
            this._settings = settings;
            this.separatorColor = this._settings.get_string('separator-color');
            this.verticalSeparator = this._settings.get_boolean('vert-separator');
            this.customArcMenu = this._settings.get_boolean('enable-custom-arc-menu');
            this.menuColor = this._settings.get_string('menu-color');
            this.menuForegroundColor = this._settings.get_string('menu-foreground-color');
            this.borderColor = this._settings.get_string('border-color');
            this.highlightColor = this._settings.get_string('highlight-color');
            this.highlightForegroundColor = this._settings.get_string('highlight-foreground-color');
            this.fontSize = this._settings.get_int('menu-font-size');
            this.borderSize = this._settings.get_int('menu-border-size');
            this.cornerRadius = this._settings.get_int('menu-corner-radius');
            this.menuMargin = this._settings.get_int('menu-margin');
            this.menuArrowSize = this._settings.get_int('menu-arrow-size');
            this.checkIfPresetMatch();

            let overrideArcMenuHeaderLabel = new Gtk.Label({
                label: "<b>" + _('Enable Custom Menu Theme') +"</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            this.mainBox.add(overrideArcMenuHeaderLabel);

            let overrideArcMenuFrame = new PW.FrameBox();
            let overrideArcMenuRow = new PW.FrameBoxRow();
            let overrideArcMenuLabel = new Gtk.Label({
                label: _("Override Menu Theme"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let overrideArcMenuSwitch = new Gtk.Switch({ 
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
            });
            overrideArcMenuSwitch.set_active(this._settings.get_boolean('enable-custom-arc-menu'));
            overrideArcMenuSwitch.connect('notify::active', (widget) => {
                this._settings.set_boolean('enable-custom-arc-menu',widget.get_active());
                this._settings.set_boolean('reload-theme', true);
                if(widget.get_active()){
                    this.mainBox.add(this.menuThemeCustomizationBox);
                    this.menuThemeCustomizationBox.show_all();
                    this.add(this.buttonRow);
                    this.buttonRow.show_all();
                }
                else{
                    this.mainBox.remove(this.menuThemeCustomizationBox);
                    this.remove(this.buttonRow);
                }
                    
                this.mainBox.show_all();
            });

            this.menuThemeCustomizationBox = new OverrideArcMenuThemeWindow(this._settings, this.mainBox, this);
            this.menuThemeCustomizationBox.connect('menu-theme-response', (dialog, response) => {
                if(response === -10) {
                    this._settings.set_string('separator-color', dialog.separatorColor);
                    this._settings.set_boolean('vert-separator', dialog.verticalSeparator);
                    this._settings.set_string('menu-color', dialog.menuColor);
                    this._settings.set_string('menu-foreground-color', dialog.menuForegroundColor);
                    this._settings.set_string('border-color', dialog.borderColor);
                    this._settings.set_string('highlight-color', dialog.highlightColor );
                    this._settings.set_string('highlight-foreground-color', dialog.highlightForegroundColor);
                    this._settings.set_int('menu-font-size', dialog.fontSize);
                    this._settings.set_int('menu-border-size', dialog.borderSize);
                    this._settings.set_int('menu-corner-radius', dialog.cornerRadius);
                    this._settings.set_int('menu-margin', dialog.menuMargin);
                    this._settings.set_int('menu-arrow-size', dialog.menuArrowSize);
                    this._settings.set_boolean('reload-theme', true);
                    this.presetName = dialog.presetName;
                }
                else{
                    this.checkIfPresetMatch();
                }   
            }); 
            
            overrideArcMenuRow.add(overrideArcMenuLabel);
            overrideArcMenuRow.add(overrideArcMenuSwitch);
            overrideArcMenuFrame.add(overrideArcMenuRow);

            this.mainBox.add(overrideArcMenuFrame);
            if(overrideArcMenuSwitch.get_active()){
                this.mainBox.add(this.menuThemeCustomizationBox);
            }
            else
                this.remove(this.buttonRow);
        }

        checkIfPresetMatch(){
            this.presetName = "Custom Theme";
            this.separatorColor = this._settings.get_string('separator-color');
            this.verticalSeparator = this._settings.get_boolean('vert-separator');
            this.menuColor = this._settings.get_string('menu-color');
            this.menuForegroundColor = this._settings.get_string('menu-foreground-color');
            this.borderColor = this._settings.get_string('border-color');
            this.highlightColor = this._settings.get_string('highlight-color');
            this.highlightForegroundColor = this._settings.get_string('highlight-foreground-color');
            this.fontSize = this._settings.get_int('menu-font-size');
            this.borderSize = this._settings.get_int('menu-border-size');
            this.cornerRadius = this._settings.get_int('menu-corner-radius');
            this.menuMargin = this._settings.get_int('menu-margin');
            this.menuArrowSize = this._settings.get_int('menu-arrow-size');
            this.currentSettingsArray = [this.menuColor, this.menuForegroundColor, this.borderColor, this.highlightColor, this.highlightForegroundColor, this.separatorColor, 
                                        this.fontSize.toString(), this.borderSize.toString(), this.cornerRadius.toString(), this.menuArrowSize.toString(), 
                                        this.menuMargin.toString(), this.verticalSeparator.toString()];
            let all_color_themes = this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0; i < all_color_themes.length; i++){
                this.isEqual = true;
                for(let l = 0; l < this.currentSettingsArray.length; l++){
                    if(this.currentSettingsArray[l] !==  all_color_themes[i][l + 1]){
                        this.isEqual=false;
                        break;
                    }
                }
                if(this.isEqual){
                    this.presetName = all_color_themes[i][0];
                    break;
                }      
            }
        }
});
 
var MenuLayoutCategoryPage = GObject.registerClass({
    Signals: {
        'menu-layout-response': { param_types: [GObject.TYPE_INT] },
    },
},  class Arc_Menu_MenuLayoutCategoryPage extends Gtk.ScrolledWindow {
        _init(settings, parent, tile, title) {
            super._init();
            this.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

            this.mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
                spacing: 20,
                vexpand: true,
                valign: Gtk.Align.FILL
            });

            this.add_with_viewport(this.mainBox);
            this.title = title;
            this._parent = parent;
            this._settings = settings;
            this.index = this._settings.get_enum('menu-layout');
            this.layoutStyle = tile.layout;

            this._params = {
                maxColumns: tile.layout.length > 3 ? 3 : tile.layout.length,
                imageHeight: 155,
                imageWidth: 155,
                styles: tile.layout
            };
            let layoutsFrame = new PW.FrameBox();
            let layoutsRow = new PW.FrameBoxRow({
                selectable: false,
                activatable: false,
            })
            layoutsRow._grid.orientation = Gtk.Orientation.VERTICAL;
            layoutsFrame.add(layoutsRow);
            let buttonBox = new Gtk.Box({
                spacing: 10
            });
            let applyButton = new Gtk.Button({
                label: _("Apply"),
                hexpand: false,
                halign: Gtk.Align.END
            });
            applyButton.connect('clicked', ()=> {
                let selectedBox = this._tileGrid.get_selected_children();
                this.index = selectedBox[0].get_child().layout;
                this._tileGrid.unselect_all();
                applyButton.set_sensitive(false);
                this.emit('menu-layout-response', -10);
            });
            let backButton = new PW.Button({
                icon_name: 'go-previous-symbolic',
                title: _("Back"),
                icon_first: true,
                halign: Gtk.Align.START
            });
            backButton.connect('clicked', ()=> {
                this.emit('menu-layout-response', -20);
            });
            buttonBox.add(backButton);
            let chooseNewLayoutLabel = new Gtk.Label({
                label: "<b>" +  _("%s Menu Layouts", this.title).format(this.title) + "</b>",
                use_markup: true,
                halign: Gtk.Align.CENTER,
                hexpand: true
            });
            buttonBox.add(chooseNewLayoutLabel);
            buttonBox.add(applyButton);
            applyButton.set_sensitive(false);

            this.mainBox.add(buttonBox);
            this.mainBox.add(layoutsFrame);
            this._tileGrid = new PW.TileGrid(this._params.maxColumns);

            this._params.styles.forEach((style) => {
                this._addTile(style.TITLE, style.IMAGE, style.LAYOUT);
            });

            layoutsRow.add(this._tileGrid);

            this._tileGrid.connect('selected-children-changed', () => {
                applyButton.set_sensitive(true);
            });

            this._tileGrid.set_selection_mode(Gtk.SelectionMode.NONE);
        }


        enableSelectionMode(){
            this._tileGrid.set_selection_mode(Gtk.SelectionMode.SINGLE);
        }

        _addTile(name, image, layout) {
            let tile = new PW.Tile(name, image, this._params.imageWidth, this._params.imageHeight, layout);
            this._tileGrid.insert(tile, -1);
        }
});

var MenuSettingsGeneralPage = GObject.registerClass(
    class Arc_Menu_MenuSettingsGeneralPage extends Gtk.Box {
    _init(settings) {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
        });

        this.scrollBox = new Gtk.ScrolledWindow();
        this.scrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
            spacing: 20,
            vexpand: true,
            valign: Gtk.Align.FILL
        });

        this.scrollBox.add_with_viewport(this.mainBox);
        this.add(this.scrollBox);
        this._settings = settings;
        this.heightValue = this._settings.get_int('menu-height');
        this.rightPanelWidth = this._settings.get_int('right-panel-width');
        this.menuWidth = this._settings.get_int('menu-width');
        this.forcedMenuLocation = this._settings.get_enum('force-menu-location');
        this.separatorColor = this._settings.get_string('separator-color');
        this.verticalSeparator = this._settings.get_boolean('vert-separator');
        this.largeIcons = this._settings.get_boolean('enable-large-icons');
        this.subMenus = this._settings.get_boolean('enable-sub-menus');
        this.disableRecentApps = this._settings.get_boolean('disable-recently-installed-apps');
        this.disableTooltips = this._settings.get_boolean('disable-tooltips');

        let generalSettingsFrame = new PW.FrameBox();
        //find the greatest screen height of all monitors
        //use that value to set Menu Height cap
        let display = Gdk.Display.get_default(); 
        let nMonitors = display.get_n_monitors();
        let greatestHeight = 0;
        let scaleFactor = 1;
        for (let i = 0; i < nMonitors; i++) {
            let monitor = display.get_monitor(i);
            let monitorHeight = monitor.get_workarea().height;
            if(monitorHeight > greatestHeight){
                scaleFactor = monitor.get_scale_factor();
                greatestHeight = monitorHeight;
            }
        }
        let monitorHeight = greatestHeight * scaleFactor;
        monitorHeight = Math.round((monitorHeight * 8) / 10);

        let heightRow = new PW.FrameBoxRow();
        let heightLabel = new Gtk.Label({
            label: _('Menu Height'),
            use_markup: true,
            xalign: 0,
            hexpand: false,
            selectable: false
        });
        let hscale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 300,
                upper: monitorHeight,
                step_increment: 10,
                page_increment: 10,
                page_size: 0
            }),
            digits: 0,
            round_digits: 0,
            hexpand: true,
            value_pos: Gtk.PositionType.RIGHT
        });
        hscale.set_value(this.heightValue);
        hscale.connect('value-changed', () => {
            this.heightValue = hscale.get_value();
            if(hSpinButton.value !== this.heightValue)
                hSpinButton.set_value(this.heightValue);
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });

        let hSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 300, upper: monitorHeight, step_increment: 1, page_increment: 1, page_size: 0,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
        });
        hSpinButton.set_value(this.heightValue);
        hSpinButton.connect('value-changed', () => {
            this.heightValue = hSpinButton.get_value();
            if(hscale.value !== this.heightValue)
                hscale.set_value(this.heightValue);
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });

        heightRow.add(heightLabel);
        heightRow.add(hscale);
        heightRow.add(hSpinButton);
        generalSettingsFrame.add(heightRow);

        let menuWidthRow = new PW.FrameBoxRow();
        let menuWidthLabel = new Gtk.Label({
            label: _('Left-Panel Width'),
            xalign:0,
            hexpand: false,
        });   
        let menuWidthScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 175, upper: 500, step_increment: 1, page_increment: 1, page_size: 0,
            }),
            digits: 0,round_digits: 0,hexpand: true,
            value_pos: Gtk.PositionType.RIGHT
        });
        menuWidthScale.set_value(this.menuWidth);
        menuWidthScale.connect('value-changed', () => {
            this.menuWidth = menuWidthScale.get_value();
            if(menuWidthSpinButton.value !== this.menuWidth)
                menuWidthSpinButton.set_value(this.menuWidth);
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });

        let menuWidthSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 175, upper: 500, step_increment: 1, page_increment: 1, page_size: 0,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
        });
        menuWidthSpinButton.set_value(this.menuWidth);
        menuWidthSpinButton.connect('value-changed', () => {
            this.menuWidth = menuWidthSpinButton.get_value();
            if(menuWidthScale.value !== this.menuWidth)
                menuWidthScale.set_value(this.menuWidth);
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });

        menuWidthRow.add(menuWidthLabel);
        menuWidthRow.add(menuWidthScale);
        menuWidthRow.add( menuWidthSpinButton);
        generalSettingsFrame.add(menuWidthRow);

        let rightPanelWidthRow = new PW.FrameBoxRow();
        let rightPanelWidthLabel = new Gtk.Label({
            label: _('Right-Panel Width'),
            xalign:0,
            hexpand: false,
        });   
        let rightPanelWidthScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 200,upper: 500, step_increment: 1, page_increment: 1, page_size: 0,
            }),
            digits: 0,round_digits: 0,hexpand: true,
            value_pos: Gtk.PositionType.RIGHT
        });
        rightPanelWidthScale.set_value(this.rightPanelWidth);
        rightPanelWidthScale.connect('value-changed', () => {
            this.rightPanelWidth = rightPanelWidthScale.get_value();
            if(rightPanelWidthSpinButton.value !== this.rightPanelWidth)
                rightPanelWidthSpinButton.set_value(this.rightPanelWidth);
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });

        let rightPanelWidthSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 200,upper: 500, step_increment: 1, page_increment: 1, page_size: 0,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
        });
        rightPanelWidthSpinButton.set_value(this.rightPanelWidth);
        rightPanelWidthSpinButton.connect('value-changed', () => {
            this.rightPanelWidth = rightPanelWidthSpinButton.get_value();
            if(rightPanelWidthScale.value !== this.rightPanelWidth)
                rightPanelWidthScale.set_value(this.rightPanelWidth);
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });
        
        rightPanelWidthRow.add(rightPanelWidthLabel);
        rightPanelWidthRow.add(rightPanelWidthScale);
        rightPanelWidthRow.add(rightPanelWidthSpinButton);
        generalSettingsFrame.add(rightPanelWidthRow);
        this.mainBox.add(generalSettingsFrame);

        let menuLocationFrame = new PW.FrameBox();
        let menuLocationRow = new PW.FrameBoxRow();
        let menuLocationLabel = new Gtk.Label({
            label: _('Override Menu Location'),
            use_markup: true,
            xalign: 0,
            hexpand: true,
            selectable: false
         });   
        let menuLocationCombo = new Gtk.ComboBoxText({ 
            halign: Gtk.Align.END,
        });
        menuLocationCombo.append_text(_("Off"));
        menuLocationCombo.append_text(_("Top Centered"));
        menuLocationCombo.append_text(_("Bottom Centered"));
        menuLocationCombo.set_active(this._settings.get_enum('force-menu-location'));
        menuLocationCombo.connect('changed', (widget) => {
            this.forcedMenuLocation = widget.get_active();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });
        menuLocationRow.add(menuLocationLabel);
        menuLocationRow.add(menuLocationCombo);
        menuLocationFrame.add(menuLocationRow);
        this.mainBox.add(menuLocationFrame);

        let miscSettingsFrame = new PW.FrameBox();
        let largeIconsRow = new PW.FrameBoxRow();
        let largeIconsLabel = new Gtk.Label({
            label: _('Large Application Icons'),
            use_markup: true,
            xalign: 0,
            hexpand: true,
            selectable: false
         });   
        let largeIconsSwitch = new Gtk.Switch({ 
            halign: Gtk.Align.END,
        });
        largeIconsSwitch.set_active(this.largeIcons);
        largeIconsSwitch.connect('notify::active', (widget) => {
             this.largeIcons = widget.get_active();
             this.saveButton.set_sensitive(true);
             this.resetButton.set_sensitive(true);
        });
        largeIconsRow.add(largeIconsLabel);            
        largeIconsRow.add(largeIconsSwitch);             
        miscSettingsFrame.add(largeIconsRow);

        let subMenusRow = new PW.FrameBoxRow();
        let subMenusLabel = new Gtk.Label({
            label: _('Category Sub Menus'),
            use_markup: true,
            xalign: 0,
            hexpand: true,
            selectable: false
         });   
        let subMenusSwitch = new Gtk.Switch({ 
            halign: Gtk.Align.END,
        });
        subMenusSwitch.set_active(this.subMenus);
        subMenusSwitch.connect('notify::active', (widget) => {
            this.subMenus = widget.get_active();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });
        subMenusRow.add(subMenusLabel);            
        subMenusRow.add(subMenusSwitch);  
        miscSettingsFrame.add(subMenusRow); 
        this.mainBox.add(miscSettingsFrame); 

        let tooltipFrame = new PW.FrameBox();
        let tooltipRow = new PW.FrameBoxRow();
        let tooltipLabel = new Gtk.Label({
            label: _("Disable Tooltips"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });

        let tooltipSwitch = new Gtk.Switch({ 
            halign: Gtk.Align.END,
        });
        tooltipSwitch.set_active(this.disableTooltips);
        tooltipSwitch.connect('notify::active', (widget) => {
            this.disableTooltips = widget.get_active();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });

        tooltipRow.add(tooltipLabel);
        tooltipRow.add(tooltipSwitch);
        tooltipFrame.add(tooltipRow);
        this.mainBox.add(tooltipFrame);

        let separatorFrame = new PW.FrameBox();
        let vertSeparatorRow = new PW.FrameBoxRow();
        let vertSeparatorLabel = new Gtk.Label({
            label: _('Enable Vertical Separator'),
            use_markup: true,
            xalign: 0,
            hexpand: true,
            selectable: false
         });   
        let vertSeparatorSwitch = new Gtk.Switch({ 
            halign: Gtk.Align.END,
        });
        vertSeparatorSwitch.set_active(this.verticalSeparator);
        vertSeparatorSwitch.connect('notify::active', (widget) => { 
             this.verticalSeparator = widget.get_active();
             this.saveButton.set_sensitive(true);
             this.resetButton.set_sensitive(true);
        });
        vertSeparatorRow.add(vertSeparatorLabel);            
        vertSeparatorRow.add(vertSeparatorSwitch);             
        separatorFrame.add(vertSeparatorRow);
        
        let separatorColorRow = new PW.FrameBoxRow();
        let separatorColorLabel = new Gtk.Label({
            label: _('Separator Color'),
            use_markup: true,
            xalign: 0,
            hexpand: true,
            selectable: false
        });
        let colorChooser = new Gtk.ColorButton({
            use_alpha:true,
        });     
        let color = new Gdk.RGBA();
        color.parse(this.separatorColor);
        colorChooser.set_rgba(color);    
        colorChooser.connect('color-set', ()=>{
            this.separatorColor = colorChooser.get_rgba().to_string();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });
        separatorColorRow.add(separatorColorLabel);            
        separatorColorRow.add(colorChooser);             
        separatorFrame.add(separatorColorRow);
        this.mainBox.add(separatorFrame);

        let recentAppsFrame = new PW.FrameBox();
        let recentAppsRow = new PW.FrameBoxRow();
        let recentAppsLabel = new Gtk.Label({
            label: _("Disable Recently Installed Apps Indicator"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });

        let recentAppsSwitch = new Gtk.Switch({ 
            halign: Gtk.Align.END,
        });
        recentAppsSwitch.set_active(this._settings.get_boolean('disable-recently-installed-apps'));
        recentAppsSwitch.connect('notify::active', (widget) => {
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
            this.disableRecentApps = widget.get_active();
            this._settings.set_boolean('disable-recently-installed-apps', widget.get_active());
        });
        recentAppsRow.add(recentAppsLabel);
        recentAppsRow.add(recentAppsSwitch);
        recentAppsFrame.add(recentAppsRow);

        let clearRecentAppsRow = new PW.FrameBoxRow();
        let clearRecentAppsLabel = new Gtk.Label({
            label: _('Clear all Applications Marked "New"'),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });

        let clearRecentAppsButton = new Gtk.Button({ 
            halign: Gtk.Align.END,
            label: _("Clear All"),
        });
        let sensitive = this._settings.get_strv('recently-installed-apps').length > 0;
        clearRecentAppsButton.set_sensitive(sensitive);
        clearRecentAppsButton.connect('clicked', (widget) => {
            clearRecentAppsButton.set_sensitive(false);
            this._settings.reset('recently-installed-apps');
        });
        clearRecentAppsRow.add(clearRecentAppsLabel);
        clearRecentAppsRow.add(clearRecentAppsButton);
        recentAppsFrame.add(clearRecentAppsRow);

        this.mainBox.add(recentAppsFrame);

        let buttonRow = new Gtk.Box({
            valign: Gtk.Align.END,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 24,
            margin_end: 24,
        });
        this.resetButton = new Gtk.Button({
            label: _("Restore Defaults"),
        });
        this.resetButton.set_sensitive(this.checkIfResetButtonSensitive());
        this.resetButton.connect('clicked', ()=> {
            this.heightValue = this._settings.get_default_value('menu-height').unpack();
            this.rightPanelWidth = this._settings.get_default_value('right-panel-width').unpack();
            this.menuWidth = this._settings.get_default_value('menu-width').unpack();
            this.separatorColor = this._settings.get_default_value('separator-color').unpack();
            this.verticalSeparator = this._settings.get_default_value('vert-separator').unpack();
            this.largeIcons = this._settings.get_default_value('enable-large-icons').unpack();
            this.subMenus = this._settings.get_default_value('enable-sub-menus').unpack();
            this.disableRecentApps = this._settings.get_default_value('disable-recently-installed-apps').unpack();
            this.disableTooltips = this._settings.get_default_value('disable-tooltips').unpack();
            this.forcedMenuLocation = this._settings.get_default_value('force-menu-location').unpack();
            hscale.set_value(this.heightValue);
            menuWidthScale.set_value(this.menuWidth);
            rightPanelWidthScale.set_value(this.rightPanelWidth);
            menuLocationCombo.set_active(this.forcedMenuLocation);
            subMenusSwitch.set_active(this.subMenus);
            vertSeparatorSwitch.set_active(this.verticalSeparator);
            largeIconsSwitch.set_active(this.largeIcons);
            tooltipSwitch.set_active(this.disableTooltips);
            color = new Gdk.RGBA();
            color.parse(this.separatorColor);
            colorChooser.set_rgba(color);   
            recentAppsSwitch.set_active(this.disableRecentApps);
   
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(false);
        });

        this.saveButton = new Gtk.Button({
            label: _("Apply"),
            hexpand: true
        });
        this.saveButton.connect('clicked', ()=> {
            this._settings.set_int('menu-height', this.heightValue);
            this._settings.set_int('right-panel-width', this.rightPanelWidth);
            this._settings.set_int('menu-width', this.menuWidth);
            this._settings.set_enum('force-menu-location', this.forcedMenuLocation);
            this._settings.set_string('separator-color', this.separatorColor);
            this._settings.set_boolean('vert-separator', this.verticalSeparator);
            this._settings.set_boolean('enable-large-icons', this.largeIcons);
            this._settings.set_boolean('enable-sub-menus', this.subMenus);
            this._settings.set_boolean('disable-recently-installed-apps', this.disableRecentApps);
            this._settings.set_boolean('disable-tooltips', this.disableTooltips);
            this._settings.set_boolean('reload-theme', true);
            this.saveButton.set_sensitive(false);
            this.resetButton.set_sensitive(this.checkIfResetButtonSensitive());
        }); 
        this.saveButton.set_halign(Gtk.Align.END);
        this.saveButton.set_sensitive(false);

        buttonRow.add(this.resetButton);
        buttonRow.add(this.saveButton);
        this.add(buttonRow);
    }

    checkIfResetButtonSensitive(){
        return (this.disableTooltips !== this._settings.get_default_value('disable-tooltips').unpack() ||
            this.disableRecentApps !== this._settings.get_default_value('disable-recently-installed-apps').unpack() ||
            this.heightValue !== this._settings.get_default_value('menu-height').unpack() ||
            this.rightPanelWidth !== this._settings.get_default_value('right-panel-width').unpack() ||
            this.forcedMenuLocation !== this._settings.get_default_value('force-menu-location').unpack() ||
            this.menuWidth !== this._settings.get_default_value('menu-width').unpack() ||
            this.separatorColor !== this._settings.get_default_value('separator-color').unpack() ||
            this.verticalSeparator !== this._settings.get_default_value('vert-separator').unpack() ||
            this.largeIcons !== this._settings.get_default_value('enable-large-icons').unpack() ||
            this.subMenus !== this._settings.get_default_value('enable-sub-menus').unpack()) ? true : false
    }
});

var MenuSettingsFineTunePage = GObject.registerClass(
    class Arc_Menu_MenuSettingsFineTunePage extends Gtk.Box {
    _init(settings) {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
        });

        this.scrollBox = new Gtk.ScrolledWindow();
        this.scrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

        this.mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
            spacing: 20,
            vexpand: true,
            valign: Gtk.Align.FILL
        });

        this.scrollBox.add_with_viewport(this.mainBox);
        this.add(this.scrollBox);
        this._settings = settings;
        this.disableFadeEffect = this._settings.get_boolean('disable-scrollview-fade-effect');
        this.indicatorColor = this._settings.get_string('indicator-color');
        this.indicatorTextColor = this._settings.get_string('indicator-text-color');
        this.gapAdjustment = this._settings.get_int('gap-adjustment');
        this.disableCategoryArrow = this._settings.get_boolean('disable-category-arrows');
        this.removeMenuArrow = this._settings.get_boolean('remove-menu-arrow');
        this.disableSearchStyle = this._settings.get_boolean('disable-searchbox-border');
        this.alphabetizeAllPrograms = this._settings.get_boolean('alphabetize-all-programs')
        this.multiLinedLabels = this._settings.get_boolean('multi-lined-labels');
        this.searchResultsDetails = this._settings.get_boolean('show-search-result-details');

        let disableCategoryArrowFrame = new PW.FrameBox();
        let disableCategoryArrowRow = new PW.FrameBoxRow();
        let disableCategoryArrowLabel = new Gtk.Label({
            label: _('Disable Category Arrows'),
            use_markup: true,
            xalign: 0,
            hexpand: true,
            selectable: false
         });   
        let disableCategoryArrowSwitch = new Gtk.Switch({ 
            halign: Gtk.Align.END,
        });
        disableCategoryArrowSwitch.set_active(this.disableCategoryArrow);
        disableCategoryArrowSwitch.connect('notify::active', (widget) => {
             this.disableCategoryArrow = widget.get_active();
             this.saveButton.set_sensitive(true);
             this.resetButton.set_sensitive(true);
        });
        disableCategoryArrowRow.add(disableCategoryArrowLabel);            
        disableCategoryArrowRow.add(disableCategoryArrowSwitch);  
        disableCategoryArrowFrame.add(disableCategoryArrowRow);  
        this.mainBox.add(disableCategoryArrowFrame);

        let searchStyleFrame = new PW.FrameBox();
        let searchStyleRow = new PW.FrameBoxRow();
        let searchStyleLabel = new Gtk.Label({
            label: _("Disable Searchbox Border"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });

        let searchStyleSwitch = new Gtk.Switch({ 
            halign: Gtk.Align.END,
        });
        searchStyleSwitch.set_active(this._settings.get_boolean('disable-searchbox-border'));
        searchStyleSwitch.connect('notify::active', (widget) => {
            this.disableSearchStyle = widget.get_active();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });
        searchStyleRow.add(searchStyleLabel);
        searchStyleRow.add(searchStyleSwitch);
        searchStyleFrame.add(searchStyleRow);
        this.mainBox.add(searchStyleFrame);
        
        let tweakStyleFrame = new PW.FrameBox();
        let tweakStyleRow = new PW.FrameBoxRow();
        let tweakStyleLabel = new Gtk.Label({
            label: _("Disable Menu Arrow"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });

        let tweakStyleSwitch = new Gtk.Switch({ 
            halign: Gtk.Align.END,
        });
        tweakStyleSwitch.set_active(this._settings.get_boolean('remove-menu-arrow'));
        tweakStyleSwitch.connect('notify::active', (widget) => {
            this.removeMenuArrow = widget.get_active();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });
        tweakStyleRow.add(tweakStyleLabel);
        tweakStyleRow.add(tweakStyleSwitch);
        tweakStyleFrame.add(tweakStyleRow);
        this.mainBox.add(tweakStyleFrame);

        let fadeEffectFrame = new PW.FrameBox();
        let fadeEffectRow = new PW.FrameBoxRow();
        let fadeEffectLabel = new Gtk.Label({
            label: _("Disable ScrollView Fade Effects"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });

        let fadeEffectSwitch = new Gtk.Switch({ 
            halign: Gtk.Align.END,
        });
        fadeEffectSwitch.set_active(this._settings.get_boolean('disable-scrollview-fade-effect'));
        fadeEffectSwitch.connect('notify::active', (widget) => {
            this.disableFadeEffect = widget.get_active();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });
        fadeEffectRow.add(fadeEffectLabel);
        fadeEffectRow.add(fadeEffectSwitch);
        fadeEffectFrame.add(fadeEffectRow);
        this.mainBox.add(fadeEffectFrame);

        let descriptionsFrame = new PW.FrameBox();
        let descriptionsRow = new PW.FrameBoxRow();
        let descriptionsLabel = new Gtk.Label({
            label: _("Search Results - Show Descriptions"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let descriptionsSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        descriptionsSwitch.set_active(this.searchResultsDetails);
        descriptionsSwitch.connect('notify::active', (widget) => {
            this.searchResultsDetails = widget.get_active();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });
        descriptionsRow.add(descriptionsLabel);
        descriptionsRow.add(descriptionsSwitch);
        descriptionsFrame.add(descriptionsRow);
        this.mainBox.add(descriptionsFrame);

        let alphabetizeAllProgramsFrame = new PW.FrameBox();
        let alphabetizeAllProgramsRow = new PW.FrameBoxRow();
        let alphabetizeAllProgramsLabel = new Gtk.Label({
            label: _("Alphabetize 'All Programs' Category"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let alphabetizeAllProgramsSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        alphabetizeAllProgramsSwitch.set_active(this._settings.get_boolean('alphabetize-all-programs'));
        alphabetizeAllProgramsSwitch.connect('notify::active', (widget) => {
            this.alphabetizeAllPrograms = widget.get_active();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });
        alphabetizeAllProgramsRow.add(alphabetizeAllProgramsLabel);
        alphabetizeAllProgramsRow.add(alphabetizeAllProgramsSwitch);
        alphabetizeAllProgramsFrame.add(alphabetizeAllProgramsRow);
        this.mainBox.add(alphabetizeAllProgramsFrame);

        let multiLinedLabelFrame = new PW.FrameBox();
        let multiLinedLabelRow = new PW.FrameBoxRow();
        let multiLinedLabelLabel = new Gtk.Label({
            label: _("Multi-Lined Labels"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let multiLinedLabelSwitch = new Gtk.Switch({ halign: Gtk.Align.END, vexpand: false, valign: Gtk.Align.CENTER });
        multiLinedLabelSwitch.set_active(this._settings.get_boolean('multi-lined-labels'));
        multiLinedLabelSwitch.connect('notify::active', (widget) => {
            this.multiLinedLabels = widget.get_active();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });
        let multiLinedLabelInfoButton = new PW.Button({
                icon_name: 'info-circle-symbolic'
            });
        multiLinedLabelInfoButton.connect('clicked', ()=> {
            let dialog = new PW.MessageDialog({
                text: _("Multi-Lined Labels"),
                secondaryText: _('Enable/Disable multi-lined labels on large application icon layouts.'),
                buttons: Gtk.ButtonsType.OK,
                transient_for: this.get_toplevel()
            });
            dialog.connect ('response', ()=> dialog.destroy());
            dialog.show_all();
        });
        multiLinedLabelRow.add(multiLinedLabelLabel);
        multiLinedLabelRow.add(multiLinedLabelSwitch);
        multiLinedLabelRow.add(multiLinedLabelInfoButton);
        multiLinedLabelFrame.add(multiLinedLabelRow);
        this.mainBox.add(multiLinedLabelFrame);

        let appIndicatorColorFrame = new PW.FrameBox();
        let recentlyInstalledInfoRow = new PW.FrameBoxRow();
        let recentlyInstalledInfoLabel = new Gtk.Label({
            label: _('Recently Installed Application Indicators'),
            use_markup: true,
            xalign: 0,
            hexpand: true,
            selectable: false,
            sensitive: false
        });
        recentlyInstalledInfoRow.add(recentlyInstalledInfoLabel);
        appIndicatorColorFrame.add(recentlyInstalledInfoRow);
        let appIndicatorColorRow = new PW.FrameBoxRow();
        let appIndicatorColorLabel = new Gtk.Label({
            label: _('Category Indicator Color'),
            use_markup: true,
            xalign: 0,
            hexpand: true,
            selectable: false
        });
        let appIndicatorColorChooser = new Gtk.ColorButton({
            use_alpha: true,
        });     
        let color = new Gdk.RGBA();
        color.parse(this.indicatorColor);
        appIndicatorColorChooser.set_rgba(color);    
        appIndicatorColorChooser.connect('color-set', ()=>{
            this.indicatorColor = appIndicatorColorChooser.get_rgba().to_string();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });
        appIndicatorColorRow.add(appIndicatorColorLabel);            
        appIndicatorColorRow.add(appIndicatorColorChooser);             
        appIndicatorColorFrame.add(appIndicatorColorRow);

        let appIndicatorTextColorRow = new PW.FrameBoxRow();
        let appIndicatorTextColorLabel = new Gtk.Label({
            label: _('Application Indicator Label Color'),
            use_markup: true,
            xalign: 0,
            hexpand: true,
            selectable: false
        });
        let appIndicatorTextColorChooser = new Gtk.ColorButton({
            use_alpha: true,
        });     
        color = new Gdk.RGBA();
        color.parse(this.indicatorTextColor);
        appIndicatorTextColorChooser.set_rgba(color);    
        appIndicatorTextColorChooser.connect('color-set', ()=>{
            this.indicatorTextColor = appIndicatorTextColorChooser.get_rgba().to_string();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });
        appIndicatorTextColorRow.add(appIndicatorTextColorLabel);            
        appIndicatorTextColorRow.add(appIndicatorTextColorChooser);             
        appIndicatorColorFrame.add(appIndicatorTextColorRow);
        this.mainBox.add(appIndicatorColorFrame);

        let gapAdjustmentFrame = new PW.FrameBox();
        let gapAdjustmentRow = new PW.FrameBoxRow();
        let gapAdjustmentLabel = new Gtk.Label({
            label: _('Gap Adjustment'),
            xalign:0,
            hexpand: false,
        });
        let gapAdjustmentScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: -1, upper: 1, step_increment: 1, page_increment: 1, page_size: 0
            }),
            digits: 0,round_digits: 0,hexpand: true,
            value_pos: Gtk.PositionType.RIGHT,
            draw_value: true,
        });
        gapAdjustmentScale.connect('format-value', (scale, value) => { return value.toString() + ' px'; });
        gapAdjustmentScale.set_value(this.gapAdjustment);
        gapAdjustmentScale.connect('value-changed', () => {
            this.gapAdjustment = gapAdjustmentScale.get_value();
            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(true);
        });

        let gapAdjustmentInfoButton = new PW.Button({
                icon_name: 'info-circle-symbolic'
            });
        gapAdjustmentInfoButton.connect('clicked', ()=> {
            let dialog = new PW.MessageDialog({
                text: _("Offset ArcMenu by 1px"),
                secondaryText: _('Useful if you notice a 1px gap or overlap between ArcMenu and the panel'),
                buttons: Gtk.ButtonsType.OK,
                transient_for: this.get_toplevel()
            });
            dialog.connect ('response', ()=> dialog.destroy());
            dialog.show_all();
        });
        gapAdjustmentRow.add(gapAdjustmentLabel);
        gapAdjustmentRow.add(gapAdjustmentScale);
        gapAdjustmentRow.add(gapAdjustmentInfoButton);
        gapAdjustmentFrame.add(gapAdjustmentRow);
        this.mainBox.add(gapAdjustmentFrame);

        let buttonRow = new Gtk.Box({
            valign: Gtk.Align.END,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 24,
            margin_end: 24,
        });
        this.resetButton = new Gtk.Button({
            label: _("Restore Defaults"),
        });
        this.resetButton.set_sensitive(this.checkIfResetButtonSensitive());
        this.resetButton.connect('clicked', ()=> {
            this.indicatorColor = this._settings.get_default_value('indicator-color').unpack();
            this.indicatorTextColor = this._settings.get_default_value('indicator-text-color').unpack();
            this.gapAdjustment = this._settings.get_default_value('gap-adjustment').unpack();
            this.disableCategoryArrow = this._settings.get_default_value('disable-category-arrows').unpack();
            this.removeMenuArrow = this._settings.get_default_value('remove-menu-arrow').unpack();
            this.disableSearchStyle = this._settings.get_default_value('disable-searchbox-border').unpack();
            this.alphabetizeAllPrograms = this._settings.get_default_value('alphabetize-all-programs').unpack();
            this.multiLinedLabels = this._settings.get_default_value('multi-lined-labels').unpack();
            this.searchResultsDetails = this._settings.get_default_value('show-search-result-details').unpack();
            this.disableFadeEffect = this._settings.get_default_value('disable-scrollview-fade-effect').unpack();
            alphabetizeAllProgramsSwitch.set_active(this.alphabetizeAllPrograms);
            gapAdjustmentScale.set_value(this.gapAdjustment);
            disableCategoryArrowSwitch.set_active(this.disableCategoryArrow);
            searchStyleSwitch.set_active(this.disableSearchStyle); 
            tweakStyleSwitch.set_active(this.removeMenuArrow);
            multiLinedLabelSwitch.set_active(this.multiLinedLabels);
            descriptionsSwitch.set_active(this.searchResultsDetails);
            let color = new Gdk.RGBA();
            color.parse(this.indicatorColor);
            appIndicatorColorChooser.set_rgba(color);
            color.parse(this.indicatorTextColor);
            appIndicatorTextColorChooser.set_rgba(color);
            fadeEffectSwitch.set_active(this.disableFadeEffect);

            this.saveButton.set_sensitive(true);
            this.resetButton.set_sensitive(false);
        });

        this.saveButton = new Gtk.Button({
            label: _("Apply"),
            hexpand: true
        });
        this.saveButton.connect('clicked', ()=> {
            this._settings.set_string('indicator-color', this.indicatorColor);
            this._settings.set_string('indicator-text-color', this.indicatorTextColor);
            this._settings.set_int('gap-adjustment', this.gapAdjustment);
            this._settings.set_boolean('disable-category-arrows', this.disableCategoryArrow);
            this._settings.set_boolean('remove-menu-arrow', this.removeMenuArrow);
            this._settings.set_boolean('disable-searchbox-border', this.disableSearchStyle);
            this._settings.set_boolean('alphabetize-all-programs', this.alphabetizeAllPrograms);
            this._settings.set_boolean('multi-lined-labels', this.multiLinedLabels);
            this._settings.set_boolean('show-search-result-details', this.searchResultsDetails);
            this._settings.set_boolean('disable-scrollview-fade-effect', this.disableFadeEffect);
            this._settings.set_boolean('reload-theme', true);
            this.saveButton.set_sensitive(false);
            this.resetButton.set_sensitive(this.checkIfResetButtonSensitive());
        }); 
        this.saveButton.set_halign(Gtk.Align.END);
        this.saveButton.set_sensitive(false);

        buttonRow.add(this.resetButton);
        buttonRow.add(this.saveButton);
        this.add(buttonRow);
    }

    checkIfResetButtonSensitive(){
        return (
            this.indicatorColor !== this._settings.get_default_value('indicator-color').unpack() ||
            this.indicatorTextColor !== this._settings.get_default_value('indicator-text-color').unpack() ||
            this.gapAdjustment !== this._settings.get_default_value('gap-adjustment').unpack() ||
            this.disableCategoryArrow !== this._settings.get_default_value('disable-category-arrows').unpack() ||
            this.removeMenuArrow !== this._settings.get_default_value('remove-menu-arrow').unpack() ||
            this.disableSearchStyle !== this._settings.get_default_value('disable-searchbox-border').unpack()||
            this.alphabetizeAllPrograms !== this._settings.get_default_value('alphabetize-all-programs').unpack()||
            this.multiLinedLabels !== this._settings.get_default_value('multi-lined-labels').unpack() ||
            this.searchResultsDetails !== this._settings.get_default_value('show-search-result-details').unpack()) ||
            this.disableFadeEffect !== this._settings.get_default_value('disable-scrollview-fade-effect').unpack() ? true : false;
    }
});

var MenuSettingsCategoriesPage = GObject.registerClass(
    class Arc_Menu_MenuSettingsCategoriesPage extends Gtk.Box {
    _init(settings) {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
        });

        this.scrollBox = new Gtk.ScrolledWindow();
        this.scrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

        this.mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
            spacing: 20,
            vexpand: true,
            valign: Gtk.Align.FILL
        });

        this.scrollBox.add_with_viewport(this.mainBox);
        this.add(this.scrollBox);
        this._settings = settings;
        this.categoriesFrame = new PW.FrameBox();

        this.resetButton = new Gtk.Button({
            label: _("Restore Defaults"),
        });
        this.saveButton = new Gtk.Button({
            label: _("Apply"),
            hexpand: true
        });

        this._createFrame(this._settings.get_value("extra-categories").deep_unpack());
        this.mainBox.add(this.categoriesFrame);

        let buttonRow = new Gtk.Box({
            valign: Gtk.Align.END,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 24,
            margin_end: 24,
        });

        this.resetButton.set_sensitive(this.getSensitive());

        this.resetButton.connect('clicked', ()=> {
            this.saveButton.set_sensitive(true);
            this.categoriesFrame.remove_all_children();
            this._createFrame(this._settings.get_default_value('extra-categories').deep_unpack());
            this.categoriesFrame.show_all();
            this.resetButton.set_sensitive(false);
        });

        this.saveButton.connect('clicked', ()=> {
            let array = [];
            for(let i = 0; i < this.categoriesFrame.count; i++) {
                let frame = this.categoriesFrame.get_index(i);
                array.push([frame._enum, frame._shouldShow]);
            }
            this._settings.set_value('extra-categories', new GLib.Variant('a(ib)', array));
            this.saveButton.set_sensitive(false);
            this.resetButton.set_sensitive(this.getSensitive());
        }); 
        this.saveButton.set_halign(Gtk.Align.END);
        this.saveButton.set_sensitive(false);
        buttonRow.add(this.resetButton);
        buttonRow.add(this.saveButton);
        this.add(buttonRow);
    }

    getSensitive(){
        let defaultExtraCategories = this._settings.get_default_value("extra-categories").deep_unpack();
        let currentExtraCategories = this._settings.get_value("extra-categories").deep_unpack();
        return !Utils.getArraysEqual(defaultExtraCategories, currentExtraCategories);
    }

    _createFrame(extraCategories){
        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let name = Constants.Categories[categoryEnum].NAME;

            let frameRow = new PW.FrameBoxDragRow(this);
            frameRow._enum = extraCategories[i][0];
            frameRow._shouldShow = extraCategories[i][1]; 
            frameRow._name = Constants.Categories[categoryEnum].NAME; 
            frameRow._gicon = Gio.icon_new_for_string(Constants.Categories[categoryEnum].ICON);
            frameRow.saveButton = this.saveButton;
            frameRow.resetButton = this.resetButton;
            frameRow.hasSwitch = true;
            frameRow.switchActive = frameRow._shouldShow;
            
            let applicationIcon = new Gtk.Image( {
                gicon: frameRow._gicon,
                pixel_size: 22
            });
            let applicationImageBox = new Gtk.Box( {
                margin_start: 0,
                hexpand: false,
                vexpand: false,
                spacing: 5,
            });
            let dragImage = new Gtk.Image( {
                gicon: Gio.icon_new_for_string("drag-symbolic"),
                pixel_size: 12
            });
            applicationImageBox.add(dragImage);
            applicationImageBox.add(applicationIcon);
            frameRow.add(applicationImageBox);

            let softwareShortcutsLabel = new Gtk.Label({
                label: _(name),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let buttonBox = new PW.EditEntriesBox({
                frameRow: frameRow, 
                frame: this.categoriesFrame, 
                buttons: [this.saveButton, this.resetButton],
            });
         
            let modifyButton = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
                margin_start: 10,
            });
            
            modifyButton.set_active(frameRow._shouldShow);
            modifyButton.connect('notify::active', ()=> {
                frameRow._shouldShow = modifyButton.get_active(); 
                this.saveButton.set_sensitive(true);
                this.resetButton.set_sensitive(true);
            });
            buttonBox.insert_column(0);
            buttonBox.attach(Gtk.Separator.new(Gtk.Orientation.VERTICAL), 0, 0, 1, 1);
            buttonBox.insert_column(0);
            buttonBox.attach(modifyButton, 0, 0, 1, 1);
            
            frameRow.add(softwareShortcutsLabel);
            frameRow.add(buttonBox);
            this.categoriesFrame.add(frameRow);
        }
    }
});
  
var ColorThemeDialogWindow = GObject.registerClass(
    class Arc_Menu_ColorThemeDialogWindow extends PW.DialogWindow {
        _init(settings, parent, themeName="") {
            this._settings = settings;
            this.addResponse = false;
            this.themeName = themeName;
            super._init(_('Color Theme Name'), parent);
        }

        _createLayout(vbox) {        
            let nameFrameRow = new PW.FrameBoxRow();
            let nameFrameLabel = new Gtk.Label({
                label: _('Name:'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            nameFrameRow.add(nameFrameLabel);
            this.nameEntry = new Gtk.Entry();
            this.nameEntry.set_width_chars(35);
            
            nameFrameRow.add(this.nameEntry);
            this.nameEntry.grab_focus();
            if(this.themeName!=""){
                this.nameEntry.set_text(this.themeName);
            }
            this.nameEntry.connect('changed',()=>{
                if(this.nameEntry.get_text().length > 0)
                    saveButton.set_sensitive(true);
                else
                    saveButton.set_sensitive(false);
            });
        
            vbox.add(nameFrameRow);
            let saveButton = new Gtk.Button({
                label: _("Save Theme"),
                halign: Gtk.Align.END
            });   
            saveButton.set_sensitive(false);
            saveButton.connect('clicked', ()=> {
                this.themeName = this.nameEntry.get_text();
                this.addResponse=true;
                this.response(-10);
            });
            vbox.add(saveButton);
        }
        get_response(){
            return this.addResponse;
        }
});

var ExportColorThemeDialogWindow = GObject.registerClass(
    class Arc_Menu_ExportColorThemeDialogWindow extends PW.DialogWindow {

        _init(settings, parent, themes=null) {
            this._settings = settings;
            this._themes = themes;
            this.addResponse = false;
            this.selectedThemes = [];
            super._init(this._themes ? _('Select Themes to Import'): _('Select Themes to Export'), parent);
        }

        _createLayout(vbox) {  
            vbox.spacing = 0;
            this.checkButtonArray = [];
            this.shouldToggle =true;
            let themesListScrollWindow = new Gtk.ScrolledWindow();
            themesListScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            themesListScrollWindow.set_max_content_height(300);
            themesListScrollWindow.set_min_content_height(300);
            themesListScrollWindow.set_min_content_width(500);
            themesListScrollWindow.set_min_content_width(500);
            this.mainFrame = new PW.FrameBox();

            let themesListButton = new Gtk.Button({
                label: this._themes ?_("Import"): _("Export"),
            });

            themesListButton.connect('clicked', () => {
                this.addResponse = true;
                this.response(-10);
            });
	        themesListButton.set_halign(Gtk.Align.END);
           
            themesListScrollWindow.add_with_viewport(this.mainFrame);
            this.checkAllButton = new Gtk.CheckButton({
                margin_end: 23
            });

            this.checkAllButton.set_halign(Gtk.Align.END);
            this.checkAllButton.set_active(true);
            this.checkAllButton.connect('toggled', () => {   
                let isActive = this.checkAllButton.get_active();
                if(this.shouldToggle){
                    for(let i = 0; i< this.checkButtonArray.length; i++){
                        this.checkButtonArray[i].set_active(isActive);
                    }
                }
            });
            let checkAllRow = new PW.FrameBoxRow();
            let checkAllLabel = new Gtk.Label({
                use_markup: false,
                xalign: 0,
                hexpand: true,
                label: _("Select All"),
                halign: Gtk.Align.END
            });
            checkAllRow.add(checkAllLabel);
            checkAllRow.add(this.checkAllButton);
            vbox.add(checkAllRow);
            vbox.add(themesListScrollWindow);
            vbox.add(new PW.FrameBoxRow());
            vbox.add(themesListButton);

            this.color_themes = this._themes ? this._themes : this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0; i< this.color_themes.length; i++) {
                let theme = this.color_themes[i];
                let frameRow = new PW.FrameBoxRow();

                let themeBox = new Gtk.Box();

                let frameLabel = new Gtk.Label({
                    use_markup: false,
                    xalign: 0,
                    label: theme[0],
                    hexpand: true
                });
   
                let xpm = Utils.createXpmImage(theme[1], theme[2], theme[4], theme[5]);
                let presetPreview = new Gtk.Image({
                    hexpand: false,
                    margin_end: 5,
                    pixel_size: 42
                });
                presetPreview.set_from_pixbuf(GdkPixbuf.Pixbuf.new_from_xpm_data(xpm));
                themeBox.add(presetPreview);
                themeBox.add(frameLabel);
                frameRow.add(themeBox);
    
                let checkButton = new Gtk.CheckButton({
                    margin_end: 20
                });
                checkButton.connect('toggled', () => {
                    if(checkButton.get_active()){
                        this.selectedThemes.push(theme);
                    }
                    else{
                        this.shouldToggle = false;
                        this.checkAllButton.set_active(false);
                        this.shouldToggle = true;
                        let index= this.selectedThemes.indexOf(theme);
                        this.selectedThemes.splice(index,1);
                    }
                });
                this.checkButtonArray.push(checkButton);
                frameRow.add(checkButton);
                this.mainFrame.add(frameRow);
                checkButton.set_active(true);
            }    
        }
        get_response(){
            return this.addResponse;
        }
});

var ManageColorThemeDialogWindow = GObject.registerClass(
    class Arc_Menu_ManageColorThemeDialogWindow extends PW.DialogWindow {
        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            this.selectedThemes = [];
            super._init( _('Manage Presets'), parent);
        }

        _createLayout(vbox) {    
            let themesListScrollWindow = new Gtk.ScrolledWindow();
            themesListScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            themesListScrollWindow.set_max_content_height(300);
            themesListScrollWindow.set_min_content_height(300);
            themesListScrollWindow.set_min_content_width(500);
            themesListScrollWindow.set_min_content_width(500);
            this.mainFrame = new PW.FrameBox();
            let buttonRow = new PW.FrameBoxRow();

            let applyButton = new Gtk.Button({
                label: _("Apply"),
                hexpand: true
            });
            applyButton.set_sensitive(false);
            applyButton.connect('clicked', () => {
                this.addResponse = true;
                this.response(-10);
            });
	        applyButton.set_halign(Gtk.Align.END);

            themesListScrollWindow.add_with_viewport(this.mainFrame);
            vbox.add(themesListScrollWindow);
            buttonRow.add(applyButton);
            vbox.add(buttonRow);

            this.color_themes = this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0; i< this.color_themes.length; i++) {
                let theme = this.color_themes[i];
                let frameRow = new PW.FrameBoxRow();
                let themeBox = new Gtk.Box();

                let frameLabel = new Gtk.Label({
                    use_markup: false,
                    xalign: 0,
                    label: theme[0],
                    hexpand: true
                });
                let xpm = Utils.createXpmImage(theme[1], theme[2], theme[4], theme[5]);
                let presetPreview = new Gtk.Image({
                    hexpand: false,
                    margin_end: 5,
                    pixel_size: 42
                });
                presetPreview.set_from_pixbuf(GdkPixbuf.Pixbuf.new_from_xpm_data(xpm));
                
                themeBox.add(presetPreview);
                themeBox.add(frameLabel);
                frameRow.add(themeBox);
    
                let buttonBox = new PW.EditEntriesBox({
                    frameRow: frameRow, 
                    frame: this.mainFrame, 
                    buttons: [applyButton],
                    modifyButton: true,
                    deleteButton: true
                });
                
                buttonBox.connect('modify', () => {
                    let dialog = new ColorThemeDialogWindow(this._settings, this, theme[0]);
                    dialog.show_all();
                    dialog.connect('response', (response) => { 
                        if(dialog.get_response()) {
                            let index = frameRow.get_index();
                            let array = [dialog.themeName, theme[1], theme[2], theme[3], theme[4], theme[5], 
                                        theme[6], theme[7], theme[8], theme[9], theme[10], theme[11], theme[12]];
                            this.color_themes.splice(index,1,array);
                            theme = array;
                            frameLabel.label = dialog.themeName;
                            dialog.destroy();
                        }
                        else
                            dialog.destroy();
                    }); 
                    applyButton.set_sensitive(true);
                });
                buttonBox.connect('move-up', () => {
                    let index = frameRow.get_index();
                    if(index > 0){
                        this.color_themes.splice(index, 1);
                        this.color_themes.splice(index - 1, 0, theme);
                    }
                });

                buttonBox.connect('move-down', () => {
                    let index = frameRow.get_index();
                    if(index + 1 < this.mainFrame.count){
                        this.color_themes.splice(index, 1);
                        this.color_themes.splice(index + 1, 0, theme);
                    }
                });

                buttonBox.connect('delete', () => {
                    let index = frameRow.get_index();
                    this.color_themes.splice(index, 1);
                });
                
                frameRow.add(buttonBox);
                this.mainFrame.add(frameRow);
            }    
        }
        get_response(){
            return this.addResponse;
        }
});
  
var OverrideArcMenuThemeWindow = GObject.registerClass({
    Signals: {
        'menu-theme-response': { param_types: [GObject.TYPE_INT] },
    },
},
    class Arc_Menu_OverrideArcMenuThemeWindow extends Gtk.Box {
        _init(settings, parentBox, parentMainBox) {
            super._init({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 20,
            });
            this.parentBox = parentBox;
            this._parentMainBox = parentMainBox;
            this._settings = settings;
            this.addResponse = false;
            this.heightValue = this._settings.get_int('menu-height');
            this.rightPanelWidth = this._settings.get_int('right-panel-width');
            this.separatorColor = this._settings.get_string('separator-color');
            this.verticalSeparator = this._settings.get_boolean('vert-separator');
            this.customArcMenu = this._settings.get_boolean('enable-custom-arc-menu');
            
            this.menuColor = this._settings.get_string('menu-color');
            this.menuForegroundColor = this._settings.get_string('menu-foreground-color');
            this.borderColor = this._settings.get_string('border-color');
            this.highlightColor = this._settings.get_string('highlight-color');
            this.highlightForegroundColor = this._settings.get_string('highlight-foreground-color');
            this.fontSize = this._settings.get_int('menu-font-size');
            this.borderSize = this._settings.get_int('menu-border-size');
            this.cornerRadius = this._settings.get_int('menu-corner-radius');
            this.menuMargin = this._settings.get_int('menu-margin');
            this.menuArrowSize = this._settings.get_int('menu-arrow-size');
            this.menuWidth = this._settings.get_int('menu-width');
            this.updatePresetComboBox = true;
            this.shouldDeselect = true; 
            this._createLayout(this);
        }
        createIconList(store){
            this.color_themes = this._settings.get_value('color-themes').deep_unpack();
            for(let i= 0; i<this.color_themes.length; i++){
                let text = this.color_themes[i][0];
                let color1 = this.color_themes[i][1];
                let color2 = this.color_themes[i][2];
                let color3 = this.color_themes[i][4];
                let color4 = this.color_themes[i][5];
                let xpm = Utils.createXpmImage(color1, color2, color3, color4);
                let pixbuf = GdkPixbuf.Pixbuf.new_from_xpm_data(xpm);

                store.set(store.append(), [0, 1], [pixbuf, _(text)]);
            }
        }
        _createLayout(vbox) {         
            let colorPresetHeaderLabel = new Gtk.Label({
                label: "<b>" + _('Menu Theme Presets') +"</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            vbox.add(colorPresetHeaderLabel);

            this.colorPresetFrame = new PW.FrameBox();
            let colorPresetRow = new PW.FrameBoxRow();
            let colorPresetLabel = new Gtk.Label({
                label: _('Current Menu Theme Preset'),
                xalign:0,
                hexpand: true,
            });   
            let store = new Gtk.ListStore();
            store.set_column_types([GdkPixbuf.Pixbuf, GObject.TYPE_STRING]);
            this.colorPresetCombo = new Gtk.ComboBox({
                model: store,
            });
            
            this.createIconList(store);

            let renderer = new Gtk.CellRendererPixbuf({xpad: 5});
            this.colorPresetCombo.pack_start(renderer, false);
            this.colorPresetCombo.add_attribute(renderer, "pixbuf", 0);
            renderer = new Gtk.CellRendererText();
            this.colorPresetCombo.pack_start(renderer, true);
            this.colorPresetCombo.add_attribute(renderer, "text", 1);
            
            this.saveButton = new Gtk.Button({
                label: _("Save as Preset"),
                hexpand: true,
                halign: Gtk.Align.END
            });   
            this.checkIfPresetMatch();
            this.colorPresetCombo.connect('changed', (widget) => { 
                if(this.updatePresetComboBox){
                    let index = widget.get_active();
                    /*let defaultArray = ["Theme Name","Background Color", "Foreground Color","Border Color", "Highlight Color", "Hightlight Foreground Color", "Separator Color"
                                            , "Font Size", "Border Size", "Corner Radius", "Arrow Size", "Menu Displacement", "Vertical Separator"];*/
                    if(index>=0){
                        this.menuColor = this.color_themes[index][1];
                        this.menuForegroundColor = this.color_themes[index][2];
                        this.borderColor = this.color_themes[index][3];
                        this.highlightColor = this.color_themes[index][4];
                        this.highlightForegroundColor = this.color_themes[index][5];
                        this.separatorColor = this.color_themes[index][6];
                        this.fontSize = parseInt(this.color_themes[index][7]);
                        this.borderSize = parseInt(this.color_themes[index][8]);
                        this.cornerRadius = parseInt(this.color_themes[index][9]);
                        this.menuArrowSize = parseInt(this.color_themes[index][10]);
                        this.menuMargin = parseInt(this.color_themes[index][11]);
                        this.verticalSeparator = (this.color_themes[index][12] === 'true');
                        
                        this.shouldDeselect = false;
                        this.presetName=this.color_themes[index][0];
                        color.parse(this.menuColor);
                        menuBackgroudColorChooser.set_rgba(color);
        
                        color.parse(this.menuForegroundColor);
                        menuForegroundColorChooser.set_rgba(color); 
        
                        fontScale.set_value(this.fontSize); 
        
                        color.parse(this.borderColor);
                        borderColorChooser.set_rgba(color); 
        
                        borderScale.set_value(this.borderSize);
        
                        color.parse(this.highlightColor);
                        itemColorChooser.set_rgba(color);

                        color.parse(this.highlightForegroundColor);
                        itemForegroundColorChooser.set_rgba(color);
        
                        cornerScale.set_value(this.cornerRadius);
                        marginScale.set_value(this.menuMargin);
                        arrowScale.set_value(this.menuArrowSize);

                        vertSeparatorSwitch.set_active(this.verticalSeparator);
                        color.parse(this.separatorColor);
                        colorChooser.set_rgba(color);  
                        this.saveButton.set_sensitive(false);
                        applyButton.set_sensitive(true);  
                        this.shouldDeselect = true;    
                        resetButton.set_sensitive(this.checkIfResetButtonSensitive()); 
                    }         
                }    
            });
            colorPresetRow.add(colorPresetLabel);
            colorPresetRow.add(this.colorPresetCombo);
            this.colorPresetFrame.add(colorPresetRow);

            let presetsButtonRow = new PW.FrameBoxRow();
            
            this.saveButton.connect('clicked', () => {
                /*let defaultArray = ["Theme Name","Background Color", "Foreground Color","Border Color", "Highlight Color", "Separator Color"
                                , "Font Size", "Border Size", "Corner Radius", "Arrow Size", "Menu Displacement", "Vertical Separator"];*/
                let dialog = new ColorThemeDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', (response) => { 
                    if(dialog.get_response()){
                        let array = [dialog.themeName, this.menuColor, this.menuForegroundColor, this.borderColor, this.highlightColor, this.highlightForegroundColor, this.separatorColor, 
                                        this.fontSize.toString(), this.borderSize.toString(), this.cornerRadius.toString(), this.menuArrowSize.toString(), 
                                        this.menuMargin.toString(), this.verticalSeparator.toString()];
                        this.color_themes.push(array);
                        this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                }); 
            });

            let manageButton = new Gtk.Button({
                label: _("Manage Presets")
            });   
            manageButton.connect('clicked', ()=> {            
                let dialog = new ManageColorThemeDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', (response)=>{ 
                    if(dialog.get_response()){
                        this.color_themes = dialog.color_themes;
                        this._settings.set_value('color-themes',new GLib.Variant('aas',dialog.color_themes));
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                }); 
            });
            let addButton = new PW.Button({
                title: _("Browse Presets"),
                icon_name: "browse-presets-symbolic",
                hexpand: false
            });
            addButton.connect('clicked', () => {
                let settingsFile = Gio.File.new_for_path(Me.path + '/media/misc/ArcMenuDefaultPresets');
                let [ success, content, etags] = settingsFile.load_contents(null);
                let string = ByteArray.toString(content);
                let themes = string.split("\n")
                themes.pop(); //remove last blank array 
                let colorThemes = [];
                for(let i = 0; i < themes.length; i++){
                    let array = themes[i].split('//')
                    array.pop();
                    colorThemes.push(array);
                }
                let dialog = new ExportColorThemeDialogWindow(this._settings, this, colorThemes);
                dialog.show_all();
                dialog.connect('response', (response) => { 
                    if(dialog.get_response()){
                        let selectedThemes = dialog.selectedThemes;
                        this.color_themes = this._settings.get_value('color-themes').deep_unpack();
                        for(let i = 0; i < selectedThemes.length; i++){
                            this.color_themes.push(selectedThemes[i]);
                        }
                        this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                });  
            });

            presetsButtonRow.add(manageButton);
            presetsButtonRow.add(addButton);
            presetsButtonRow.add(this.saveButton);
            this.colorPresetFrame.add(presetsButtonRow);
            vbox.add(this.colorPresetFrame);

            this._settings.connect("changed::color-themes", () => {
                store.clear();
                this.createIconList(store);
                this.colorPresetCombo.model = store;
                this.colorPresetCombo.show_all();

                this.checkIfPresetMatch();
            });  

            let menuSettingsHeaderLabel = new Gtk.Label({
                label: "<b>" + _('Theme Settings') +"</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            vbox.add(menuSettingsHeaderLabel);

            let themeSettingsFrame = new PW.FrameBox();
            let themeSettingsFrameScrollWindow = new Gtk.ScrolledWindow({
                vexpand: true,
                valign: Gtk.Align.FILL
            });
            themeSettingsFrameScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            themeSettingsFrameScrollWindow.set_min_content_height(250);
            themeSettingsFrameScrollWindow.add_with_viewport(themeSettingsFrame);
            vbox.add(themeSettingsFrameScrollWindow);

            //ROW 1 - MENU BACKGROUND COLOR--------------------------------------   
            let menuBackgroudColorRow = new PW.FrameBoxRow();
            let menuBackgroudColorLabel = new Gtk.Label({
                label: _('Menu Background Color'),
                xalign:0,
                hexpand: true,
            });   
            let menuBackgroudColorChooser = new Gtk.ColorButton({use_alpha:true});   
            let color = new Gdk.RGBA();
            color.parse(this.menuColor);
            menuBackgroudColorChooser.set_rgba(color);            
            menuBackgroudColorChooser.connect('color-set', () => {
                this.menuColor = menuBackgroudColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            menuBackgroudColorRow.add(menuBackgroudColorLabel);
            menuBackgroudColorRow.add(menuBackgroudColorChooser);
            themeSettingsFrame.add(menuBackgroudColorRow);

            //ROW 2 - MENU FOREGROUND COLOR--------------------------------------   
            let menuForegroundColorRow = new PW.FrameBoxRow();
            let menuForegroundColorLabel = new Gtk.Label({
                label: _('Menu Foreground Color'),
                xalign:0,
                hexpand: true,
             });   
            let menuForegroundColorChooser = new Gtk.ColorButton({use_alpha:true});     
            color.parse(this.menuForegroundColor);
            menuForegroundColorChooser.set_rgba(color);            
            menuForegroundColorChooser.connect('color-set', () => {
                this.menuForegroundColor = menuForegroundColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            menuForegroundColorRow.add(menuForegroundColorLabel);
            menuForegroundColorRow.add(menuForegroundColorChooser);
            themeSettingsFrame.add(menuForegroundColorRow);

            //ROW 3 - FONT SIZE--------------------------------------------------   
            let fontSizeRow = new PW.FrameBoxRow();
            let fontSizeLabel = new Gtk.Label({
                label: _('Font Size'),
                xalign:0,
                hexpand: true,
            });   

            let fontScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({lower: 8, upper: 14, step_increment: 1, page_increment: 1, page_size: 0 }),
                digits: 0, round_digits: 0, hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            fontScale.connect('format-value', (scale, value) => { return value.toString() + ' pt'; });
            fontScale.set_value(this.fontSize);
            fontScale.connect('value-changed', () => {
                this.fontSize = fontScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            fontSizeRow.add(fontSizeLabel);
            fontSizeRow.add(fontScale);
            themeSettingsFrame.add(fontSizeRow);

            //ROW 4- Border Color-------------------------------------------------
            let borderColorRow = new PW.FrameBoxRow();
            let borderColorLabel = new Gtk.Label({
                label: _('Border Color'),
                xalign:0,
                hexpand: true,
            });   
            let borderColorChooser = new Gtk.ColorButton({use_alpha:true});     
            color = new Gdk.RGBA();
            color.parse(this.borderColor);
            borderColorChooser.set_rgba(color);            
            borderColorChooser.connect('color-set', ()=>{
                this.borderColor = borderColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            borderColorRow.add(borderColorLabel);
            borderColorRow.add(borderColorChooser);
            themeSettingsFrame.add(borderColorRow);

            //ROW 5 - Border Size-------------------------------------------------------
            let borderSizeRow = new PW.FrameBoxRow();
            let borderSizeLabel = new Gtk.Label({
                label: _('Border Size'),
                xalign:0,
                hexpand: true,
            });   
            let borderScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({lower: 0, upper: 4, step_increment: 1, page_increment: 1, page_size: 0}),
                digits: 0, round_digits: 0, hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            borderScale.connect('format-value', (scale, value) => { return value.toString() + ' px'; });
            borderScale.set_value(this.borderSize);
            borderScale.connect('value-changed', () => {
                this.borderSize = borderScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            }); 
            borderSizeRow.add(borderSizeLabel);
            borderSizeRow.add(borderScale);
            themeSettingsFrame.add(borderSizeRow);

            //ROW 6 - Active Item Background Color-----------------------------------------------
            let itemColorRow = new PW.FrameBoxRow();
            let itemColorLabel = new Gtk.Label({
                label: _('Active Item Background Color'),
                xalign:0,
                hexpand: true,
            });   
            let itemColorChooser = new Gtk.ColorButton({use_alpha:true});     
            color = new Gdk.RGBA();
            color.parse(this.highlightColor);
            itemColorChooser.set_rgba(color);            
            itemColorChooser.connect('color-set', () => {
                this.highlightColor = itemColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            itemColorRow.add(itemColorLabel);
            itemColorRow.add(itemColorChooser);
            themeSettingsFrame.add(itemColorRow);

            //ROW 7 - Active Item Foreground Color-----------------------------------------------
            let itemForegroundColorRow = new PW.FrameBoxRow();
            let itemForegroundColorLabel = new Gtk.Label({
                label: _('Active Item Foreground Color'),
                xalign:0,
                hexpand: true,
            });   
            let itemForegroundColorChooser = new Gtk.ColorButton({use_alpha:true});     
            color = new Gdk.RGBA();
            color.parse(this.highlightForegroundColor);
            itemForegroundColorChooser.set_rgba(color);            
            itemForegroundColorChooser.connect('color-set', () => {
                this.highlightForegroundColor = itemForegroundColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            itemForegroundColorRow.add(itemForegroundColorLabel);
            itemForegroundColorRow.add(itemForegroundColorChooser);
            themeSettingsFrame.add(itemForegroundColorRow);

            //ROW 8 - Corner Radius-----------------------------------------------------
            let cornerRadiusRow = new PW.FrameBoxRow();
            let cornerRadiusLabel = new Gtk.Label({
                label: _('Corner Radius'),
                xalign:0,
                hexpand: true,
            }); 
            let cornerScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({ lower: 0,upper: 20, step_increment: 1, page_increment: 1, page_size: 0}),
                digits: 0, round_digits: 0, hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            cornerScale.connect('format-value', (scale, value) => { return value.toString() + ' px'; });
            cornerScale.set_value(this.cornerRadius);
            cornerScale.connect('value-changed', () => {
                this.cornerRadius = cornerScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });   
            cornerRadiusRow.add(cornerRadiusLabel);
            cornerRadiusRow.add(cornerScale);
            themeSettingsFrame.add(cornerRadiusRow);

            //ROW 9 - Menu Arrow Size-------------------------------------------------------
            let menuMarginRow = new PW.FrameBoxRow();
            let menuMarginLabel = new Gtk.Label({
                label: _('Menu Arrow Size'),
                xalign:0,
                hexpand: true,
            });   
            let marginScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({ lower: 0,upper: 30, step_increment: 1, page_increment: 1, page_size: 0}),
                digits: 0, round_digits: 0, hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            marginScale.connect('format-value', (scale, value) => { return value.toString() + ' px'; });
            marginScale.set_value(this.menuMargin);
            marginScale.connect('value-changed', () => {
                this.menuMargin = marginScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });   
            menuMarginRow.add(menuMarginLabel);
            menuMarginRow.add(marginScale);
            themeSettingsFrame.add(menuMarginRow);

            //ROW 10 - Menu Displacement------------------------------------------------------
            let menuArrowRow = new PW.FrameBoxRow();
            let menuArrowLabel = new Gtk.Label({
                label: _('Menu Displacement'),
                xalign:0,
                hexpand: true,
            });   
            let arrowScale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({ lower: 0,upper: 20, step_increment: 1, page_increment: 1, page_size: 0}),
                digits: 0, round_digits: 0, hexpand: true,
                draw_value: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            arrowScale.connect('format-value', (scale, value) => { return value.toString() + ' px'; });
            arrowScale.set_value(this.menuArrowSize);
            arrowScale.connect('value-changed', () => {
                this.menuArrowSize = arrowScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });   
            menuArrowRow.add(menuArrowLabel);
            menuArrowRow.add(arrowScale);
            themeSettingsFrame.add(menuArrowRow);

            //ROW 11 - Vertical Separator------------------------------------------------------
            let vertSeparatorRow = new PW.FrameBoxRow();
            let vertSeparatorLabel = new Gtk.Label({
                label: _('Enable Vertical Separator'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
             });   
            let vertSeparatorSwitch = new Gtk.Switch({ halign: Gtk.Align.END});
            vertSeparatorSwitch.set_active(this.verticalSeparator);
            vertSeparatorSwitch.connect('notify::active', (widget) => {
                this.verticalSeparator = widget.get_active();
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                applyButton.set_sensitive(true);
                resetButton.set_sensitive(true);
            });
            vertSeparatorRow.add(vertSeparatorLabel);            
            vertSeparatorRow.add(vertSeparatorSwitch);             
            themeSettingsFrame.add(vertSeparatorRow);

            //ROW 12 - Separator Color------------------------------------------------------
            let separatorColorRow = new PW.FrameBoxRow();
            let separatorColorLabel = new Gtk.Label({
                label: _('Separator Color'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let colorChooser = new Gtk.ColorButton({use_alpha:true});     
            color = new Gdk.RGBA();
            color.parse(this.separatorColor);
            colorChooser.set_rgba(color);    
            colorChooser.connect('color-set', ()=>{
                this.separatorColor = colorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect)
                    this.checkIfPresetMatch();
                resetButton.set_sensitive(true);
            });
            separatorColorRow.add(separatorColorLabel);            
            separatorColorRow.add(colorChooser);             
            themeSettingsFrame.add(separatorColorRow);

            let buttonRow = new Gtk.Box({
                valign: Gtk.Align.END,
                margin_top: 6,
                margin_bottom: 6,
                margin_start: 24,
                margin_end: 24,
            });
            this._parentMainBox.buttonRow = buttonRow;
            let resetButton = new Gtk.Button({
                label: _("Restore Defaults"),
                valign: Gtk.Align.END,
                vexpand: false
            });   
            resetButton.set_sensitive( this.checkIfResetButtonSensitive());
            resetButton.connect('clicked', ()=> {
                this.separatorColor = "rgb(63,62,64)";
                this.verticalSeparator = false;
                this.menuColor = "rgba(28, 28, 28, 0.98)";
                this.menuForegroundColor = "rgba(211, 218, 227, 1)";
                this.borderColor = "rgb(63,62,64)";
                this.highlightColor = "rgba(238, 238, 236, 0.1)";
                this.highlightForegroundColor = "rgba(255,255,255,1)";
                this.fontSize = 9;
                this.borderSize = 0;
                this.cornerRadius = 0;
                this.menuMargin = 0;
                this.menuArrowSize = 0;
                color.parse(this.menuColor);
                menuBackgroudColorChooser.set_rgba(color);

                color.parse(this.menuForegroundColor);
                menuForegroundColorChooser.set_rgba(color); 

                fontScale.set_value(this.fontSize); 

                color.parse(this.borderColor);
                borderColorChooser.set_rgba(color); 

                borderScale.set_value(this.borderSize);

                color.parse(this.highlightColor);
                itemColorChooser.set_rgba(color);

                color.parse(this.highlightForegroundColor);
                itemForegroundColorChooser.set_rgba(color);

                cornerScale.set_value(this.cornerRadius);
                marginScale.set_value(this.menuMargin);
                arrowScale.set_value(this.menuArrowSize);

                vertSeparatorSwitch.set_active(this.verticalSeparator);
                color.parse(this.separatorColor);
                colorChooser.set_rgba(color);    

                resetButton.set_sensitive(false);
                applyButton.set_sensitive(true);               
            });
 
            let applyButton = new Gtk.Button({
                label: _("Apply"),
                hexpand: true,
                halign: Gtk.Align.END
            });
            applyButton.connect('clicked', ()=> {
                applyButton.set_sensitive(false); 
                this.emit('menu-theme-response', -10);
            });
            applyButton.set_sensitive(false);

            buttonRow.add(resetButton);
            buttonRow.add(applyButton);

            this._parentMainBox.add(buttonRow);   
        }
        get_response(){
            return this.addResponse;
        }
        checkIfPresetMatch(){
            this.presetName = "Custom Theme";
            let currentSettingsArray = [this.menuColor, this.menuForegroundColor, this.borderColor, this.highlightColor, this.highlightForegroundColor, this.separatorColor, 
                                        this.fontSize.toString(), this.borderSize.toString(), this.cornerRadius.toString(), this.menuArrowSize.toString(), 
                                        this.menuMargin.toString(), this.verticalSeparator.toString()];
            let all_color_themes = this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0;i < all_color_themes.length;i++){
                this.isEqual=true;
                for(let l = 0; l<currentSettingsArray.length;l++){
                    if(currentSettingsArray[l] != all_color_themes[i][l+1]){
                        this.isEqual=false;
                        break;
                    }
                }
                if(this.isEqual){
                    this.presetName = all_color_themes[i][0];
                    this.updatePresetComboBox = false;
                    this.colorPresetCombo.set_active(i);
                    this.saveButton.set_sensitive(false);
                    this.updatePresetComboBox = true;
                    break;
                }      
            }
            if(!this.isEqual){
                this.saveButton.set_sensitive(true);
                this.colorPresetCombo.set_active(-1);
            } 
        }
        checkIfResetButtonSensitive(){
            return (this.menuColor != "rgba(28, 28, 28, 0.98)"||
            this.menuForegroundColor != "rgba(211, 218, 227, 1)"||
            this.borderColor != "rgb(63,62,64)"||
            this.highlightColor != "rgba(238, 238, 236, 0.1)"||
            this.highlightForegroundColor != "rgba(255,255,255,1)"||
            this.fontSize != 9||
            this.borderSize != 0||
            this.cornerRadius != 0||
            this.menuMargin != 0||
            this.menuArrowSize != 0 ||
            this.verticalSeparator != false ||
            this.separatorColor != "rgb(63,62,64)") ? true : false
        }
});

var MenuSettingsShortcutDirectoriesPage = GObject.registerClass(
    class Arc_Menu_MenuSettingsShortcutDirectoriesPage extends Gtk.Box {
    _init(settings) {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
        });

        this.scrollBox = new Gtk.ScrolledWindow();
        this.scrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

        this.mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
            spacing: 20,
            vexpand: true,
            valign: Gtk.Align.FILL
        });

        this.scrollBox.add_with_viewport(this.mainBox);
        this.add(this.scrollBox);
        this._settings = settings;
        let softwareShortcutsFrame = new PW.FrameBox();
        this.softwareShortcutsScrollWindow = new Gtk.ScrolledWindow({
            valign: Gtk.Align.FILL,
            vexpand: true
        });
        this.softwareShortcutsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        this.softwareShortcutsScrollWindow.set_min_content_height(300);
        this.softwareShortcutsScrollWindow.add_with_viewport(softwareShortcutsFrame);

        let applicationShortcuts = this._settings.get_value('directory-shortcuts-list').deep_unpack();

        this.resetButton = new Gtk.Button({
            label: _("Restore Defaults"),
        });
        this.saveButton = new Gtk.Button({
            label: _("Apply"),
            hexpand: true
        });

        this._loadPinnedApps(applicationShortcuts,softwareShortcutsFrame);
        this.mainBox.add(this.softwareShortcutsScrollWindow);

        let addPinnedAppsFrame = new PW.FrameBox();
        let addPinnedAppsFrameRow = new PW.FrameBoxRow();
        let addPinnedAppsFrameLabel = new Gtk.Label({
            label: _("Add Default User Directories"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let addPinnedAppsButton = new PW.Button({
            icon_name: 'list-add-symbolic',
        });
        addPinnedAppsButton.connect('clicked', ()=> {
            let dialog = new AddAppsToPinnedListWindow(this._settings, this, Constants.DiaglogType.DIRECTORIES);
            dialog.show_all();
            dialog.connect('response', ()=> { 
                if(dialog.get_response()) {
                    let newPinnedApps = dialog.get_newPinnedAppsArray();
                    let array=[]; 
                    for(let i = 0;i<newPinnedApps.length;i++){
                        array.push([newPinnedApps[i]._name,newPinnedApps[i]._icon,newPinnedApps[i]._cmd]);
                    }
                    this._loadPinnedApps(array,softwareShortcutsFrame);
                    dialog.destroy();
                    softwareShortcutsFrame.show_all();
                    this.saveButton.set_sensitive(true);
                }
                else
                    dialog.destroy();
            }); 
        });
        addPinnedAppsFrameRow.add(addPinnedAppsFrameLabel);
        addPinnedAppsFrameRow.add(addPinnedAppsButton);
        addPinnedAppsFrame.add(addPinnedAppsFrameRow);
        this.mainBox.add(addPinnedAppsFrame);
        
        let addCustomAppFrame = new PW.FrameBox();
        let addCustomAppFrameRow = new PW.FrameBoxRow();
        let addCustomAppFrameLabel = new Gtk.Label({
            label: _("Add Custom Shortcut"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let addCustomAppButton = new PW.Button({
            icon_name: 'list-add-symbolic',
        });
        addCustomAppButton.connect('clicked', ()=> {
            let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.DiaglogType.DIRECTORIES);
            dialog.show_all();
            dialog.connect('response', ()=> { 
                if(dialog.get_response()) {
                    let newPinnedApps = dialog.get_newPinnedAppsArray();
                    this._loadPinnedApps([newPinnedApps],softwareShortcutsFrame);
                    dialog.destroy();
                    softwareShortcutsFrame.show_all();
                    this.saveButton.set_sensitive(true);
                }
                else
                    dialog.destroy();
            }); 
        });
        addCustomAppFrameRow.add(addCustomAppFrameLabel);
        addCustomAppFrameRow.add(addCustomAppButton);
        addCustomAppFrame.add(addCustomAppFrameRow);
        this.mainBox.add(addCustomAppFrame);

        let buttonRow = new Gtk.Box({
            valign: Gtk.Align.END,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 24,
            margin_end: 24,
        });

        this.resetButton.set_sensitive(this.getSensitive());

        this.resetButton.connect('clicked', ()=> {
            this.saveButton.set_sensitive(true);
            softwareShortcutsFrame.remove_all_children();
            this._loadPinnedApps(this._settings.get_default_value('directory-shortcuts-list').deep_unpack(), softwareShortcutsFrame);
            softwareShortcutsFrame.show_all();
            this.resetButton.set_sensitive(false);
        });

        this.saveButton.connect('clicked', ()=> {
            let array = [];
            for(let i = 0; i < softwareShortcutsFrame.count; i++) {
                let frame = softwareShortcutsFrame.get_index(i);
                array.push([frame._name, frame._icon, frame._cmd]);
            }
            this._settings.set_value('directory-shortcuts-list', new GLib.Variant('aas', array));
            this.saveButton.set_sensitive(false);
            this.resetButton.set_sensitive(this.getSensitive());
        }); 
        this.saveButton.set_halign(Gtk.Align.END);
        this.saveButton.set_sensitive(false);
        buttonRow.add(this.resetButton);
        buttonRow.add(this.saveButton);
        this.add(buttonRow);
    }

    getSensitive(){
        let defaultShortcuts = this._settings.get_default_value('directory-shortcuts-list').deep_unpack();
        let currentShortcuts = this._settings.get_value('directory-shortcuts-list').deep_unpack();
        return !Utils.getArraysEqual(defaultShortcuts, currentShortcuts);
    }

    _loadPinnedApps(applicationShortcuts,softwareShortcutsFrame){
        for(let i = 0; i < applicationShortcuts.length; i++){
            let applicationName = _(applicationShortcuts[i][0]);
            let editable = true;
            if(applicationShortcuts[i][2].startsWith("ArcMenu_")){
                editable = false;
            }

            let frameRow = new PW.FrameBoxDragRow(this.softwareShortcutsScrollWindow);
            frameRow._name = applicationName;
            frameRow._icon = applicationShortcuts[i][1];   
            frameRow._gicon = Gio.icon_new_for_string(getIconPath(applicationShortcuts[i]));
            frameRow._cmd = applicationShortcuts[i][2];
            frameRow.saveButton = this.saveButton;
            frameRow.resetButton = this.resetButton;

            let applicationIcon = new Gtk.Image( {
                gicon: frameRow._gicon,
                pixel_size: 22
            });
            let applicationImageBox = new Gtk.Box({
                margin_start: 0,
                hexpand: false,
                vexpand: false,
                spacing: 5,
            });
            let dragImage = new Gtk.Image( {
                gicon: Gio.icon_new_for_string("drag-symbolic"),
                pixel_size: 12
            });
            applicationImageBox.add(dragImage);
            applicationImageBox.add(applicationIcon);
            frameRow.add(applicationImageBox);

            let softwareShortcutsLabel = new Gtk.Label({
                label: _(applicationName),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let buttonBox = new PW.EditEntriesBox({
                frameRow: frameRow, 
                frame: softwareShortcutsFrame, 
                buttons: [this.resetButton, this.saveButton],
                modifyButton: editable,
                deleteButton: true
            });

            if(editable){
                buttonBox.connect('modify', ()=> {
                    let appArray = [frameRow._name,frameRow._icon,frameRow._cmd];
                    let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.DiaglogType.DIRECTORIES, true, appArray);
                    dialog.show_all();
                    dialog.connect('response', ()=> { 
                        if(dialog.get_response()) {
                            let newApplicationShortcut = dialog.get_newPinnedAppsArray();
                            frameRow._name = newApplicationShortcut[0];
                            frameRow._icon = newApplicationShortcut[1];
                            frameRow._cmd = newApplicationShortcut[2];
                            softwareShortcutsLabel.label = _(frameRow._name);
                            applicationIcon.gicon = Gio.icon_new_for_string(frameRow._icon);
                            dialog.destroy();
                            softwareShortcutsFrame.show_all();
                            this.resetButton.set_sensitive(true);
                            this.saveButton.set_sensitive(true);
                        }
                        else
                            dialog.destroy();
                    });  
                });
            }
            
            frameRow.add(softwareShortcutsLabel);
            frameRow.add(buttonBox);
            softwareShortcutsFrame.add(frameRow);
        }
    }
});
var MenuSettingsShortcutApplicationsPage = GObject.registerClass(
    class Arc_Menu_MenuSettingsShortcutApplicationsPage extends Gtk.Box {
    _init(settings) {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
        });

        this.scrollBox = new Gtk.ScrolledWindow();
        this.scrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

        this.mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
            spacing: 20,
            vexpand: true,
            valign: Gtk.Align.FILL
        });

        this.scrollBox.add_with_viewport(this.mainBox);
        this.add(this.scrollBox);
        this._settings = settings;
        let softwareShortcutsFrame = new PW.FrameBox();
        this.softwareShortcutsScrollWindow = new Gtk.ScrolledWindow({
            valign: Gtk.Align.FILL,
            vexpand: true
        });
        this.softwareShortcutsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        this.softwareShortcutsScrollWindow.set_min_content_height(300);
        this.softwareShortcutsScrollWindow.add_with_viewport(softwareShortcutsFrame);

        let applicationShortcuts = this._settings.get_value('application-shortcuts-list').deep_unpack();

        this.resetButton = new Gtk.Button({
            label: _("Restore Defaults"),
        });  
        this.saveButton = new Gtk.Button({
            label: _("Apply"),
            hexpand: true
        });

        this._loadPinnedApps(applicationShortcuts,softwareShortcutsFrame);
        this.mainBox.add(this.softwareShortcutsScrollWindow);

        let addPinnedAppsFrame = new PW.FrameBox();
        let addPinnedAppsFrameRow = new PW.FrameBoxRow();
        let addPinnedAppsFrameLabel = new Gtk.Label({
            label: _("Add More Apps"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let addPinnedAppsButton = new PW.Button({
            icon_name: 'list-add-symbolic',
        });
        addPinnedAppsButton.connect('clicked', ()=> {
            let dialog = new AddAppsToPinnedListWindow(this._settings, this, Constants.DiaglogType.APPLICATIONS);
            dialog.show_all();
            dialog.connect('response', ()=> { 
                if(dialog.get_response()) {
                    let newPinnedApps = dialog.get_newPinnedAppsArray();
                    let array=[]; 
                    for(let i = 0;i<newPinnedApps.length;i++){
                        array.push([newPinnedApps[i]._name,newPinnedApps[i]._icon,newPinnedApps[i]._cmd]);
                    }
                    this._loadPinnedApps(array,softwareShortcutsFrame);
                    dialog.destroy();
                    softwareShortcutsFrame.show_all();
                    this.saveButton.set_sensitive(true);
                }
                else
                    dialog.destroy();
            }); 
        });
        addPinnedAppsFrameRow.add(addPinnedAppsFrameLabel);
        addPinnedAppsFrameRow.add(addPinnedAppsButton);
        addPinnedAppsFrame.add(addPinnedAppsFrameRow);
        this.mainBox.add(addPinnedAppsFrame);
        
        let addCustomAppFrame = new PW.FrameBox();
        let addCustomAppFrameRow = new PW.FrameBoxRow();
        let addCustomAppFrameLabel = new Gtk.Label({
            label: _("Add Custom Shortcut"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let addCustomAppButton = new PW.Button({
            icon_name: 'list-add-symbolic',
        });
        addCustomAppButton.connect('clicked', ()=> {
            let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.DiaglogType.APPLICATIONS);
            dialog.show_all();
            dialog.connect('response', ()=> { 
                if(dialog.get_response()) {
                    let newPinnedApps = dialog.get_newPinnedAppsArray();
                    this._loadPinnedApps([newPinnedApps],softwareShortcutsFrame);
                    dialog.destroy();
                    softwareShortcutsFrame.show_all();
                    this.saveButton.set_sensitive(true);
                }
                else
                    dialog.destroy();
            }); 
        });
        addCustomAppFrameRow.add(addCustomAppFrameLabel);
        addCustomAppFrameRow.add(addCustomAppButton);
        addCustomAppFrame.add(addCustomAppFrameRow);
        this.mainBox.add(addCustomAppFrame);

        let buttonRow = new Gtk.Box({
            valign: Gtk.Align.END,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 24,
            margin_end: 24,
        });

        this.resetButton.set_sensitive(this.getSensitive());

        this.resetButton.connect('clicked', ()=> {
            this.saveButton.set_sensitive(true);
            softwareShortcutsFrame.remove_all_children();
            this._loadPinnedApps(this._settings.get_default_value('application-shortcuts-list').deep_unpack(), softwareShortcutsFrame);
            softwareShortcutsFrame.show_all();
            this.resetButton.set_sensitive(false);
        });

        this.saveButton.connect('clicked', ()=> {
            let array = [];
            for(let i = 0; i < softwareShortcutsFrame.count; i++) {
                let frame = softwareShortcutsFrame.get_index(i);
                array.push([frame._name,frame._icon, frame._cmd]);
            }
            this._settings.set_value('application-shortcuts-list', new GLib.Variant('aas', array));
            this.saveButton.set_sensitive(false);
            this.resetButton.set_sensitive(this.getSensitive());
        }); 
        this.saveButton.set_halign(Gtk.Align.END);
        this.saveButton.set_sensitive(false);
        buttonRow.add(this.resetButton);
        buttonRow.add(this.saveButton);
        this.add(buttonRow);
    }

    getSensitive(){
        let defaultShortcuts = this._settings.get_default_value('application-shortcuts-list').deep_unpack();
        let currentShortcuts = this._settings.get_value('application-shortcuts-list').deep_unpack();
        return !Utils.getArraysEqual(defaultShortcuts, currentShortcuts);
    }

    _loadPinnedApps(applicationShortcuts,softwareShortcutsFrame){
        for(let i = 0; i < applicationShortcuts.length; i++){
            let applicationName = applicationShortcuts[i][0];

            let frameRow = new PW.FrameBoxDragRow(this.softwareShortcutsScrollWindow);
            let iconString;
            frameRow._name = applicationShortcuts[i][0];
            frameRow._icon = applicationShortcuts[i][1];
            frameRow._cmd = applicationShortcuts[i][2];
            frameRow.saveButton = this.saveButton;
            frameRow.resetButton = this.resetButton;
            iconString = frameRow._icon;
            if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd)){
                iconString = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon() ? Gio.DesktopAppInfo.new(frameRow._cmd).get_icon().to_string() : "";
            }
            frameRow._gicon = Gio.icon_new_for_string(iconString);
            let applicationIcon = new Gtk.Image( {
                gicon: frameRow._gicon,
                pixel_size: 22
            });
            let applicationImageBox = new Gtk.Box( {
                margin_start: 0,
                hexpand: false,
                vexpand: false,
                spacing: 5,
            });
            let dragImage = new Gtk.Image( {
                gicon: Gio.icon_new_for_string("drag-symbolic"),
                pixel_size: 12
            });
            applicationImageBox.add(dragImage);
            applicationImageBox.add(applicationIcon);
            frameRow.add(applicationImageBox);

            let softwareShortcutsLabel = new Gtk.Label({
                label: _(applicationName),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            checkIfValidShortcut(frameRow, softwareShortcutsLabel, applicationIcon);

            let buttonBox = new PW.EditEntriesBox({
                frameRow: frameRow, 
                frame: softwareShortcutsFrame, 
                buttons: [this.saveButton, this.resetButton],
                modifyButton: true,
                deleteButton: true
            });
            
            buttonBox.connect('modify', ()=> {
                let appArray = [frameRow._name,frameRow._icon,frameRow._cmd];
                let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.DiaglogType.APPLICATIONS, true, appArray);
                dialog.show_all();
                dialog.connect('response', ()=> { 
                    if(dialog.get_response()) {
                        let newApplicationShortcut = dialog.get_newPinnedAppsArray();
                        frameRow._name = newApplicationShortcut[0];
                        frameRow._icon = newApplicationShortcut[1];
                        frameRow._cmd = newApplicationShortcut[2];
                        softwareShortcutsLabel.label = _(frameRow._name);
                        let iconString;
                        if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd)){
                            iconString = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon() ? Gio.DesktopAppInfo.new(frameRow._cmd).get_icon().to_string() : "";
                        }
                        applicationIcon.gicon = Gio.icon_new_for_string(iconString ? iconString : frameRow._icon);
                        dialog.destroy();
                        softwareShortcutsFrame.show_all();
                        this.resetButton.set_sensitive(true);
                        this.saveButton.set_sensitive(true);
                    }
                    else
                        dialog.destroy();
                });  
            });
            
            frameRow.add(softwareShortcutsLabel);
            frameRow.add(buttonBox);
            softwareShortcutsFrame.add(frameRow);
        }
    }
});
var MenuSettingsPowerOptionsPage = GObject.registerClass(
    class Arc_Menu_MenuSettingsPowerOptionsPage extends Gtk.Box {
        _init(settings) {
            super._init({
                orientation: Gtk.Orientation.VERTICAL,
            });
    
            this.scrollBox = new Gtk.ScrolledWindow();
            this.scrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
    
            this.mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
                spacing: 20,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
    
            this.scrollBox.add_with_viewport(this.mainBox);
            this.add(this.scrollBox);
            this._settings = settings;
            this.powerOptionsFrame = new PW.FrameBox();
    
            this.resetButton = new Gtk.Button({
                label: _("Restore Defaults"),
            });
            this.saveButton = new Gtk.Button({
                label: _("Apply"),
                hexpand: true
            });
    
            this._createFrame(this._settings.get_value("power-options").deep_unpack());
            this.mainBox.add(this.powerOptionsFrame);
    
            let buttonRow = new Gtk.Box({
                valign: Gtk.Align.END,
                margin_top: 6,
                margin_bottom: 6,
                margin_start: 24,
                margin_end: 24,
            });
    
            this.resetButton.set_sensitive(this.getSensitive());
    
            this.resetButton.connect('clicked', ()=> {
                this.saveButton.set_sensitive(true);
                this.powerOptionsFrame.remove_all_children();
                this._createFrame(this._settings.get_default_value('power-options').deep_unpack());
                this.powerOptionsFrame.show_all();
                this.resetButton.set_sensitive(false);
            });
    
            this.saveButton.connect('clicked', ()=> {
                let array = [];
                for(let i = 0; i < this.powerOptionsFrame.count; i++) {
                    let frame = this.powerOptionsFrame.get_index(i);
                    array.push([frame._enum, frame._shouldShow]);
                }
                this._settings.set_value('power-options', new GLib.Variant('a(ib)', array));
                this.saveButton.set_sensitive(false);
                this.resetButton.set_sensitive(this.getSensitive());
            }); 
            this.saveButton.set_halign(Gtk.Align.END);
            this.saveButton.set_sensitive(false);
            buttonRow.add(this.resetButton);
            buttonRow.add(this.saveButton);
            this.add(buttonRow);
        }
    
        getSensitive(){
            let defaultPowerOptions = this._settings.get_default_value("power-options").deep_unpack();
            let currentPowerOptions = this._settings.get_value("power-options").deep_unpack();
            return !Utils.getArraysEqual(defaultPowerOptions, currentPowerOptions);
        }
    
        _createFrame(powerOptions){
            for(let i = 0; i < powerOptions.length; i++){
                let powerType = powerOptions[i][0];
                let name = Constants.PowerOptions[powerType].TITLE;
    
                let frameRow = new PW.FrameBoxDragRow(this);
                frameRow._enum = powerOptions[i][0];
                frameRow._shouldShow = powerOptions[i][1]; 
                frameRow._name = Constants.PowerOptions[powerType].TITLE; 
                frameRow._gicon = Gio.icon_new_for_string(Constants.PowerOptions[powerType].IMAGE);
                frameRow.saveButton = this.saveButton;
                frameRow.resetButton = this.resetButton;
                frameRow.hasSwitch = true;
                frameRow.switchActive = frameRow._shouldShow;
                
                let powerIcon = new Gtk.Image( {
                    gicon: frameRow._gicon,
                    pixel_size: 22
                });
                let powerImageBox = new Gtk.Box( {
                    margin_start: 0,
                    hexpand: false,
                    vexpand: false,
                    spacing: 5,
                });
                let dragImage = new Gtk.Image( {
                    gicon: Gio.icon_new_for_string("drag-symbolic"),
                    pixel_size: 12
                });
                powerImageBox.add(dragImage);
                powerImageBox.add(powerIcon);
                frameRow.add(powerImageBox);
    
                let powerLabel = new Gtk.Label({
                    label: _(name),
                    use_markup: true,
                    xalign: 0,
                    hexpand: true
                });
    
                let buttonBox = new PW.EditEntriesBox({
                    frameRow: frameRow, 
                    frame: this.powerOptionsFrame, 
                    buttons: [this.saveButton, this.resetButton],
                });
                
                let modifyButton = new Gtk.Switch({
                    valign: Gtk.Align.CENTER,
                    margin_start: 10,
                });
                
                modifyButton.set_active(frameRow._shouldShow);
                modifyButton.connect('notify::active', ()=> {
                    frameRow._shouldShow = modifyButton.get_active(); 
                    this.saveButton.set_sensitive(true);
                    this.resetButton.set_sensitive(true);
                });
                buttonBox.insert_column(0);
                buttonBox.attach(Gtk.Separator.new(Gtk.Orientation.VERTICAL), 0, 0, 1, 1);
                buttonBox.insert_column(0);
                buttonBox.attach(modifyButton, 0, 0, 1, 1);
                
                frameRow.add(powerLabel);
                frameRow.add(buttonBox);
                this.powerOptionsFrame.add(frameRow);
            }
        }
    });

var MiscPage = GObject.registerClass(
    class Arc_Menu_MiscPage extends Gtk.ScrolledWindow {
        _init(settings, parentBox) {
            super._init();
            this.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
    
            this.mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
                spacing: 20,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
    
            this.add_with_viewport(this.mainBox);
            this._settings = settings;

            let settingsHeaderLabel = new Gtk.Label({
                label: "<b>" + _('Export or Import Settings') +"</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            this.mainBox.add(settingsHeaderLabel);

            let importFrame = new PW.FrameBox();
            let importRow = new PW.FrameBoxRow();
            let importLabel = new Gtk.Label({
                label: _("All ArcMenu Settings"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            
            let settingsImportInfoButton = new PW.Button({
                icon_name: 'info-circle-symbolic'
            });
            settingsImportInfoButton.connect('clicked', ()=> {
                let dialog = new PW.MessageDialog({
                    text: _("Export or Import All ArcMenu Settings"),
                    secondaryText: _('Importing settings from file may replace ALL saved settings.\nThis includes all saved pinned apps.'),
                    buttons: Gtk.ButtonsType.OK,
                    transient_for: this.get_toplevel()
                });
                dialog.connect ('response', ()=> dialog.destroy());
                dialog.show_all();
            });

            let importButtonsRow = new PW.FrameBoxRow();
            let importButton = new Gtk.Button({
                label: _("Import from File"),
                hexpand: true,
                vexpand: true,
            });
            importButton.connect('clicked', ()=> {
                this._showFileChooser(
                    _('Import settings'),
                    { action: Gtk.FileChooserAction.OPEN },
                    "_Open",
                    filename => {
                        let settingsFile = Gio.File.new_for_path(filename);
                        let [ , pid, stdin, stdout, stderr] = 
                            GLib.spawn_async_with_pipes(
                                null,
                                ['dconf', 'load', SCHEMA_PATH],
                                null,
                                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                                null
                            );
            
                        stdin = new Gio.UnixOutputStream({ fd: stdin, close_fd: true });
                        GLib.close(stdout);
                        GLib.close(stderr);
                                            
                        let [ , , , retCode] = GLib.spawn_command_line_sync(GSET + ' -d ' + Me.uuid);
                                            
                        if (retCode == 0) {
                            GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, () => GLib.spawn_command_line_sync(GSET + ' -e ' + Me.uuid));
                        }
    
                        stdin.splice(settingsFile.read(null), Gio.OutputStreamSpliceFlags.CLOSE_SOURCE | Gio.OutputStreamSpliceFlags.CLOSE_TARGET, null);
                    }
                );
            });
            let exportButton = new Gtk.Button({
                label: _("Export to File"),
                hexpand: true,
                vexpand: true,
            });
            exportButton.connect('clicked', ()=> {
                this._showFileChooser(
                    _('Export settings'),
                    { action: Gtk.FileChooserAction.SAVE},
                    "_Save",
                    (filename) => {
                        let file = Gio.file_new_for_path(filename);
                        let raw = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                        let out = Gio.BufferedOutputStream.new_sized(raw, 4096);
                        out.write_all(GLib.spawn_command_line_sync('dconf dump ' + SCHEMA_PATH)[1], null);
                        out.close(null);
                    }
                );
            });

            importRow.add(importLabel);
            importRow.add(settingsImportInfoButton);
            importButtonsRow.add(exportButton);
            importButtonsRow.add(importButton);
            importFrame.add(importRow);     
            importFrame.add(importButtonsRow);
            this.mainBox.add(importFrame);

            let importColorPresetFrame = new PW.FrameBox();
            let importColorPresetRow = new PW.FrameBoxRow();
            let importColorPresetLabel = new Gtk.Label({
                label: _("Menu Theme Presets"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            
            let colorThemesImportInfoButton = new PW.Button({
                icon_name: 'info-circle-symbolic'
            });
            colorThemesImportInfoButton.connect('clicked', ()=> {
                let dialog = new PW.MessageDialog({
                    text: _("Export or Import Menu Theme Presets"),
                    secondaryText: _('Menu theme presets are located in the "Menu Theme" section'),
                    buttons: Gtk.ButtonsType.OK,
                    transient_for: this.get_toplevel()
                });
                dialog.connect ('response', ()=> dialog.destroy());
                dialog.show_all();
            });

            let importColorPresetButtonsRow = new PW.FrameBoxRow();
            let importColorPresetButton = new Gtk.Button({
                label: _("Import Theme Preset"),
                hexpand: true,
                vexpand: true,
            });
            importColorPresetButton.connect('clicked', ()=> {
                this._showFileChooser(
                    _('Import Theme Preset'),
                    { action: Gtk.FileChooserAction.OPEN },
                    "_Open",
                    filename => {
                        let settingsFile = Gio.File.new_for_path(filename);
                        let [ success, content, etags] = settingsFile.load_contents(null);
                        let string = ByteArray.toString(content);
                        let themes = string.split("\n")
                        themes.pop(); //remove last blank array 
                        this.color_themes = [];
                        for(let i = 0; i < themes.length; i++){
                            let array = themes[i].split('//')
                            array.pop();
                            this.color_themes.push(array);
                        }
                        let dialog = new ExportColorThemeDialogWindow(this._settings, this, this.color_themes);
                        dialog.show_all();
                        dialog.connect('response', (response) => { 
                            if(dialog.get_response()){
                                let selectedThemes = dialog.selectedThemes;
                                this.color_themes = this._settings.get_value('color-themes').deep_unpack();
                                for(let i = 0; i < selectedThemes.length; i++){
                                    this.color_themes.push(selectedThemes[i]);
                                }
                                
                                this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));
                        
                                dialog.destroy();
                            }
                            else
                                dialog.destroy();
                        });  
                    }
                );
            });
            let exportColorPresetButton = new Gtk.Button({
                label: _("Export Theme Preset"),
                hexpand: true,
                vexpand: true,
            });
            exportColorPresetButton.connect('clicked', ()=> {
                let dialog = new ExportColorThemeDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', (response) => { 
                    if(dialog.get_response()){
                       this.selectedThemes = dialog.selectedThemes;
                       this._showFileChooser(
                            _('Export Theme Preset'),
                                { action: Gtk.FileChooserAction.SAVE },
                                    "_Save",
                                    (filename) => {
                                        let file = Gio.file_new_for_path(filename);
                                        let raw = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                                        let out = Gio.BufferedOutputStream.new_sized(raw, 4096);
                                        for(let i = 0; i<this.selectedThemes.length; i++){
                                            for(let x = 0; x<this.selectedThemes[i].length;x++){
                                                out.write_all((this.selectedThemes[i][x]).toString()+"//", null);
                                            }
                                            out.write_all("\n", null);
                                        }
                                        out.close(null);
                                    }
                        );
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                }); 
            });
            
            importColorPresetRow.add(importColorPresetLabel);
            importColorPresetRow.add(colorThemesImportInfoButton);
            importColorPresetButtonsRow.add(exportColorPresetButton);
            importColorPresetButtonsRow.add(importColorPresetButton);
            importColorPresetFrame.add(importColorPresetRow);   
            importColorPresetFrame.add(importColorPresetButtonsRow);
            this.mainBox.add(importColorPresetFrame);

            let settingsSizeHeaderLabel = new Gtk.Label({
                label: "<b>" + _('ArcMenu Settings Window Size') +"</b>",
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            this.mainBox.add(settingsSizeHeaderLabel);

            let settingsSizeFrame = new PW.FrameBox();
            let settingsWidthRow = new PW.FrameBoxRow();
            let settingsWidthLabel = new Gtk.Label({
                label: _('Window Width'),
                xalign:0,
                hexpand: false,
            });
            let settingsWidthScale = new Gtk.SpinButton({
                adjustment: new Gtk.Adjustment({
                    lower: 850, upper: 1800, step_increment: 1, page_increment: 1, page_size: 0,
                }),
                climb_rate: 1,
                digits: 0,
                numeric: true,
                hexpand: true,
                halign: Gtk.Align.END
            });
            settingsWidthScale.set_value(this._settings.get_int("settings-width"));
            settingsWidthScale.connect('value-changed', (widget) => {
                this._settings.set_int("settings-width", widget.get_value())
            });
            settingsWidthRow.add(settingsWidthLabel);
            settingsWidthRow.add(settingsWidthScale);
            settingsSizeFrame.add(settingsWidthRow);

            let settingsHeightRow = new PW.FrameBoxRow();
            let settingsHeightLabel = new Gtk.Label({
                label: _('Window Height'),
                xalign:0,
                hexpand: false,
            });
            let settingsHeightScale = new Gtk.SpinButton({
                adjustment: new Gtk.Adjustment({
                    lower: 300, upper: 1600, step_increment: 1, page_increment: 1, page_size: 0,
                }),
                climb_rate: 1,
                digits: 0,
                numeric: true,
                hexpand: true,
                halign: Gtk.Align.END
            });
            settingsHeightScale.set_value(this._settings.get_int("settings-height"));
            settingsHeightScale.connect('value-changed', (widget) => {
                this._settings.set_int("settings-height", widget.get_value())
            });
            settingsHeightRow.add(settingsHeightLabel);
            settingsHeightRow.add(settingsHeightScale);
            settingsSizeFrame.add(settingsHeightRow);

            this.mainBox.add(settingsSizeFrame);

            let resetSettingsButton = new Gtk.Button({ 
                valign: Gtk.Align.END,
                halign: Gtk.Align.START,
                vexpand: true,
                hexpand: false,
                label: _("Reset all Settings"),
            });
            let context = resetSettingsButton.get_style_context();
            context.add_class('suggested-action');
            resetSettingsButton.connect('clicked', (widget) => {
                let dialog = new Gtk.MessageDialog({
                    text: "<b>" + _("Restore Default Settings?") + '</b>\n' + _("All ArcMenu settings will be reset to the default value."),
                    use_markup: true,
                    buttons: Gtk.ButtonsType.YES_NO,
                    message_type: Gtk.MessageType.WARNING,
                    transient_for: this.get_toplevel(),
                    modal: true
                });
                dialog.connect('response', (widget, response) => {
                    if(response == Gtk.ResponseType.YES){
                        GLib.spawn_command_line_sync('dconf reset -f /org/gnome/shell/extensions/arcmenu/');
                        let children = parentBox.settingsFrameStack.get_children();
                        for(let child of children){
                            parentBox.settingsFrameStack.remove(child);
                        }
                        parentBox.populateSettingsFrameStack();
                    }
                    dialog.destroy();
                });
                dialog.show_all();
            });

            this.mainBox.add(resetSettingsButton);
        }
        _showFileChooser(title, params, acceptBtn, acceptHandler) {
            let dialog = new Gtk.FileChooserDialog({ 
                title: _(title),
                transient_for: this.get_toplevel(), 
                modal: true,
                action: params.action,
            });
            if(params.action === Gtk.FileChooserAction.SAVE)
                dialog.set_do_overwrite_confirmation(true);            
            dialog.add_button("_Cancel", Gtk.ResponseType.CANCEL);
            dialog.add_button(acceptBtn, Gtk.ResponseType.ACCEPT);
    
            dialog.connect("response", (self, response) => {
                if(response === Gtk.ResponseType.ACCEPT){
                    try {
                        acceptHandler(dialog.get_file().get_path());
                    } catch(e) {
                        log('error from ArcMenu filechooser: ' + e);
                    }
                }
                dialog.destroy();
            });

            dialog.show_all();
        }
    });
    function mergeObjects(main, bck) {
        for (var prop in bck) {
            if (!main.hasOwnProperty(prop) && bck.hasOwnProperty(prop)) {
                main[prop] = bck[prop];
            }
        }
        return main;
    };

var AboutPage = GObject.registerClass(
    class Arc_Menu_AboutPage extends Gtk.ScrolledWindow {
        _init(settings) {
            super._init();
            this.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
    
            this.mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin_start: 24,
                margin_end: 24,
                spacing: 0,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
    
            this.add_with_viewport(this.mainBox);
            this._settings = settings;

            let releaseVersion;
            if(Me.metadata.version)
                releaseVersion = Me.metadata.version;
            else
                releaseVersion = 'unknown';

            let commitVersion;
            if(Me.metadata.commit)
                commitVersion = Me.metadata.commit;
                
            let projectUrl = Me.metadata.url;

            let arcMenuImage = new Gtk.Image({ 
                margin_bottom: 5,
                icon_name: 'arc-menu-logo',
                pixel_size: 100,
            });
            let arcMenuImageBox = new Gtk.Box( {
                orientation: Gtk.Orientation.VERTICAL,
                margin_top: 10,
                margin_bottom: 10,
                hexpand: false,
                vexpand: false
            });
            arcMenuImageBox.add(arcMenuImage);

            let extensionInfoFrame = new PW.FrameBox();

            let arcMenuVersionRow = new PW.FrameBoxRow({
                selectable: false,
                activatable: false
            });
            let versionText = new Gtk.Label({
                label: _('ArcMenu Version'),
            });
            let versionInfo = new Gtk.Label({
                label: releaseVersion + '',
                hexpand: true,
                sensitive: false,
                halign: Gtk.Align.END
            });
            arcMenuVersionRow.add(versionText);
            arcMenuVersionRow.add(versionInfo);
            extensionInfoFrame.add(arcMenuVersionRow);

            let commitRow = new PW.FrameBoxRow({
                selectable: false,
                activatable: false
            });
            let commitText = new Gtk.Label({
                label: _('Git Commit'),
            });
            let commitInfo = new Gtk.Label({
                label: commitVersion ? commitVersion : '',
                hexpand: true,
                sensitive: false,
                halign: Gtk.Align.END
            });
            commitRow.add(commitText);
            commitRow.add(commitInfo);
            if(commitVersion){
                extensionInfoFrame.add(createSeparator());
                extensionInfoFrame.add(commitRow);
            }

            let gnomeVersionRow = new PW.FrameBoxRow({
                selectable: false,
                activatable: false
            });
            let gnomeVersionText = new Gtk.Label({
                label: _('GNOME Version'),
            });
            let gnomeVersionInfo = new Gtk.Label({
                label: imports.misc.config.PACKAGE_VERSION + '',
                hexpand: true,
                sensitive: false,
                halign: Gtk.Align.END
            });
            gnomeVersionRow.add(gnomeVersionText);
            gnomeVersionRow.add(gnomeVersionInfo);
            extensionInfoFrame.add(createSeparator());
            extensionInfoFrame.add(gnomeVersionRow);

            let osRow = new PW.FrameBoxRow({
                selectable: false,
                activatable: false
            });
            let osText = new Gtk.Label({
                label: _('OS'),
            });
            let osInfoText;
            let name = GLib.get_os_info("NAME");
            let prettyName = GLib.get_os_info("PRETTY_NAME");
            if(prettyName)
                osInfoText = prettyName;
            else
                osInfoText = name;
            let versionID = GLib.get_os_info("VERSION_ID");
            if(versionID)
                osInfoText += "; Version ID: " + versionID;
            let buildID = GLib.get_os_info("BUILD_ID");
            if(buildID)
                osInfoText += "; " + "Build ID: " +buildID;

            let osInfo = new Gtk.Label({
                label: osInfoText,
                hexpand: true,
                sensitive: false,
                halign: Gtk.Align.END
            });
            osRow.add(osText);
            osRow.add(osInfo);
            extensionInfoFrame.add(createSeparator());
            extensionInfoFrame.add(osRow);

            let windowingRow = new PW.FrameBoxRow({
                selectable: false,
                activatable: false
            });
            let windowingText = new Gtk.Label({
                label: _('Session Type'),
            });
            let windowingLabel;
            if(Me.metadata.isWayland)
                windowingLabel = "Wayland";
            else
                windowingLabel = "X11";
          
            let windowingInfo = new Gtk.Label({
                label: windowingLabel,
                hexpand: true,
                sensitive: false,
                halign: Gtk.Align.END
            });
            windowingRow.add(windowingText);
            windowingRow.add(windowingInfo);
            extensionInfoFrame.add(createSeparator());
            extensionInfoFrame.add(windowingRow);
            
            let arcMenuInfoBox = new Gtk.Box( {
                orientation: Gtk.Orientation.VERTICAL,
                hexpand: false,
                vexpand: false
            });
            let arcMenuLabel = new Gtk.Label({
                label: '<span size="large"><b>' + _('ArcMenu') + '</b></span>',
                use_markup: true,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
            
            let projectDescriptionLabel = new Gtk.Label({
                label: _('Application Menu Extension for GNOME'),
                hexpand: false,
                vexpand: false,
                margin_bottom: 5
            });
            let linksBox = new Gtk.Box({
                hexpand: false,
                vexpand: false,
                valign: Gtk.Align.END,
                halign: Gtk.Align.CENTER,
                margin_top: 0,
                margin_bottom: 0,
                margin_start: 0,
                margin_end: 0,
                spacing: 0,
            });

            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(Me.path + '/media/icons/prefs_icons/donate-icon.svg', 150, 50);
            let donateImage = new Gtk.Image({
                pixbuf: pixbuf
            });
            let donateLinkButton = new Gtk.LinkButton({
                child: donateImage,
                uri: 'https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=53CWA7NR743WC&item_name=Donate+to+support+my+work&currency_code=USD&source=url',
            });

            pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(Me.path + '/media/icons/prefs_icons/gitlab-icon.svg', 150, 50);
            let gitlabImage = new Gtk.Image({
                pixbuf: pixbuf
            });

            let projectLinkButton = new Gtk.LinkButton({
                child: gitlabImage,
                uri: projectUrl,
            });
            
            linksBox.add(projectLinkButton);
            linksBox.add(donateLinkButton);

            this.creditsScrollWindow = new Gtk.ScrolledWindow({
                margin_top: 10,
                margin_bottom: 0,
                hexpand: false,
            });
            this.creditsScrollWindow.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
            this.creditsScrollWindow.set_max_content_height(200);
            this.creditsScrollWindow.set_min_content_height(200);
            this.creditsFrame = new PW.Notebook();
            this.creditsFrame.scrollable = true;
            let developersPage = new PW.NotebookPage(_("Developers"));
            this.creditsFrame.append_page(developersPage);
            let translatorsPage = new PW.NotebookPage(_("Translators"));
            this.creditsFrame.append_page(translatorsPage);
            let contributorsPage = new PW.NotebookPage(_("Contributors"));
            this.creditsFrame.append_page(contributorsPage );
            let artworkPage = new PW.NotebookPage(_("Artwork"));
            this.creditsFrame.append_page(artworkPage);
            this.creditsScrollWindow.add_with_viewport(this.creditsFrame);
  	        let creditsLabel = new Gtk.Label({
		        label: _(Constants.DEVELOPERS),
		        use_markup: true,
		        halign: Gtk.Align.START,
                hexpand: false,
                vexpand: false,
            });
            developersPage.add(creditsLabel);
            creditsLabel = new Gtk.Label({
		        label: _(Constants.TRANSLATORS),
		        use_markup: true,
		        halign: Gtk.Align.START,
                hexpand: false,
                vexpand: false,
            });
            translatorsPage.add(creditsLabel);
            creditsLabel = new Gtk.Label({
		        label: _(Constants.CONTRIBUTORS),
		        use_markup: true,
		        halign: Gtk.Align.START,
                hexpand: false,
                vexpand: false,
                wrap: true
            });
            contributorsPage.add(creditsLabel);
            contributorsPage.hexpand = false;
            creditsLabel = new Gtk.Label({
		        label: _(Constants.ARTWORK),
		        use_markup: true,
		        halign: Gtk.Align.START,
                hexpand: false,
                vexpand: false,
                wrap: true
            });
            artworkPage.add(creditsLabel);

            arcMenuImageBox.add(arcMenuLabel);
            arcMenuImageBox.add(projectDescriptionLabel);

            let gnuSofwareLabel = new Gtk.Label({
                label: _(Constants.GNU_SOFTWARE),
                use_markup: true,
                justify: Gtk.Justification.CENTER
            });
            let gnuSofwareLabelBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                valign: Gtk.Align.END,
                vexpand: true,
                margin_top: 5,
                margin_bottom: 10
            });
            gnuSofwareLabelBox.add(gnuSofwareLabel);

            this.mainBox.add(arcMenuImageBox);
            this.mainBox.add(arcMenuInfoBox);
            this.mainBox.add(extensionInfoFrame);

            this.mainBox.add(this.creditsScrollWindow)
            this.mainBox.add(gnuSofwareLabelBox);
            this.mainBox.add(linksBox);
        }
});

function createSeparator(){
    let separatorRow = new Gtk.ListBoxRow({
        selectable: false,
        activatable: false
    });
    separatorRow.add(Gtk.Separator.new(Gtk.Orientation.HORIZONTAL));
    return separatorRow;
}

var ArcMenuPreferencesWidget = GObject.registerClass(
class Arc_Menu_ArcMenuPreferencesWidget extends Gtk.Box {
    _init() {
        super._init();

        this.leftHeaderBox = new Gtk.Box({
            hexpand: true,
            visible: true
        });

        this._settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);
        
        this.backButton = new Gtk.Button({
            image: new Gtk.Image({icon_name: 'go-previous-symbolic'}),
            visible: true,
            always_show_image: true
        });
        this.backButton.connect("clicked", () => {
            this.leftHeaderBox.remove(this.backButton);
            this.settingsListStack.set_visible_child_name("Main");
            this.settingsListStack.get_child_by_name('Main').listBox.selectFirstRow();
        });

        this.settingsFrameStack = new Gtk.Stack({
            hhomogeneous: true,
            transition_type: Gtk.StackTransitionType.CROSSFADE
        });

        this.settingsListStack = new Gtk.Stack({
            hhomogeneous: true,
            transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT
        });

        let mainStackListBox = new PW.StackListBox(this, {width_request: 215});
        
        let mainStackBox = mainStackListBox.scrollWindow;
        mainStackListBox.addRow("General", _("General"), 'homescreen-symbolic');
        mainStackListBox.addRow("MenuLayout", _("Menu Layout"), 'menu-layouts-symbolic')
        mainStackListBox.addRow("MenuTheme", _("Menu Theme"), 'menu-theme-symbolic');
        mainStackListBox.addRow("MenuSettingsGeneral", _("Customize Menu"), 'menu-settings-symbolic', "MenuSettings");
        mainStackListBox.addRow("ButtonAppearance", _("Button Appearance"),  'arc-menu-symbolic')
        mainStackListBox.addRow("Misc", _("Misc"), 'misc-symbolic')
        mainStackListBox.addRow("About", _("About"), 'info-circle-symbolic');
        mainStackListBox.setSeparatorIndices([1, 4, 5]);

        let menuSettingsStackListBox = new PW.StackListBox(this, {width_request: 215});
        let menuSettingsListBox = menuSettingsStackListBox.scrollWindow;
        menuSettingsStackListBox.addRow("MenuSettingsGeneral", _("Menu Settings"), 'menu-settings-symbolic');
        menuSettingsStackListBox.addRow("MenuSettingsPinnedApps", _("Pinned Apps"), 'pinned-apps-symbolic');
        menuSettingsStackListBox.addRow("MenuSettingsShortcutDirectories", _("Directory Shortcuts"), 'folder-documents-symbolic');
        menuSettingsStackListBox.addRow("MenuSettingsShortcutApplications", _("Application Shortcuts"), 'preferences-desktop-apps-symbolic');
        menuSettingsStackListBox.addRow("MenuSettingsPowerOptions", _("Power Options"), 'gnome-power-manager-symbolic');
        menuSettingsStackListBox.addRow("MenuSettingsCategories", _("Extra Categories"), 'categories-symbolic');
        menuSettingsStackListBox.addRow("MenuSettingsFineTune", _("Fine-Tune"), 'fine-tune-symbolic');
        menuSettingsStackListBox.setSeparatorIndices([1, 4, 6]);
 
        this.settingsListStack.add_named(mainStackBox, "Main");
        this.settingsListStack.add_named(menuSettingsListBox, "MenuSettings");

        let sidebar = new Gtk.StackSidebar();
        sidebar.set_stack(this.settingsListStack);
        this.add(this.settingsListStack);
        this.add(sidebar);

        this.add(this.settingsFrameStack);
        this.populateSettingsFrameStack();
    }

    populateSettingsFrameStack(){
        this.settingsFrameStack.add_named(new GeneralPage(this._settings), "General");
        this.menuLayoutPage = new MenuLayoutPage(this._settings);
        this.settingsFrameStack.add_named(this.menuLayoutPage, "MenuLayout");
        this.settingsFrameStack.add_named(new MenuThemePage(this._settings), "MenuTheme");

        this.settingsFrameStack.add_named(new MenuSettingsGeneralPage(this._settings), "MenuSettingsGeneral");
        this.settingsFrameStack.add_named(new MenuSettingsPinnedAppsPage(this._settings), "MenuSettingsPinnedApps");

        let menuSettingsPinnedAppsPage = this.settingsFrameStack.get_child_by_name("MenuSettingsPinnedApps");

        if(this.pinnedAppsChangedID){
            this._settings.disconnect(this.pinnedAppsChangedID);
            this.pinnedAppsChangedID = null;
        }
        this.pinnedAppsChangedID = this._settings.connect("changed::pinned-app-list", () =>{
            menuSettingsPinnedAppsPage.frame.remove_all_children();
            menuSettingsPinnedAppsPage._loadPinnedApps(this._settings.get_strv('pinned-app-list'));
            menuSettingsPinnedAppsPage.frame.show_all();
        });
        
        this.settingsFrameStack.add_named(new MenuSettingsShortcutDirectoriesPage(this._settings), "MenuSettingsShortcutDirectories");
        this.settingsFrameStack.add_named(new MenuSettingsShortcutApplicationsPage(this._settings), "MenuSettingsShortcutApplications");
        this.settingsFrameStack.add_named(new MenuSettingsPowerOptionsPage(this._settings), "MenuSettingsPowerOptions");
        this.settingsFrameStack.add_named(new MenuSettingsCategoriesPage(this._settings), "MenuSettingsCategories");
        this.settingsFrameStack.add_named(new MenuSettingsFineTunePage(this._settings), "MenuSettingsFineTune");
        this.settingsFrameStack.add_named(new ButtonAppearancePage(this._settings), "ButtonAppearance");
        this.settingsFrameStack.add_named(new MiscPage(this._settings, this), "Misc");
        this.settingsFrameStack.add_named(new AboutPage(this._settings), "About");

        this.show_all();

        if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.MAIN){
            this.settingsListStack.set_visible_child_name("Main");
            this.settingsListStack.get_child_by_name('Main').listBox.selectFirstRow();
            if(this.backButton.get_parent())
                this.leftHeaderBox.remove(this.backButton);
        }
        else if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.PINNED_APPS){
            this.settingsListStack.set_visible_child_name("MenuSettings");
            this.settingsListStack.get_child_by_name('MenuSettings').listBox.selectRowAtIndex(1);
            if(!this.backButton.get_parent())
                this.leftHeaderBox.add(this.backButton);
        }
        else if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.SHORTCUTS){
            this.settingsListStack.set_visible_child_name("MenuSettings");
            this.settingsListStack.get_child_by_name('MenuSettings').listBox.selectRowAtIndex(3);
            if(!this.backButton.get_parent())
                this.leftHeaderBox.add(this.backButton);
        }
        else if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.MENU_LAYOUT){
            this.settingsListStack.set_visible_child_name("Main");
            this.settingsListStack.get_child_by_name('Main').listBox.selectRowAtIndex(1);
            if(this.backButton.get_parent())
                this.leftHeaderBox.remove(this.backButton);
        }
        else if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.BUTTON_APPEARANCE){
            this.settingsListStack.set_visible_child_name("Main");
            this.settingsListStack.get_child_by_name('Main').listBox.selectRowAtIndex(4);
            if(this.backButton.get_parent())
                this.leftHeaderBox.remove(this.backButton);
        }
        else if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.LAYOUT_TWEAKS){
            this.settingsListStack.set_visible_child_name("Main");
            this.settingsListStack.get_child_by_name('Main').listBox.selectRowAtIndex(1);
            this.menuLayoutPage.connect("realize", () => this.menuLayoutPage.displayLayoutTweaksPage());
            if(this.backButton.get_parent())
                this.leftHeaderBox.remove(this.backButton);
        }
        else if(this._settings.get_int('prefs-visible-page') === Constants.PrefsVisiblePage.ABOUT){
            this.settingsListStack.set_visible_child_name("Main");
            this.settingsListStack.get_child_by_name('Main').listBox.selectRowAtIndex(6);
            if(this.backButton.get_parent())
                this.leftHeaderBox.remove(this.backButton);
        }
        this._settings.set_int('prefs-visible-page', Constants.PrefsVisiblePage.MAIN);
    }
});

function init() {
    ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
}

function buildPrefsWidget() {
    this._settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);
    let iconTheme = Gtk.IconTheme.get_default();
    if(!iconTheme.get_search_path().includes(Me.path + "/media/icons/prefs_icons"))
        iconTheme.append_search_path(Me.path + "/media/icons/prefs_icons");
    let widget = new ArcMenuPreferencesWidget();
    widget.connect("realize", () => {
        let window = widget.get_toplevel();

        window.resize(this._settings.get_int('settings-width'), this._settings.get_int('settings-height'));
        window.set_title(_("ArcMenu Settings"));
        window.get_titlebar().pack_start(widget.leftHeaderBox);
    });
    widget.show_all();
    return widget;
}

function checkIfValidShortcut(frameRow, label, icon){
    if(frameRow._cmd.endsWith(".desktop") && !Gio.DesktopAppInfo.new(frameRow._cmd)){
        icon.icon_name = 'warning-symbolic';
        frameRow.tooltip_text = _("Error - Invalid Shortcut");
        label.label = "<b><i>" + _("Invalid Shortcut") + "</i></b> "+ _(label.label);
    } 
}

function getIconPath(listing){
    let path, icon;
        
    if(listing[2]=="ArcMenu_Home")
        path = GLib.get_home_dir();
    else if(listing[2].startsWith("ArcMenu_")){
        let string = listing[2];
        path = string.replace("ArcMenu_",'');
        if(path === "Documents")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        else if(path === "Downloads")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD);
        else if(path === "Music")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_MUSIC);
        else if(path === "Pictures")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES);
        else if(path === "Videos")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_VIDEOS);
        else
            path = null;
    }
    else if(listing[1] == listing[2])
        path = listing[2];
    else if(listing[1] == "ArcMenu_Folder"){
        path = listing[2];
    }
    else
        path = null;

    if(path){
        let file = Gio.File.new_for_path(path);
        try {
            let info = file.query_info('standard::symbolic-icon', 0, null);
            icon = info.get_symbolic_icon();
        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                if (!file.is_native()) {
                    icon = new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
                } else {
                    icon = new Gio.ThemedIcon({ name: 'folder-symbolic' });
                }
            }
        }                            
        return icon.to_string();
    }
    else{
        if(listing[2]=="ArcMenu_Network")
            return  'network-workgroup-symbolic';
        else if(listing[2]=="ArcMenu_Computer")
            return  'drive-harddisk-symbolic';
        else
            return listing[1];
    }
}
