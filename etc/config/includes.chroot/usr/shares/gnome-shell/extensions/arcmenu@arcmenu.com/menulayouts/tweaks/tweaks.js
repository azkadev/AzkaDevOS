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
const {Gdk, GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Prefs = Me.imports.prefs;
const PW = Me.imports.prefsWidgets;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

var TweaksPage = GObject.registerClass({
    Signals: {
        'response': { param_types: [GObject.TYPE_INT] },
    },
},  class Arc_Menu_TweaksPage extends Gtk.Box {
    _init(settings, layoutName) {
        this._settings = settings;
        this.addResponse = false;
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
        });

        this.layoutNameLabel = new Gtk.Label({
            label: "<b>" + _(layoutName) + "</b>",
            use_markup: true,
            xalign: 0,
            hexpand: true,
            halign: Gtk.Align.CENTER
        })

        let backButton = new PW.Button({
            icon_name: 'go-previous-symbolic',
            title: _("Back"),
            icon_first: true,
        });
        backButton.halign = Gtk.Align.START;
        backButton.connect('clicked', ()=> {
            this.emit('response', -20);
        });
        this.headerBox = new Gtk.Grid({
            hexpand: true,
            halign: Gtk.Align.FILL,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
        });

        this.headerBox.attach(backButton, 0, 0, 1, 1);
        this.headerBox.attach(this.layoutNameLabel, 0, 0, 1, 1);
        this.mainScrollWindow = new Gtk.ScrolledWindow();
        this.mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
                spacing: 20,
                vexpand: true,
                valign: Gtk.Align.FILL
        });

        this.add(this.headerBox);
        this.mainScrollWindow.add_with_viewport(this.mainBox);
        this.mainScrollWindow.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.add(this.mainScrollWindow);
        this._createLayout();
        this.mainBox.show_all();
    }

    setActiveLayoutName(layoutName){
        this.layoutNameLabel.label = "<b>" + _(layoutName) + "</b>";
        let children = this.mainBox.get_children();
        for(let child of children){
            this.mainBox.remove(child);
        }         
        this._createLayout();
        this.mainBox.show_all();
    }

    _createLayout() {    
        let menuLayout = this._settings.get_enum('menu-layout');
        if(menuLayout == Constants.MenuLayout.ARCMENU)
            this._loadArcMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.BRISK)
            this._loadBriskMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.WHISKER)
            this._loadWhiskerMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.GNOME_MENU)
            this._loadGnomeMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.MINT)
            this._loadMintMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.ELEMENTARY)
            this._loadElementaryTweaks();
        else if(menuLayout == Constants.MenuLayout.GNOME_OVERVIEW)
            this._loadGnomeOverviewTweaks();
        else if(menuLayout == Constants.MenuLayout.SIMPLE)
            this._loadPlaceHolderTweaks();
        else if(menuLayout == Constants.MenuLayout.SIMPLE_2)
            this._loadPlaceHolderTweaks();
        else if(menuLayout == Constants.MenuLayout.REDMOND)
            this._loadRedmondMenuTweaks()
        else if(menuLayout == Constants.MenuLayout.UNITY)
            this._loadUnityTweaks();
        else if(menuLayout == Constants.MenuLayout.RAVEN)
            this._loadRavenTweaks();
        else if(menuLayout == Constants.MenuLayout.BUDGIE)
            this._loadBudgieMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.INSIDER)
            this._loadInsiderMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.RUNNER)
            this._loadRunnerMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.CHROMEBOOK)
            this._loadChromebookTweaks();
        else if(menuLayout == Constants.MenuLayout.TOGNEE)
            this._loadTogneeMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.PLASMA)
            this._loadPlasmaMenuTweaks();
        else if(menuLayout == Constants.MenuLayout.WINDOWS)
            this._loadWindowsTweaks();
        else
            this._loadPlaceHolderTweaks();
    }

    _createActivateOnHoverRow(){
        let activateOnHoverRow = new PW.FrameBoxRow();
        let activateOnHoverLabel = new Gtk.Label({
            label: _("Category Activation"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let activateOnHoverCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
        activateOnHoverCombo.append_text(_("Mouse Click"));
        activateOnHoverCombo.append_text(_("Mouse Hover"));
        if(this._settings.get_boolean('activate-on-hover'))
            activateOnHoverCombo.set_active(1);
        else 
            activateOnHoverCombo.set_active(0);
            activateOnHoverCombo.connect('changed', (widget) => {
            if(widget.get_active()==0)
                this._settings.set_boolean('activate-on-hover',false);
            if(widget.get_active()==1)
                this._settings.set_boolean('activate-on-hover',true);
        });
        
        activateOnHoverRow.add(activateOnHoverLabel);
        activateOnHoverRow.add(activateOnHoverCombo);
        return activateOnHoverRow;
    }
    _createAvatarShapeRow(){
        let avatarStyleRow = new PW.FrameBoxRow();
        let avatarStyleLabel = new Gtk.Label({
            label: _('Avatar Icon Shape'),
            xalign:0,
            hexpand: true,
        });   
        let avatarStyleCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
        avatarStyleCombo.append_text(_("Circular"));
        avatarStyleCombo.append_text(_("Square"));
        avatarStyleCombo.set_active(this._settings.get_enum('avatar-style'));
        avatarStyleCombo.connect('changed', (widget) => {
            this._settings.set_enum('avatar-style', widget.get_active());
            this._settings.set_boolean('reload-theme', true);
        });
        avatarStyleRow.add(avatarStyleLabel);
        avatarStyleRow.add(avatarStyleCombo);
        return avatarStyleRow;
    }
    _createSearchBarLocationRow(bottomDefault){
        let searchBarLocationSetting = bottomDefault ? 'searchbar-default-bottom-location' : 'searchbar-default-top-location';
                
        let searchbarLocationRow = new PW.FrameBoxRow();
        let searchbarLocationLabel = new Gtk.Label({
            label: _("Searchbar Location"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let searchbarLocationCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
        searchbarLocationCombo.append_text(_("Bottom"));
        searchbarLocationCombo.append_text(_("Top"));
        searchbarLocationCombo.set_active(this._settings.get_enum(searchBarLocationSetting ));
        searchbarLocationCombo.connect('changed', (widget) => {
            this._settings.set_enum(searchBarLocationSetting , widget.get_active());
        });

        searchbarLocationRow.add(searchbarLocationLabel);
        searchbarLocationRow.add(searchbarLocationCombo);
        return searchbarLocationRow;
    }
    _createFlipHorizontalRow(){
        let horizontalFlipRow = new PW.FrameBoxRow();
        let horizontalFlipLabel = new Gtk.Label({
            label: _("Flip Layout Horizontally"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let horizontalFlipSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        horizontalFlipSwitch.set_active(this._settings.get_boolean('enable-horizontal-flip'));
        horizontalFlipSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('enable-horizontal-flip', widget.get_active());
        });
        horizontalFlipRow.add(horizontalFlipLabel);
        horizontalFlipRow.add(horizontalFlipSwitch);
        return horizontalFlipRow;
    }
    _disableAvatarRow(){
        let disableAvatarRow = new PW.FrameBoxRow();
        let disableAvatarLabel = new Gtk.Label({
            label: _('Disable User Avatar'),
            xalign:0,
            hexpand: true,
        });   
        let disableAvatarSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        disableAvatarSwitch.set_active(this._settings.get_boolean('disable-user-avatar'));
        disableAvatarSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('disable-user-avatar', widget.get_active());
        });
        disableAvatarRow.add(disableAvatarLabel);
        disableAvatarRow.add(disableAvatarSwitch);
        return disableAvatarRow;
    }

    _loadGnomeOverviewTweaks(){
        let gnomeOverviewTweaksFrame = new PW.FrameBox();
        let appsGridRow = new PW.FrameBoxRow();
        let appsGridLabel = new Gtk.Label({
            label: _("Show Applications Grid"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let appsGridSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        appsGridSwitch.set_active(this._settings.get_boolean('gnome-dash-show-applications'));
        appsGridSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('gnome-dash-show-applications', widget.get_active());
        });
        appsGridRow.add(appsGridLabel);
        appsGridRow.add(appsGridSwitch);
        gnomeOverviewTweaksFrame.add(appsGridRow);
        this.mainBox.add(gnomeOverviewTweaksFrame);
    }

    _loadWindowsTweaks(){
        let windowsTweaksFrame = new PW.FrameBox();
        let frequentAppsRow = new PW.FrameBoxRow();
        let frequentAppsLabel = new Gtk.Label({
            label: _("Disable Frequent Apps"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let frequentAppsSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        frequentAppsSwitch.set_active(this._settings.get_boolean('windows-disable-frequent-apps'));
        frequentAppsSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('windows-disable-frequent-apps', widget.get_active());
        });
        frequentAppsRow.add(frequentAppsLabel);
        frequentAppsRow.add(frequentAppsSwitch);
        windowsTweaksFrame.add(frequentAppsRow);

        let pinnedAppsRow = new PW.FrameBoxRow();
        let pinnedAppsLabel = new Gtk.Label({
            label: _("Disable Pinned Apps"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let pinnedAppsSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        pinnedAppsSwitch.set_active(this._settings.get_boolean('windows-disable-pinned-apps'));
        pinnedAppsSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('windows-disable-pinned-apps', widget.get_active());
        });
        pinnedAppsRow.add(pinnedAppsLabel);
        pinnedAppsRow.add(pinnedAppsSwitch);
        windowsTweaksFrame.add(pinnedAppsRow);

        this.mainBox.add(windowsTweaksFrame);
    }

    _loadPlasmaMenuTweaks(){
        let plasmaMenuTweaksFrame = new PW.FrameBox();
        
        let searchBarLocationSetting = 'searchbar-default-top-location';
                
        let searchbarLocationRow = new PW.FrameBoxRow();
        let searchbarLocationLabel = new Gtk.Label({
            label: _("Searchbar Location"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let searchbarLocationCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
        searchbarLocationCombo.append_text(_("Bottom"));
        searchbarLocationCombo.append_text(_("Top"));
        searchbarLocationCombo.set_active(this._settings.get_enum(searchBarLocationSetting));
        searchbarLocationCombo.connect('changed', (widget) => {
            this._settings.set_enum(searchBarLocationSetting , widget.get_active());
        });

        searchbarLocationRow.add(searchbarLocationLabel);
        searchbarLocationRow.add(searchbarLocationCombo);
        plasmaMenuTweaksFrame.add(searchbarLocationRow);

        let hoverRow = new PW.FrameBoxRow();
        let hoverLabel = new Gtk.Label({
            label: _("Activate on Hover"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let hoverSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        hoverSwitch.set_active(this._settings.get_boolean('plasma-enable-hover'));
        hoverSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('plasma-enable-hover', widget.get_active());
        });
        hoverRow.add(hoverLabel);
        hoverRow.add(hoverSwitch);
        plasmaMenuTweaksFrame.add(hoverRow);

        let descriptionsRow = new PW.FrameBoxRow();
        let descriptionsLabel = new Gtk.Label({
            label: _("Show Application Descriptions"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let descriptionsSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        descriptionsSwitch.set_active(this._settings.get_boolean('apps-show-extra-details'));
        descriptionsSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('apps-show-extra-details', widget.get_active());
        });
        descriptionsRow.add(descriptionsLabel);
        descriptionsRow.add(descriptionsSwitch);
        plasmaMenuTweaksFrame.add(descriptionsRow);

        let foregroundColorRow = new PW.FrameBoxRow();
        let foregroundColorLabel = new Gtk.Label({
            label: _('Selected Button Border Color'),
            xalign:0,
            hexpand: true,
            });   
        let foregroundColorChooser = new Gtk.ColorButton({use_alpha:true});   
        let color = new Gdk.RGBA();
        color.parse(this._settings.get_string('plasma-selected-color'));
        foregroundColorChooser.set_rgba(color);            
        foregroundColorChooser.connect('color-set', ()=>{
            this._settings.set_string('plasma-selected-color', foregroundColorChooser.get_rgba().to_string());
            this._settings.set_boolean('reload-theme', true);
        });
        foregroundColorRow.add(foregroundColorLabel);
        foregroundColorRow.add(foregroundColorChooser);
        plasmaMenuTweaksFrame.add(foregroundColorRow);

        let backgroundColorRow = new PW.FrameBoxRow();
        let backgroundColorLabel = new Gtk.Label({
            label: _('Selected Button Background Color'),
            xalign:0,
            hexpand: true,
            });   
        let backgroundColorChooser = new Gtk.ColorButton({use_alpha:true});   
        color = new Gdk.RGBA();
        color.parse(this._settings.get_string('plasma-selected-background-color'));
        backgroundColorChooser.set_rgba(color);            
        backgroundColorChooser.connect('color-set', ()=>{
            this._settings.set_string('plasma-selected-background-color',backgroundColorChooser.get_rgba().to_string());
            this._settings.set_boolean('reload-theme', true);
        });
        backgroundColorRow.add(backgroundColorLabel);
        backgroundColorRow.add(backgroundColorChooser);
        plasmaMenuTweaksFrame.add(backgroundColorRow);

        this.mainBox.add(plasmaMenuTweaksFrame);

        let resetButton = new Gtk.Button({
            label: _("Restore Defaults"),
            tooltip_text: _("Restore the default settings on this page"),
            halign: Gtk.Align.START,
            hexpand: true
        });
        resetButton.set_sensitive(true);
        resetButton.connect('clicked', ()=> {
            let foregroundColor = this._settings.get_default_value('plasma-selected-color').unpack();
            let backgroundColor = this._settings.get_default_value('plasma-selected-background-color').unpack();
            let hoverEnabled = this._settings.get_default_value('plasma-enable-hover').unpack();
            let showDescriptions = this._settings.get_default_value('apps-show-extra-details').unpack();
            this._settings.reset('searchbar-default-top-location');
            searchbarLocationCombo.set_active(this._settings.get_enum(searchBarLocationSetting));
            hoverSwitch.set_active(hoverEnabled);
            color.parse(foregroundColor);
            foregroundColorChooser.set_rgba(color); 
            color.parse(backgroundColor);
            backgroundColorChooser.set_rgba(color); 
            descriptionsSwitch.set_active(showDescriptions);
            this._settings.reset('plasma-selected-color');
            this._settings.reset('plasma-selected-background-color');
            this._settings.reset('plasma-enable-hover');
            this._settings.reset('apps-show-extra-details');
            this._settings.set_boolean('reload-theme', true);
        });
        this.mainBox.add(resetButton);
    }
    _loadBriskMenuTweaks(){
        let briskMenuTweaksFrame = new PW.FrameBox();
        briskMenuTweaksFrame.add(this._createActivateOnHoverRow());
        briskMenuTweaksFrame.add(this._createSearchBarLocationRow());
        briskMenuTweaksFrame.add(this._createFlipHorizontalRow());
        let pinnedAppsFrame = new PW.FrameBox();
        let pinnedAppsScrollWindow = new Gtk.ScrolledWindow();
        pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        pinnedAppsScrollWindow.set_max_content_height(100);
        pinnedAppsScrollWindow.set_min_content_height(100);

        let savePinnedAppsButton = new Gtk.Button({
            label: _("Save"),
        });
        savePinnedAppsButton.connect('clicked', ()=> {
            let array = [];
            for(let x = 0;x < pinnedAppsFrame.count; x++) {
                array.push(pinnedAppsFrame.get_index(x)._name);
                array.push(pinnedAppsFrame.get_index(x)._icon);
                array.push(pinnedAppsFrame.get_index(x)._cmd);
            }
            this._settings.set_strv('brisk-shortcuts-list',array);
            savePinnedAppsButton.set_sensitive(false);
        }); 
        savePinnedAppsButton.set_halign(Gtk.Align.END);
        savePinnedAppsButton.set_sensitive(false);
        
        this._loadPinnedApps(this._settings.get_strv('brisk-shortcuts-list'), pinnedAppsFrame, savePinnedAppsButton, pinnedAppsScrollWindow);
        pinnedAppsScrollWindow.add_with_viewport(pinnedAppsFrame);

        let pinnedAppsHeaderLabel = new Gtk.Label({
            label: "<b>" + _("Brisk Menu Shortcuts") + "</b>",
            use_markup: true,
            xalign: 0
        });

        this.mainBox.add(briskMenuTweaksFrame);
        this.mainBox.add(pinnedAppsHeaderLabel);
        this.mainBox.add(pinnedAppsScrollWindow);
        this.mainBox.add(savePinnedAppsButton);
    }
    _loadChromebookTweaks(){
        let chromeBookTweaksFrame = new PW.FrameBox();
        chromeBookTweaksFrame.add(this._createSearchBarLocationRow());
        this.mainBox.add(chromeBookTweaksFrame);
    }
    _loadElementaryTweaks(){
        let elementaryTweaksFrame = new PW.FrameBox();
        elementaryTweaksFrame.add(this._createSearchBarLocationRow());
        this.mainBox.add(elementaryTweaksFrame);
    }
    _loadBudgieMenuTweaks(){
        let budgieMenuTweaksFrame = new PW.FrameBox();
        budgieMenuTweaksFrame.add(this._createActivateOnHoverRow());
        budgieMenuTweaksFrame.add(this._createSearchBarLocationRow());
        budgieMenuTweaksFrame.add(this._createFlipHorizontalRow());

        let enableActivitiesRow = new PW.FrameBoxRow();
        let enableActivitiesLabel = new Gtk.Label({
            label: _('Enable Activities Overview Shortcut'),
            xalign:0,
            hexpand: true,
        });   
        let enableActivitiesSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        enableActivitiesSwitch.set_active(this._settings.get_boolean('enable-activities-shortcut'));
        enableActivitiesSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('enable-activities-shortcut', widget.get_active());
        });
        enableActivitiesRow.add(enableActivitiesLabel);
        enableActivitiesRow.add(enableActivitiesSwitch);
        budgieMenuTweaksFrame.add(enableActivitiesRow);

        this.mainBox.add(budgieMenuTweaksFrame);
    }
    _loadRunnerMenuTweaks(){
        let runnerMenuTweaksFrame = new PW.FrameBox();
        let runnerPositionRow = new PW.FrameBoxRow();
        let runnerPositionLabel = new Gtk.Label({
            label: _('Position'),
            xalign:0,
            hexpand: true,
        });   
        let runnerPositionCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
        runnerPositionCombo.append_text(_("Top"));
        runnerPositionCombo.append_text(_("Centered"));
        runnerPositionCombo.set_active(this._settings.get_enum('runner-position'));
        runnerPositionCombo.connect('changed', (widget) => {
            this._settings.set_enum('runner-position', widget.get_active());
        });
        runnerPositionRow.add(runnerPositionLabel);
        runnerPositionRow.add(runnerPositionCombo);
        runnerMenuTweaksFrame.add(runnerPositionRow);

        let runnerWidthRow = new PW.FrameBoxRow();
        let runnerWidthLabel = new Gtk.Label({
            label: _("Width"),
            use_markup: true,
            hexpand: true,
            xalign: 0
        });
        let runnerWidthScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 300,
                upper: 1000,
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
        runnerWidthScale.add_mark(500, Gtk.PositionType.TOP, _("Default"));
        runnerWidthScale.set_value(this._settings.get_int('runner-menu-width'));
        runnerWidthScale.connect('value-changed', (widget) => {
            this._settings.set_int('runner-menu-width', widget.get_value());
        });
        runnerWidthRow.add(runnerWidthLabel);
        runnerWidthRow.add(runnerWidthScale);
        runnerMenuTweaksFrame.add(runnerWidthRow);

        let runnerHeightRow = new PW.FrameBoxRow();
        let runnerHeightLabel = new Gtk.Label({
            label: _("Height"),
            use_markup: true,
            hexpand: true,
            xalign: 0
        });
        let runnerHeightScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 300,
                upper: 1000,
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
        runnerHeightScale.add_mark(400, Gtk.PositionType.TOP, _("Default"));
        runnerHeightScale.set_value(this._settings.get_int('runner-menu-height'));
        runnerHeightScale.connect('value-changed', (widget) => {
            this._settings.set_int('runner-menu-height', widget.get_value());
        });

        runnerHeightRow.add(runnerHeightLabel);
        runnerHeightRow.add(runnerHeightScale);
        runnerMenuTweaksFrame.add(runnerHeightRow);

        let runnerFontSizeRow = new PW.FrameBoxRow();
        let runnerFontSizeLabel = new Gtk.Label({
            label: _("Font Size"),
            hexpand: true,
            use_markup: true,
            xalign: 0
        });
        let runnerFontSizeScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 30,
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

        runnerFontSizeScale.add_mark(0, Gtk.PositionType.TOP, _("Default"));
        runnerFontSizeScale.set_value(this._settings.get_int('runner-font-size'));
        runnerFontSizeScale.connect('value-changed', (widget) => {
            this._settings.set_int('runner-font-size', widget.get_value());
        });
        runnerFontSizeRow.add(runnerFontSizeLabel);
        runnerFontSizeRow.add(runnerFontSizeScale);
        runnerMenuTweaksFrame.add(runnerFontSizeRow);

        let frequentAppsRow = new PW.FrameBoxRow();
        let frequentAppsLabel = new Gtk.Label({
            label: _("Show Frequent Apps"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let frequentAppsSwitch = new Gtk.Switch();
        if(this._settings.get_boolean('runner-show-frequent-apps'))
            frequentAppsSwitch.set_active(true);
        frequentAppsSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('runner-show-frequent-apps', widget.get_active());
        });   
        frequentAppsRow.add(frequentAppsLabel);
        frequentAppsRow.add(frequentAppsSwitch);
        runnerMenuTweaksFrame.add(frequentAppsRow);

        let inheritThemeGapRow = new PW.FrameBoxRow();
        let inheritThemeGapLabel = new Gtk.Label({
            label: _("Inherit Shell Theme Popup Gap"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let inheritThemeGapSwitch = new Gtk.Switch();
        if(this._settings.get_boolean('runner-use-theme-gap'))
            inheritThemeGapSwitch.set_active(true);
        inheritThemeGapSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean('runner-use-theme-gap', widget.get_active());
        });   
        inheritThemeGapRow.add(inheritThemeGapLabel);
        inheritThemeGapRow.add(inheritThemeGapSwitch);
        runnerMenuTweaksFrame.add(inheritThemeGapRow);

        this.mainBox.add(runnerMenuTweaksFrame);
    }
    _loadUnityTweaks(){
        let pinnedAppsFrame = new PW.FrameBox();

        let generalTweaksFrame = new PW.FrameBox();
        let homeScreenRow = new PW.FrameBoxRow();
        let homeScreenLabel = new Gtk.Label({
            label: _('Default Screen'),
            xalign:0,
            hexpand: true,
        });   
        let homeScreenCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
        homeScreenCombo.append_text(_("Home Screen"));
        homeScreenCombo.append_text(_("All Programs"));
        let homeScreen = this._settings.get_boolean('enable-unity-homescreen');
        homeScreenCombo.set_active(homeScreen ? 0 : 1);
        homeScreenCombo.connect('changed', (widget) => {
            let enable =  widget.get_active() ==0 ? true : false;
            this._settings.set_boolean('enable-unity-homescreen', enable);
        });
        homeScreenRow.add(homeScreenLabel);
        homeScreenRow.add(homeScreenCombo);
        generalTweaksFrame.add(homeScreenRow);
        this.mainBox.add(generalTweaksFrame);

        let widgetFrame =  this._createWidgetsRows(Constants.MenuLayout.UNITY);
        this.mainBox.add(widgetFrame);

        let pinnedAppsScrollWindow = new Gtk.ScrolledWindow({
            vexpand: true,
            valign: Gtk.Align.FILL
        });
        pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        pinnedAppsScrollWindow.set_min_content_height(400);

        let savePinnedAppsButton = new Gtk.Button({
            label: _("Save"),
        });
        savePinnedAppsButton.connect('clicked', ()=> {
            let array = [];
            for(let x = 0;x < pinnedAppsFrame.count; x++) {
                array.push(pinnedAppsFrame.get_index(x)._name);
                array.push(pinnedAppsFrame.get_index(x)._icon);
                array.push(pinnedAppsFrame.get_index(x)._cmd);
            }
            this._settings.set_strv('unity-pinned-app-list',array);
            savePinnedAppsButton.set_sensitive(false);
        }); 
        savePinnedAppsButton.set_halign(Gtk.Align.END);
        savePinnedAppsButton.set_sensitive(false);
        
        this._loadPinnedApps(this._settings.get_strv('unity-pinned-app-list'), pinnedAppsFrame, savePinnedAppsButton, pinnedAppsScrollWindow);
        pinnedAppsScrollWindow.add_with_viewport(pinnedAppsFrame);

        let pinnedAppsHeaderLabel = new Gtk.Label({
            label: "<b>" + _("Unity Layout Buttons") + "</b>",
            use_markup: true,
            xalign: 0
        });
        this.mainBox.add(pinnedAppsHeaderLabel);
        this.mainBox.add(pinnedAppsScrollWindow);
        this.mainBox.add(savePinnedAppsButton);

        let pinnedAppsSeparatorHeaderLabel = new Gtk.Label({
            label: "<b>" + _("Button Separator Position") + "</b>",
            use_markup: true,
            xalign: 0
        });
        this.mainBox.add(pinnedAppsSeparatorHeaderLabel);

        let pinnedAppsSeparatorFrame = new PW.FrameBox();
        let pinnedAppsSeparatorRow = new PW.FrameBoxRow();
        let pinnedAppsSeparatorLabel = new Gtk.Label({
            label: _("Separator Position"),
            use_markup: true,
            xalign: 0
        });
        let pinnedAppsSeparatorScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL, 
            adjustment: new Gtk.Adjustment({lower: 0, upper: 7, step_increment: 1, page_increment: 1, page_size: 0}),
            digits: 0, round_digits: 0, hexpand: true,
            draw_value: true
        });
        pinnedAppsSeparatorScale.add_mark(0, Gtk.PositionType.BOTTOM, _("None"));
        pinnedAppsSeparatorScale.set_value(this._settings.get_int('unity-separator-index'));
        pinnedAppsSeparatorScale.connect('value-changed', (widget) => {
            this._settings.set_int('unity-separator-index', widget.get_value());
        }); 
        
        let infoButton = new PW.Button({
            icon_name: 'info-circle-symbolic'
        });
        infoButton.connect('clicked', ()=> {
            let dialog = new PW.MessageDialog({
                text: _('Adjust the position of the separator in the button panel'),
                buttons: Gtk.ButtonsType.OK,
                transient_for: this.get_toplevel()
            });
            dialog.connect ('response', ()=> dialog.destroy());
            dialog.show_all();
        });

        pinnedAppsSeparatorRow.add(pinnedAppsSeparatorLabel);
        pinnedAppsSeparatorRow.add(pinnedAppsSeparatorScale);
        pinnedAppsSeparatorRow.add(infoButton);
        pinnedAppsSeparatorFrame.add(pinnedAppsSeparatorRow);
        this.mainBox.add(pinnedAppsSeparatorFrame);
    }
    _loadRavenTweaks(){
        let generalTweaksFrame = new PW.FrameBox();
        let homeScreenRow = new PW.FrameBoxRow();
        let homeScreenLabel = new Gtk.Label({
            label: _('Default Screen'),
            xalign:0,
            hexpand: true,
        });   
        let homeScreenCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
        homeScreenCombo.append_text(_("Home Screen"));
        homeScreenCombo.append_text(_("All Programs"));
        let homeScreen = this._settings.get_boolean('enable-unity-homescreen');
        homeScreenCombo.set_active(homeScreen ? 0 : 1);
        homeScreenCombo.connect('changed', (widget) => {
            let enable =  widget.get_active() ==0 ? true : false;
            this._settings.set_boolean('enable-unity-homescreen', enable);
        });
        homeScreenRow.add(homeScreenLabel);
        homeScreenRow.add(homeScreenCombo);
        generalTweaksFrame.add(homeScreenRow);
        this.mainBox.add(generalTweaksFrame);

        let widgetFrame =  this._createWidgetsRows(Constants.MenuLayout.RAVEN);
        this.mainBox.add(widgetFrame);
    }
    _loadMintMenuTweaks(){
        let mintMenuTweaksFrame = new PW.FrameBox();
        mintMenuTweaksFrame.add(this._createActivateOnHoverRow());
        mintMenuTweaksFrame.add(this._createSearchBarLocationRow());
        mintMenuTweaksFrame.add(this._createFlipHorizontalRow());
        this.mainBox.add(mintMenuTweaksFrame);

        let pinnedAppsHeaderLabel = new Gtk.Label({
            label: "<b>" + _("Mint Layout Shortcuts") + "</b>",
            use_markup: true,
            xalign: 0
        });
        this.mainBox.add(pinnedAppsHeaderLabel);

        let pinnedAppsFrame = new PW.FrameBox();
        let pinnedAppsScrollWindow = new Gtk.ScrolledWindow();
        pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        pinnedAppsScrollWindow.set_min_content_height(400);
        let savePinnedAppsButton = new Gtk.Button({
            label: _("Save"),
        });
        savePinnedAppsButton.connect('clicked', ()=> {
            let array = [];
            for(let x = 0;x < pinnedAppsFrame.count; x++) {
                array.push(pinnedAppsFrame.get_index(x)._name);
                array.push(pinnedAppsFrame.get_index(x)._icon);
                array.push(pinnedAppsFrame.get_index(x)._cmd);
            }
            this._settings.set_strv('mint-pinned-app-list',array);
            savePinnedAppsButton.set_sensitive(false);
        }); 
        savePinnedAppsButton.set_halign(Gtk.Align.END);
        savePinnedAppsButton.set_sensitive(false);
        
        this._loadPinnedApps(this._settings.get_strv('mint-pinned-app-list'), pinnedAppsFrame, savePinnedAppsButton, pinnedAppsScrollWindow);
        pinnedAppsScrollWindow.add_with_viewport(pinnedAppsFrame);
        this.mainBox.add(pinnedAppsScrollWindow);

        this.mainBox.add(savePinnedAppsButton);

        let pinnedAppsSeparatorHeaderLabel = new Gtk.Label({
            label: "<b>" + _("Shortcut Separator Position") + "</b>",
            use_markup: true,
            xalign: 0
        });
        this.mainBox.add(pinnedAppsSeparatorHeaderLabel);

        let pinnedAppsSeparatorFrame = new PW.FrameBox();
        let pinnedAppsSeparatorRow = new PW.FrameBoxRow();
        let pinnedAppsSeparatorLabel = new Gtk.Label({
            label: _("Separator Position"),
            use_markup: true,
            xalign: 0
        });
        let pinnedAppsSeparatorScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL, 
            adjustment: new Gtk.Adjustment({lower: 0, upper: 7, step_increment: 1, page_increment: 1, page_size: 0}),
            digits: 0, round_digits: 0, hexpand: true,
            draw_value: true,
        });
        pinnedAppsSeparatorScale.add_mark(0, Gtk.PositionType.BOTTOM, _("None"));
        pinnedAppsSeparatorScale.set_value(this._settings.get_int('mint-separator-index'));
        pinnedAppsSeparatorScale.connect('value-changed', (widget) => {
            this._settings.set_int('mint-separator-index', widget.get_value());
        }); 

        let infoButton = new PW.Button({
            icon_name: 'info-circle-symbolic'
        });
        infoButton.connect('clicked', ()=> {
            let dialog = new PW.MessageDialog({
                text: _('Adjust the position of the separator in the button panel'),
                buttons: Gtk.ButtonsType.OK,
                transient_for: this.get_toplevel()
            });
            dialog.connect ('response', ()=> dialog.destroy());
            dialog.show_all();
        });

        pinnedAppsSeparatorRow.add(pinnedAppsSeparatorLabel);
        pinnedAppsSeparatorRow.add(pinnedAppsSeparatorScale);
        pinnedAppsSeparatorRow.add(infoButton);
        pinnedAppsSeparatorFrame.add(pinnedAppsSeparatorRow);
        this.mainBox.add(pinnedAppsSeparatorFrame);
    }
    _loadPinnedApps(array,frame, savePinnedAppsButton, scrollWindow) {
        for(let i = 0; i < array.length; i += 3) {
            let frameRow = new PW.FrameBoxDragRow(scrollWindow);
            frameRow._name = array[i];
            frameRow._icon = Prefs.getIconPath([array[i], array[i+1], array[i+2]]);
            frameRow._cmd = array[i+2];
            frameRow.saveButton = savePinnedAppsButton;
            frameRow.hasEditButton = true;
            let iconString;
            if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd)){
                iconString = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon() ? Gio.DesktopAppInfo.new(frameRow._cmd).get_icon().to_string() : "";
            }
            frameRow._gicon = Gio.icon_new_for_string(iconString ? iconString : frameRow._icon);
            let arcMenuImage = new Gtk.Image( {
                gicon: frameRow._gicon,
                pixel_size: 22
            });
            
            let arcMenuImageBox = new Gtk.Box({
                margin_start: 0,
                hexpand: false,
                vexpand: false,
                spacing: 5,
            });
            let dragImage = new Gtk.Image( {
                gicon: Gio.icon_new_for_string("drag-symbolic"),
                pixel_size: 12
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
            frameRow.add(frameLabel);

            Prefs.checkIfValidShortcut(frameRow, frameLabel, arcMenuImage);

            let buttonBox = new PW.EditEntriesBox({
                frameRow: frameRow, 
                frame: frame, 
                buttons: [savePinnedAppsButton],
                modifyButton: true,
                changeButton: true
            });

            buttonBox.connect('change', ()=> {
                let dialog = new Prefs.AddAppsToPinnedListWindow(this._settings, this, Constants.DiaglogType.OTHER);
                dialog.show_all();
                dialog.connect('response', ()=> { 
                    if(dialog.get_response()) {
                        let newPinnedApps = dialog.get_newPinnedAppsArray();
                        frameRow._name = newPinnedApps[0];
                        frameRow._icon = newPinnedApps[1];
                        frameRow._cmd = newPinnedApps[2];
                        frameLabel.label = _(frameRow._name);
                        let iconString;
                        if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd)){
                            iconString = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon() ? Gio.DesktopAppInfo.new(frameRow._cmd).get_icon().to_string() : "";
                        }
                        let icon = Prefs.getIconPath(newPinnedApps);
                        arcMenuImage.gicon = Gio.icon_new_for_string(iconString ? iconString : icon);
                        dialog.destroy();
                        frame.show_all();
                        savePinnedAppsButton.set_sensitive(true);
                    }
                    else
                        dialog.destroy();
                }); 
            });

            buttonBox.connect('modify', ()=> {
                let appArray = [frameRow._name,frameRow._icon,frameRow._cmd];
                let dialog = new Prefs.AddCustomLinkDialogWindow(this._settings, this, Constants.DiaglogType.OTHER, true, appArray);
                dialog.show_all();
                dialog.connect('response', ()=> { 
                    if(dialog.get_response()) {
                        let newPinnedApps = dialog.get_newPinnedAppsArray();
                        frameRow._name = newPinnedApps[0];
                        frameRow._icon = newPinnedApps[1];
                        frameRow._cmd = newPinnedApps[2];
                        frameLabel.label = _(frameRow._name);
                        let iconString;
                        if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd)){
                            iconString = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon() ? Gio.DesktopAppInfo.new(frameRow._cmd).get_icon().to_string() : "";
                        }
                        arcMenuImage.gicon = Gio.icon_new_for_string(iconString ? iconString : frameRow._icon);
                        dialog.destroy();
                        frame.show_all();
                        savePinnedAppsButton.set_sensitive(true);
                    }
                    else
                        dialog.destroy();
                });  
            });

            frameRow.add(buttonBox);
            frame.add(frameRow);
        }
    }
    _loadWhiskerMenuTweaks(){
        let whiskerMenuTweaksFrame = new PW.FrameBox();
        whiskerMenuTweaksFrame.add(this._createActivateOnHoverRow());
        whiskerMenuTweaksFrame.add(this._createAvatarShapeRow());
        whiskerMenuTweaksFrame.add(this._createSearchBarLocationRow());
        whiskerMenuTweaksFrame.add(this._createFlipHorizontalRow());
        this.mainBox.add(whiskerMenuTweaksFrame);
    }
    _loadRedmondMenuTweaks(){
        let redmondMenuTweaksFrame = new PW.FrameBox();
        redmondMenuTweaksFrame.add(this._createSearchBarLocationRow());

        redmondMenuTweaksFrame.add(this._createFlipHorizontalRow());
        redmondMenuTweaksFrame.add(this._createAvatarShapeRow());
        redmondMenuTweaksFrame.add(this._disableAvatarRow());

        let placesFrame = new PW.FrameBox();
        let externalDeviceRow = new PW.FrameBoxRow();
        let externalDeviceLabel = new Gtk.Label({
            label: _("External Devices"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let externalDeviceButton = new Gtk.Switch({tooltip_text:_("Show all connected external devices in ArcMenu")});
        if(this._settings.get_boolean('show-external-devices'))
            externalDeviceButton.set_active(true);
        externalDeviceButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-external-devices', widget.get_active());
        });   
        externalDeviceRow.add(externalDeviceLabel);
        externalDeviceRow.add(externalDeviceButton);

        placesFrame.add(externalDeviceRow);
                
        let bookmarksRow = new PW.FrameBoxRow();
        let bookmarksLabel = new Gtk.Label({
            label: _("Bookmarks"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let bookmarksButton = new Gtk.Switch({tooltip_text:_("Show all Nautilus bookmarks in ArcMenu")});
        if(this._settings.get_boolean('show-bookmarks'))
            bookmarksButton.set_active(true);
        bookmarksButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-bookmarks', widget.get_active());
        });   
        bookmarksRow.add(bookmarksLabel);
        bookmarksRow.add(bookmarksButton);

        placesFrame.add(bookmarksRow); 
        this.mainBox.add(redmondMenuTweaksFrame);  
        this.mainBox.add(new Gtk.Label({
            label: "<b>" + _("Extra Shortcuts") + "</b>",
            use_markup: true,
            xalign: 0,
            hexpand: true
        }));
        this.mainBox.add(placesFrame);

    }
    _loadInsiderMenuTweaks(){
        let insiderMenuTweaksFrame = new PW.FrameBox();
        insiderMenuTweaksFrame.add(this._createAvatarShapeRow());
        this.mainBox.add(insiderMenuTweaksFrame);
    }
    _loadGnomeMenuTweaks(){
        let gnomeMenuTweaksFrame = new PW.FrameBox();
        gnomeMenuTweaksFrame.add(this._createActivateOnHoverRow());
        gnomeMenuTweaksFrame.add(this._createFlipHorizontalRow());
        this.mainBox.add(gnomeMenuTweaksFrame);
    }
    _loadPlaceHolderTweaks(){
        let placeHolderFrame = new PW.FrameBox();
        let placeHolderRow = new PW.FrameBoxRow();
        let placeHolderLabel = new Gtk.Label({
            label: _("Nothing Yet!"),
            use_markup: true,
            halign: Gtk.Align.CENTER,
            hexpand: true
        });
        placeHolderRow.add(placeHolderLabel);
        placeHolderFrame.add(placeHolderRow);
        this.mainBox.add(placeHolderFrame);
    }
    _loadTogneeMenuTweaks(){
        let togneeMenuTweaksFrame = new PW.FrameBox();
        let searchBarBottomDefault = true;
        let defaultLeftBoxRow = new PW.FrameBoxRow();
        let defaultLeftBoxLabel = new Gtk.Label({
            label: _("Default Screen"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let defaultLeftBoxCombo = new Gtk.ComboBoxText({ 
            halign: Gtk.Align.END,
            tooltip_text: _("Choose the default screen for tognee Layout") 
        });
        defaultLeftBoxCombo.append_text(_("Categories List"));
        defaultLeftBoxCombo.append_text(_("All Programs"));
        defaultLeftBoxCombo.set_active(this._settings.get_enum('default-menu-view-tognee'));
        defaultLeftBoxCombo.connect('changed', (widget) => {
            this._settings.set_enum('default-menu-view-tognee', widget.get_active());
        });

        defaultLeftBoxRow.add(defaultLeftBoxLabel);
        defaultLeftBoxRow.add(defaultLeftBoxCombo);
        togneeMenuTweaksFrame.add(defaultLeftBoxRow);
        togneeMenuTweaksFrame.add(this._createSearchBarLocationRow(searchBarBottomDefault));
        togneeMenuTweaksFrame.add(this._createFlipHorizontalRow());
        this.mainBox.add(togneeMenuTweaksFrame);
    }
    _loadArcMenuTweaks(){
        let arcMenuTweaksFrame = new PW.FrameBox();
        let defaultLeftBoxRow = new PW.FrameBoxRow();
        let defaultLeftBoxLabel = new Gtk.Label({
            label: _("Default Screen"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let defaultLeftBoxCombo = new Gtk.ComboBoxText({ 
            halign: Gtk.Align.END,
            tooltip_text: _("Choose the default screen for ArcMenu") 
        });
        defaultLeftBoxCombo.append_text(_("Pinned Apps"));
        defaultLeftBoxCombo.append_text(_("Categories List"));
        defaultLeftBoxCombo.append_text(_("Frequent Apps"));
        defaultLeftBoxCombo.set_active(this._settings.get_enum('default-menu-view'));
        defaultLeftBoxCombo.connect('changed', (widget) => {
            this._settings.set_enum('default-menu-view', widget.get_active());
        });

        defaultLeftBoxRow.add(defaultLeftBoxLabel);
        defaultLeftBoxRow.add(defaultLeftBoxCombo);
        arcMenuTweaksFrame.add(defaultLeftBoxRow);

        let searchBarBottomDefault = true;
        arcMenuTweaksFrame.add(this._createSearchBarLocationRow(searchBarBottomDefault));
        arcMenuTweaksFrame.add(this._createFlipHorizontalRow());
        arcMenuTweaksFrame.add(this._createAvatarShapeRow());
        arcMenuTweaksFrame.add(this._disableAvatarRow());

        let placesFrame = new PW.FrameBox();
        let externalDeviceRow = new PW.FrameBoxRow();
        let externalDeviceLabel = new Gtk.Label({
            label: _("External Devices"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let externalDeviceButton = new Gtk.Switch({tooltip_text:_("Show all connected external devices in ArcMenu")});
        if(this._settings.get_boolean('show-external-devices'))
            externalDeviceButton.set_active(true);
        externalDeviceButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-external-devices', widget.get_active());
        });   
        externalDeviceRow.add(externalDeviceLabel);
        externalDeviceRow.add(externalDeviceButton);

        placesFrame.add(externalDeviceRow);
                
        let bookmarksRow = new PW.FrameBoxRow();
        let bookmarksLabel = new Gtk.Label({
            label: _("Bookmarks"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        
        let bookmarksButton = new Gtk.Switch({tooltip_text:_("Show all Nautilus bookmarks in ArcMenu")});
        if(this._settings.get_boolean('show-bookmarks'))
            bookmarksButton.set_active(true);
        bookmarksButton.connect('notify::active', (widget) => {
            this._settings.set_boolean('show-bookmarks', widget.get_active());
        });   
        bookmarksRow.add(bookmarksLabel);
        bookmarksRow.add(bookmarksButton);

        placesFrame.add(bookmarksRow);   
        this.mainBox.add(arcMenuTweaksFrame);
        this.mainBox.add(new Gtk.Label({
            label: "<b>" + _("Extra Shortcuts") + "</b>",
            use_markup: true,
            xalign: 0,
            hexpand: true
        }));
        this.mainBox.add(placesFrame);
    }
    _createWidgetsRows(layout){
        let weatherWidgetSetting = 'enable-weather-widget-raven';
        let clockWidgetSetting = 'enable-clock-widget-raven';
        if(layout == Constants.MenuLayout.RAVEN){
            weatherWidgetSetting = 'enable-weather-widget-raven';
            clockWidgetSetting = 'enable-clock-widget-raven';
        }
        else{
            weatherWidgetSetting = 'enable-weather-widget-unity';
            clockWidgetSetting = 'enable-clock-widget-unity';
        }
        
        let widgetFrame = new PW.FrameBox();
        let weatherWidgetRow = new PW.FrameBoxRow();
        let weatherWidgetLabel = new Gtk.Label({
            label: _("Enable Weather Widget"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });

        let weatherWidgetSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        weatherWidgetSwitch.set_active(this._settings.get_boolean(weatherWidgetSetting));
        weatherWidgetSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean(weatherWidgetSetting, widget.get_active());
        });

        weatherWidgetRow.add(weatherWidgetLabel);
        weatherWidgetRow.add(weatherWidgetSwitch);
        widgetFrame.add(weatherWidgetRow);

        let clockWidgetRow = new PW.FrameBoxRow();
        let clockWidgetLabel = new Gtk.Label({
            label: _("Enable Clock Widget"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });

        let clockWidgetSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        clockWidgetSwitch.set_active(this._settings.get_boolean(clockWidgetSetting));
        clockWidgetSwitch.connect('notify::active', (widget) => {
            this._settings.set_boolean(clockWidgetSetting, widget.get_active());
        });

        clockWidgetRow.add(clockWidgetLabel);
        clockWidgetRow.add(clockWidgetSwitch);
        widgetFrame.add(clockWidgetRow);

        return widgetFrame;
    }
});
