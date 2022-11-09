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
 * 
 * Credits: This file leverages the work from GNOME Shell search.js file 
 * (https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/master/js/ui/search.js)
 */

const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Clutter, Gio, GLib, GObject, Shell, St } = imports.gi;
const AppDisplay = imports.ui.appDisplay;
const appSys = Shell.AppSystem.get_default();
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const PopupMenu = imports.ui.popupMenu;
const RemoteSearch = imports.ui.remoteSearch;
const Signals = imports.signals;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

const SEARCH_PROVIDERS_SCHEMA = 'org.gnome.desktop.search-providers';

var MAX_LIST_SEARCH_RESULTS_ROWS = 6;
var MAX_APPS_SEARCH_RESULTS_ROWS = 6;

var LARGE_ICON_SIZE = 36;
var MEDIUM_ICON_SIZE = 25;
var SMALL_ICON_SIZE = 16;

var ListSearchResult = GObject.registerClass(class Arc_Menu_ListSearchResult extends MW.ApplicationMenuItem{
    _init(provider, metaInfo, resultsView) {
        let menulayout = resultsView._menuLayout;
        let app = appSys.lookup_app(metaInfo['id']);

        super._init(menulayout, app, Constants.AppDisplayType.SEARCH, metaInfo)

        this.app = app;
        let layoutProperties = this._menuLayout.layoutProperties;
        this.searchType = layoutProperties.SearchType;
        this.metaInfo = metaInfo;
        this.provider = provider;
        this._settings = this._menuLayout._settings;
        this.resultsView = resultsView;
        this.layout = this._settings.get_enum('menu-layout');

        if(this.provider.id === 'org.gnome.Nautilus.desktop')
            this._path = this.metaInfo['description'];

        if(this.searchType === Constants.AppDisplayType.GRID)
            this.style = "border-radius: 4px;";

        let showSearchResultDescriptions = this._settings.get_boolean("show-search-result-details");
        if (this.metaInfo['description'] && showSearchResultDescriptions) {
            this._termsChangedId = this.resultsView.connect('terms-changed', this._highlightTerms.bind(this));
            this._highlightTerms();
        }

        if(!this.app && this.metaInfo['description'])
            this.description = this.metaInfo['description'].split('\n')[0];

        this.connect('destroy', this._onDestroy.bind(this));
    }

    _highlightTerms() {
        let markup = this.resultsView.highlightTerms(this.metaInfo['description'].split('\n')[0]);
        this.descriptionLabel.clutter_text.set_markup(markup);
    }

    _onDestroy() {
        if (this._termsChangedId)
            this.resultsView.disconnect(this._termsChangedId);
        this._termsChangedId = null;
    }
});

var AppSearchResult = GObject.registerClass(class Arc_Menu_AppSearchResult extends MW.ApplicationMenuItem{
    _init(provider, metaInfo, resultsView) {
        this.provider = provider;
        this.metaInfo = metaInfo;
        this.resultsView = resultsView;
        let menulayout = resultsView._menuLayout;
        let app = appSys.lookup_app(metaInfo['id']) || appSys.lookup_app(provider.id);
        let searchType = menulayout.layoutProperties.SearchType;
        super._init(menulayout, app, searchType, metaInfo)
        this.app = app;
        this.metaInfo = metaInfo;

        if(!this.app && this.metaInfo['description'])
            this.description = this.metaInfo['description'].split('\n')[0];
    }
});

var SearchResultsBase = class Arc_Menu_SearchResultsBase{
    constructor(provider, resultsView) {
        this.provider = provider;
        this.resultsView = resultsView;
        this._menuLayout = resultsView._menuLayout;
        this._terms = [];

        this.actor = new St.BoxLayout({ 
            vertical: true 
        });

        this._resultDisplayBin = new St.Bin({
            x_expand: true,
            y_expand: true
        });

        this.actor.add(this._resultDisplayBin);

        this._resultDisplays = {};
        this._clipboard = St.Clipboard.get_default();

        this._cancellable = new Gio.Cancellable();
        this.actor.connect('destroy', this._onDestroy.bind(this));
    }

    _onDestroy() {
        this._terms = [];
    }

    _createResultDisplay(meta) {
        if (this.provider.createResultObject)
            return this.provider.createResultObject(meta, this.resultsView);
        
        return null;
    }

    clear() {
        this._cancellable.cancel();
        for (let resultId in this._resultDisplays)
            this._resultDisplays[resultId].destroy();
        this._resultDisplays = {};
        this._clearResultDisplay();
        this.actor.hide();
    }

    _setMoreCount(count) {
    }

    _ensureResultActors(results, callback) {
        let metasNeeded = results.filter(
            resultId => this._resultDisplays[resultId] === undefined
        );

        if (metasNeeded.length === 0) {
            callback(true);
        } else {
            this._cancellable.cancel();
            this._cancellable.reset();

            this.provider.getResultMetas(metasNeeded, metas => {
                if (this._cancellable.is_cancelled()) {
                    if (metas.length > 0)
                        log(`Search provider ${this.provider.id} returned results after the request was canceled`);
                    callback(false);
                    return;
                }
                if (metas.length != metasNeeded.length) {
                    log('Wrong number of result metas returned by search provider ' + this.provider.id +
                        ': expected ' + metasNeeded.length + ' but got ' + metas.length);
                    callback(false);
                    return;
                }
                if (metas.some(meta => !meta.name || !meta.id)) {
                    log('Invalid result meta returned from search provider ' + this.provider.id);
                    callback(false);
                    return;
                }

                metasNeeded.forEach((resultId, i) => {
                    let meta = metas[i];                    
                    let display = this._createResultDisplay(meta);
                    this._resultDisplays[resultId] = display;
                });
                callback(true);
            }, this._cancellable);
        }
    }

    updateSearch(providerResults, terms, callback) {
        this._terms = terms;
        if (providerResults.length == 0) {
            this._clearResultDisplay();
            this.actor.hide();
            callback();
        } else {
            let maxResults = this._getMaxDisplayedResults();
            let results = this.provider.filterResults(providerResults, maxResults);
            let moreCount = Math.max(providerResults.length - results.length, 0);

            this._ensureResultActors(results, successful => {
                if (!successful) {
                    this._clearResultDisplay();
                    callback();
                    return;
                }

                // To avoid CSS transitions causing flickering when
                // the first search result stays the same, we hide the
                // content while filling in the results.
                this.actor.hide();
                this._clearResultDisplay();
                results.forEach(resultId => {
                    this._addItem(this._resultDisplays[resultId]);
                });
               
                this._setMoreCount(this.provider.canLaunchSearch ? moreCount : 0);
                this.actor.show();
                callback();
            });
        }
    }
};

var ListSearchResults = class Arc_Menu_ListSearchResults extends SearchResultsBase {
    constructor(provider, resultsView) {
        super(provider, resultsView);
        this._menuLayout = resultsView._menuLayout;
        this.searchType = this._menuLayout.layoutProperties.SearchType;
        this._settings = this._menuLayout._settings;
        this.layout = this._settings.get_enum('menu-layout');

        this._container = new St.BoxLayout({
            vertical: this.searchType === Constants.AppDisplayType.GRID ? false : true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            x_expand: true,
            y_expand: true,
        });

        this.providerInfo = new ArcSearchProviderInfo(provider, this._menuLayout);
        this.providerInfo.connect('activate', () => {
            provider.launchSearch(this._terms);
            this._menuLayout.arcMenu.toggle();
        });

        this._container.add(this.providerInfo.actor);

        this._content = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL
        });

        if(this.searchType === Constants.AppDisplayType.GRID){
            if(this.layout == Constants.MenuLayout.RAVEN)
                this._container.vertical = true;
            else{
                this._content.style = "spacing: 6px;"
                this._container.style = "padding: 10px 0px; spacing: 6px; margin: 0px 5px;";
            } 
        }

        this._container.add(this._content);
        this._resultDisplayBin.set_child(this._container);
    }

    _setMoreCount(count) {
        this.providerInfo.setMoreCount(count);
    }

    _getMaxDisplayedResults() {
        return MAX_LIST_SEARCH_RESULTS_ROWS;
    }

    _clearResultDisplay() {
        this._content.remove_all_children();
    }

    _createResultDisplay(meta) {
        return super._createResultDisplay(meta, this.resultsView) ||
               new ListSearchResult(this.provider, meta, this.resultsView);
    }
    _addItem(display) {
        this._content.add_actor(display);
    }

    getFirstResult() {
        if (this._content.get_n_children() > 0)
            return this._content.get_child_at_index(0)._delegate;
        else
            return null;
    }
    destroy(){
        this._resultDisplayBin.destroy();
        this._resultDisplayBin = null;
    }
};
Signals.addSignalMethods(ListSearchResults.prototype);
var AppSearchResults = class Arc_Menu_AppSearchResults extends SearchResultsBase {
      constructor(provider, resultsView) {
        super(provider, resultsView);
        this._parentContainer = resultsView.actor;
        this._menuLayout = resultsView._menuLayout;
        this.searchType = this._menuLayout.layoutProperties.SearchType;
        this.layout = this._menuLayout._settings.get_enum('menu-layout');

        this._grid = new St.BoxLayout({
            vertical: this.searchType === Constants.AppDisplayType.GRID ? false : true 
        });

        if(this.searchType === Constants.AppDisplayType.GRID){
            let spacing;
            if(this.layout === Constants.MenuLayout.ELEMENTARY || this.layout === Constants.MenuLayout.UNITY)
                spacing = 15;
            else 
                spacing = 10;
            this._grid.style = "padding: 0px 10px 10px 10px; spacing: " + spacing + "px;";   
            this._resultDisplayBin.x_align = Clutter.ActorAlign.CENTER;
        }
            
        this._resultDisplayBin.set_child(this._grid);
    }

    _getMaxDisplayedResults() {
         return MAX_APPS_SEARCH_RESULTS_ROWS;
    }

    _clearResultDisplay() {
        this._grid.remove_all_children();
    }
    
    _createResultDisplay(meta) {
        return new AppSearchResult(this.provider, meta, this.resultsView);
    }

    _addItem(display) {
        this._grid.add_actor(display);
    }

    getFirstResult() {
        if (this._grid.get_n_children() > 0)
            return this._grid.get_child_at_index(0)._delegate;
        else
            return null;
    }
    destroy(){
        this._resultDisplayBin.destroy();
        this._resultDisplayBin = null;
    }
};
Signals.addSignalMethods(AppSearchResults.prototype);

var SearchResults = class Arc_Menu_SearchResults {
    constructor(menuLayout) {
        this._menuLayout = menuLayout;
        let layoutProperties = this._menuLayout.layoutProperties;
        this.searchType = this._menuLayout.layoutProperties.SearchType;
        this.layout = this._menuLayout._settings.get_enum('menu-layout');

        this.actor = new St.BoxLayout({ 
            vertical: true,
            y_expand: this.searchType === Constants.AppDisplayType.GRID ? false : true,
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL  

        });
        this.actor._delegate = this.actor;

        this._content = new St.BoxLayout({
            vertical: true,
            x_align: Clutter.ActorAlign.FILL  
        });
 
        this.actor.add(this._content);
       
        if(this.searchType === Constants.AppDisplayType.GRID)
            MAX_APPS_SEARCH_RESULTS_ROWS = layoutProperties.GridColumns;

        this._statusText = new St.Label();
        this._statusBin = new St.Bin({ 
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true  
        });

        if(menuLayout._settings.get_boolean('enable-custom-arc-menu'))
            this._statusText.style_class = 'arc-menu-status-text';
        else
            this._statusText.style_class = '';
        
        this.actor.add(this._statusBin);
        this._statusBin.add_actor(this._statusText);

        this._highlightDefault = false;
        this._defaultResult = null;
        this._startingSearch = false;

        this._terms = [];
        this._results = {};

        this._providers = [];

        this._highlightRegex = null;

        this._searchSettings = new Gio.Settings({ schema_id: SEARCH_PROVIDERS_SCHEMA });
        this.disabledID = this._searchSettings.connect('changed::disabled', this._reloadRemoteProviders.bind(this));
        this.enabledID =  this._searchSettings.connect('changed::enabled', this._reloadRemoteProviders.bind(this));
        this.disablExternalID = this._searchSettings.connect('changed::disable-external', this._reloadRemoteProviders.bind(this));
        this.sortOrderID = this._searchSettings.connect('changed::sort-order', this._reloadRemoteProviders.bind(this));

        this._searchTimeoutId = 0;
        this._cancellable = new Gio.Cancellable();

        this._registerProvider(new AppDisplay.AppSearchProvider());

        this.installChangedID = appSys.connect('installed-changed', this._reloadRemoteProviders.bind(this));

        this._reloadRemoteProviders();
    }
    
    get terms() {
        return this._terms;
    }

    setMaxDisplayedResults(rows) {
        MAX_APPS_SEARCH_RESULTS_ROWS = rows;
    }

    setStyle(style){
        if(this._statusText){
            this._statusText.style_class = style;
        }
            
    }
    destroy(){
        if (this._searchTimeoutId > 0) {
            GLib.source_remove(this._searchTimeoutId);
            this._searchTimeoutId = 0;
        }
        if(this.disabledID>0){
            this._searchSettings.disconnect(this.disabledID);
            this.disabledID=0;
        }
        if(this.enabledID>0){
            this._searchSettings.disconnect(this.enabledID);
            this.enabledID=0;
        }
        if(this.disablExternalID>0){
            this._searchSettings.disconnect(this.disablExternalID);
            this.disablExternalID=0;
        }
        if(this.sortOrderID>0){
            this._searchSettings.disconnect(this.sortOrderID);
            this.sortOrderID=0;
        }
        if(this.installChangedID>0){
            appSys.disconnect(this.installChangedID);
            this.installChangedID=0;
        }     
        this._providers.forEach(provider => {
            provider.display.clear();
            provider.display.destroy();
        });
        this.actor.destroy();
    }
    _reloadRemoteProviders() {
        this._oldProviders = null;
        let remoteProviders = this._providers.filter(p => p.isRemoteProvider);
        remoteProviders.forEach(provider => {
            this._unregisterProvider(provider);
        });

        RemoteSearch.loadRemoteSearchProviders(this._searchSettings, providers => {
            providers.forEach(this._registerProvider.bind(this));
        });
    }

    _registerProvider(provider) {
        provider.searchInProgress = false;
        this._providers.push(provider);
        this._ensureProviderDisplay(provider);
    }

    _unregisterProvider(provider) {
        let index = this._providers.indexOf(provider);
        this._providers.splice(index, 1);

        if (provider.display){
            provider.display.actor.destroy();
        }
    }

    _gotResults(results, provider) {
        this._results[provider.id] = results;
        this._updateResults(provider, results);
    }

    _clearSearchTimeout() {
        if (this._searchTimeoutId > 0) {
            GLib.source_remove(this._searchTimeoutId);
            this._searchTimeoutId = 0;
        }
    }

    _reset() {
        this._terms = [];
        this._results = {};
        this._clearDisplay();
        this._clearSearchTimeout();
        this._defaultResult = null;
        this._startingSearch = false;

        this._updateSearchProgress();
    }

    _doSearch() {
        this._startingSearch = false;

        let previousResults = this._results;
        this._results = {};

        this._providers.forEach(provider => {
            provider.searchInProgress = true;

            let previousProviderResults = previousResults[provider.id];
            if (this._isSubSearch && previousProviderResults)
                provider.getSubsearchResultSet(previousProviderResults,
                                               this._terms,
                                               results => {
                                                   this._gotResults(results, provider);
                                               },
                                               this._cancellable);
            else
                provider.getInitialResultSet(this._terms,
                                             results => {
                                                 this._gotResults(results, provider);
                                             },
                                             this._cancellable);
        });

        this._updateSearchProgress();

        this._clearSearchTimeout();
    }

    _onSearchTimeout() {
        this._searchTimeoutId = 0;
        this._doSearch();
        return GLib.SOURCE_REMOVE;
    }

    setTerms(terms) {
        // Check for the case of making a duplicate previous search before
        // setting state of the current search or cancelling the search.
        // This will prevent incorrect state being as a result of a duplicate
        // search while the previous search is still active.
        let searchString = terms.join(' ');
        let previousSearchString = this._terms.join(' ');
        if (searchString == previousSearchString)
            return;

        this._startingSearch = true;

        this._cancellable.cancel();
        this._cancellable.reset();

        if (terms.length == 0) {
            this._reset();
            return;
        }

        let isSubSearch = false;
        if (this._terms.length > 0)
            isSubSearch = searchString.indexOf(previousSearchString) == 0;

        this._terms = terms;
        this._isSubSearch = isSubSearch;
        this._updateSearchProgress();

        if (this._searchTimeoutId == 0)
            this._searchTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, this._onSearchTimeout.bind(this));

        let escapedTerms = this._terms.map(term => Shell.util_regex_escape(term));
        this._highlightRegex = new RegExp('(%s)'.format(escapedTerms.join('|')), 'gi');
        this.emit('terms-changed');
    }

    _ensureProviderDisplay(provider) {
        if (provider.display)
            return;

        let providerDisplay;
        if (provider.appInfo)
            providerDisplay = new ListSearchResults(provider, this);
        else
            providerDisplay = new AppSearchResults(provider, this);
        providerDisplay.actor.hide();
        this._content.add(providerDisplay.actor);
        provider.display = providerDisplay;
    }

    _clearDisplay() {
        this._providers.forEach(provider => {
            provider.display.clear();
        });
    }

    _maybeSetInitialSelection() {
        let newDefaultResult = null;

        let providers = this._providers;
        for (let i = 0; i < providers.length; i++) {
            let provider = providers[i];
            let display = provider.display;

            if (!display.actor.visible)
                continue;

            let firstResult = display.getFirstResult();
            if (firstResult) {
                newDefaultResult = firstResult;
                break; // select this one!
            }
        }

        if (newDefaultResult != this._defaultResult) {
            this._setSelected(this._defaultResult, false);
            this._setSelected(newDefaultResult, this._highlightDefault);

            this._defaultResult = newDefaultResult;
        }
    }

    get searchInProgress() {
        if (this._startingSearch)
            return true;

        return this._providers.some(p => p.searchInProgress);
    }

    _updateSearchProgress() {
        let haveResults = this._providers.some(provider => {
            let display = provider.display;
            return (display.getFirstResult() != null);
        });

        this._statusBin.visible = !haveResults;
        this.emit("terms-changed")
        if (!haveResults) {
            if (this.searchInProgress) {
                this._statusText.set_text(_("Searching..."));
            } else {
                this._statusText.set_text(_("No results."));
            }
            this.emit("no-results")
        }
    }

    _updateResults(provider, results) {
        let terms = this._terms;
        let display = provider.display;
        display.updateSearch(results, terms, () => {
            provider.searchInProgress = false;

            this._maybeSetInitialSelection();
            this._updateSearchProgress();
        });
    }

    highlightDefault(highlight) {
        this._highlightDefault = highlight;
        this._setSelected(this._defaultResult, highlight);
    }

    getTopResult(){
        return this._defaultResult;
    }
    
    getProviders(){
        return this._providers;
    }

    setProvider(providerID){
        if(!this._oldProviders)
            this._oldProviders = this._providers;
        this._clearDisplay();
        this._providers = this._oldProviders;
        if(providerID === Constants.CategoryType.ALL_PROGRAMS){
            this._providers = this._providers.filter(p => (p.appInfo ? false : true));
        }
        else if(providerID !== Constants.CategoryType.SEARCH_RESULTS){
            this._providers = this._providers.filter(p => (p.appInfo ? p.appInfo.get_id() : p) === providerID);
        }
    }

    _setSelected(result, selected) {
        if (!result || result === undefined || result === null)
            return;
        if (selected) {
            this._menuLayout.activeMenuItem = result;
            result.add_style_pseudo_class('active');
        } else {
            result.remove_style_pseudo_class('active');
        }
    }

    hasActiveResult(){
        return (this._defaultResult ? true : false) && this._highlightDefault;
    }

    highlightTerms(description) {
        if (!description)
            return '';

        if (!this._highlightRegex)
            return description;

        return description.replace(this._highlightRegex, '<b>$1</b>');
    }
};
Signals.addSignalMethods(SearchResults.prototype);

var ArcSearchProviderInfo = GObject.registerClass(class Arc_Menu_ArcSearchProviderInfo extends MW.ArcMenuPopupBaseMenuItem{
    _init(provider, menuLayout) {
        super._init(menuLayout);
        this.provider = provider;
        this._menuLayout = menuLayout;
        this.searchType = this._menuLayout.layoutProperties.SearchType;
        this.layout = this._menuLayout._settings.get_enum('menu-layout');
        this._settings = this._menuLayout._settings;
        this.description = this.provider.appInfo.get_description();
        if(this.description)
            this.description = this.description.split('\n')[0];

        this.label = new St.Label({ 
            text: provider.appInfo.get_name(),
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'text-align: left;'
        });

        if(this.searchType === Constants.AppDisplayType.GRID){
            this.actor.y_align = Clutter.ActorAlign.START;
            this.actor.vertical = false;
            this.x_expand = false; 
            this._content = new St.BoxLayout({ 
                vertical: false,
                x_align: Clutter.ActorAlign.FILL,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                style: "spacing: 5px;"
            });
    
            let icon = new St.Icon({ 
                icon_size: this._menuLayout.layoutProperties.ListSearchResults_IconSize,
                gicon: provider.appInfo.get_icon()
            });
            this.actor.style = "border-radius:4px; spacing: 0px;";

            if(this.layout === Constants.MenuLayout.ELEMENTARY || this.layout === Constants.MenuLayout.UNITY){
                this.actor.style += "width: 190px;";
                this._content.add_actor(icon);
            }
            else if(this.layout === Constants.MenuLayout.RAVEN){
                this.actor.style += "padding: 15px 0px;";
                this._content.style = "spacing: 12px;";
                this.label.style = 'font-weight: bold;';
            }
            else{
                this.actor.style += "width: 150px;";
                this._content.add_actor(icon);
            }

            this._content.add_actor(this.label);
            this.add_child(this._content);
        }
        else{
            this.label.style = 'font-weight: bold;';
            this.actor.style = "padding: 10px 0px;";
            this.add_child(this.label);
        }
        this._moreText = "";
    }

    setMoreCount(count) {
        this._moreText = ngettext("%d more", "%d more", count).format(count);

        if(count > 0){
            if(this.searchType === Constants.AppDisplayType.GRID){
                if(this.layout === Constants.MenuLayout.RAVEN)
                    this.label.text = this.provider.appInfo.get_name() + " (" + this._moreText + ")";
                else
                    this.label.text = this.provider.appInfo.get_name() + "\n" + this._moreText;
            }
            else
                this.label.text = this.provider.appInfo.get_name() + "  (" + this._moreText + ")";
        }
        else
            this.label.text = this.provider.appInfo.get_name();
    }
});
