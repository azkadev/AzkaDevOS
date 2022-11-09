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
 * 
 * Credits: This file leverages the work from places-menu extension 
 * (https://gitlab.gnome.org/GNOME/gnome-shell-extensions/-/tree/master/extensions/places-menu)
 * and Dash to Dock extension 'location.js' file to implement a trash shortcut
 */

const Me = imports.misc.extensionUtils.getCurrentExtension();
const {St, Gio, GLib, Shell } = imports.gi;
const Clutter = imports.gi.Clutter;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const GObject = imports.gi.GObject;
const Main = imports.ui.main;
const MW = Me.imports.menuWidgets;
const PopupMenu = imports.ui.popupMenu;
const ShellMountOperation = imports.ui.shellMountOperation;
const Signals = imports.signals;
const _ = Gettext.gettext;

const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';
const Hostname1Iface = '<node> \
<interface name="org.freedesktop.hostname1"> \
<property name="PrettyHostname" type="s" access="read" /> \
</interface> \
</node>';
const Hostname1 = Gio.DBusProxy.makeProxyWrapper(Hostname1Iface);

const MEDIUM_ICON_SIZE = 25;
const SMALL_ICON_SIZE = 16;

var PlaceMenuItem = GObject.registerClass(class Arc_Menu_PlaceMenuItem2 extends MW.ArcMenuPopupBaseMenuItem{
    _init(menuLayout, info) {
        super._init(menuLayout);
        this._info = info;
        this._menuLayout = menuLayout;
        this._icon = new St.Icon({
            gicon: info.icon,
            icon_size: SMALL_ICON_SIZE
        });
        this.add_child(this._icon);
        this.label = new St.Label({ text: info.name, 
                                    x_expand: false,
                                    y_expand: true,
                                    x_align: Clutter.ActorAlign.FILL,
                                    y_align: Clutter.ActorAlign.CENTER });
        
        this.add_child(this.label);

        if (info.isRemovable()) {
            this._ejectIcon = new St.Icon({
                icon_name: 'media-eject-symbolic',
                style_class: 'popup-menu-icon'
            });
            this._ejectButton = new St.Button({ 
                child: this._ejectIcon,
                style_class: 'arc-menu-eject-button'
            });
            this._ejectButton.connect('clicked', info.eject.bind(info));
            this.add_child(this._ejectButton);
        }

        this._changedId = info.connect('changed',
                                       this._propertiesChanged.bind(this));
        this.actor.connect('destroy',()=>{
            if (this._changedId) {
                this._info.disconnect(this._changedId);
                this._changedId = 0;
            }
        });
        let layout = this._menuLayout._settings.get_enum('menu-layout');  
        if(layout === Constants.MenuLayout.PLASMA)
            this._updateIcon();
    }
   
    _updateIcon(){
        let largeIcons = this._menuLayout._settings.get_boolean('enable-large-icons');
        this._icon.icon_size = largeIcons ? MEDIUM_ICON_SIZE : SMALL_ICON_SIZE;
    }

    activate(event) {
        this._info.launch(event.get_time());
        this._menuLayout.arcMenu.toggle();
        super.activate(event);
    }

    _propertiesChanged(info) {
        this._icon.gicon = info.icon;
        this.label.text = info.name;
    }
});

var PlaceInfo = class Arc_Menu_PlaceInfo2 {
    constructor() {
        this._init.apply(this, arguments);
    }

    _init(kind, file, name, icon) {
        this.kind = kind;
        this.file = file;
        this.name = name || this._getFileName();
        this.icon = icon ? new Gio.ThemedIcon({ name: icon }) : this.getIcon();
    }

    destroy() {
    }

    isRemovable() {
        return false;
    }

    async _ensureMountAndLaunch(context, tryMount) {
        try {
            await this._launchDefaultForUri(this.file.get_uri(), context, null);
        } catch (e) {
            if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_MOUNTED)) {
                Main.notifyError(_('Failed to launch “%s”').format(this.name), e.message);
                return;
            }

            let source = {
                get_icon: () => this.icon
            };
            let op = new ShellMountOperation.ShellMountOperation(source);
            try {
                await this._mountEnclosingVolume(0, op.mountOp, null);

                if (tryMount)
                    this._ensureMountAndLaunch(context, false);
            } catch (e) {
                if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.FAILED_HANDLED))
                    Main.notifyError(_('Failed to mount volume for “%s”').format(this.name), e.message);
            } finally {
                op.close();
            }
        }
    }

    launch(timestamp) {
        let launchContext = global.create_app_launch_context(timestamp, -1);
        this._ensureMountAndLaunch(launchContext, true);
    }

    getIcon() {
        this.file.query_info_async('standard::symbolic-icon', 0, 0, null,
                                   (file, result) => {
                                       try {
                                           let info = file.query_info_finish(result);
                                           this.icon = info.get_symbolic_icon();
                                           this.emit('changed');
                                       } catch (e) {
                                           if (e instanceof Gio.IOErrorEnum)
                                               return;
                                           throw e;
                                       }
                                   });

        // return a generic icon for this kind for now, until we have the
        // icon from the query info above
        switch (this.kind) {
        case 'network':
            return new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
        case 'devices':
            return new Gio.ThemedIcon({ name: 'drive-harddisk-symbolic' });
        case 'special':
        case 'bookmarks':
        default:
            if (!this.file.is_native())
                return new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
            else
                return new Gio.ThemedIcon({ name: 'folder-symbolic' });
        }
    }

    _getFileName() {
        try {
            let info = this.file.query_info('standard::display-name', 0, null);
            return info.get_display_name();
        } catch (e) {
            if (e instanceof Gio.IOErrorEnum)
                return this.file.get_basename();
            throw e;
        }
    }

    _launchDefaultForUri(uri, context, cancel) {
        return new Promise((resolve, reject) => {
            Gio.AppInfo.launch_default_for_uri_async(uri, context, cancel, (o, res) => {
                try {
                    Gio.AppInfo.launch_default_for_uri_finish(res);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    _mountEnclosingVolume(flags, mountOp, cancel) {
        return new Promise((resolve, reject) => {
            this.file.mount_enclosing_volume(flags, mountOp, cancel, (o, res) => {
                try {
                    this.file.mount_enclosing_volume_finish(res);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}
Signals.addSignalMethods(PlaceInfo.prototype);

var RootInfo = class Arc_Menu_RootInfo extends PlaceInfo {
    _init() {
        super._init('devices', Gio.File.new_for_path('/'), _('Computer'));

        let busName = 'org.freedesktop.hostname1';
        let objPath = '/org/freedesktop/hostname1';
        new Hostname1(Gio.DBus.system, busName, objPath, (obj, error) => {
            if (error)
                return;

            this._proxy = obj;
            this._proxyID = this._proxy.connect('g-properties-changed',
                                this._propertiesChanged.bind(this));
            this._propertiesChanged(obj);
        });

    }

    getIcon() {
        return new Gio.ThemedIcon({ name: 'drive-harddisk-symbolic' });
    }

    _propertiesChanged(proxy) {
        // GDBusProxy will emit a g-properties-changed when hostname1 goes down
        // ignore it
        if (proxy.g_name_owner) {
            this.name = proxy.PrettyHostname || _('Computer');
            this.emit('changed');
        }
    }

    destroy() {
        if (this._proxyID) {
            this._proxy.disconnect(this._proxyID);
            this._proxy = 0;
        }
        if (this._proxy) {
            this._proxy.run_dispose();
            this._proxy = null;
        }
        super.destroy();
    }
};


var PlaceDeviceInfo = class Arc_Menu_PlaceDeviceInfo extends PlaceInfo {
    _init(kind, mount) {
        this._mount = mount;
        super._init(kind, mount.get_root(), mount.get_name());
    }

    getIcon() {
        return this._mount.get_symbolic_icon();
    }

    isRemovable() {
        return this._mount.can_eject();
    }

    eject() {
        let unmountArgs = [
            Gio.MountUnmountFlags.NONE,
            (new ShellMountOperation.ShellMountOperation(this._mount)).mountOp,
            null // Gio.Cancellable
        ];

        if (this._mount.can_eject())
            this._mount.eject_with_operation(...unmountArgs,
                                             this._ejectFinish.bind(this));
        else
            this._mount.unmount_with_operation(...unmountArgs,
                                               this._unmountFinish.bind(this));
    }

    _ejectFinish(mount, result) {
        try {
            mount.eject_with_operation_finish(result);
        } catch (e) {
            this._reportFailure(e);
        }
    }

    _unmountFinish(mount, result) {
        try {
            mount.unmount_with_operation_finish(result);
        } catch (e) {
            this._reportFailure(e);
        }
    }

    _reportFailure(exception) {
        let msg = _('Ejecting drive “%s” failed:').format(this._mount.get_name());
        Main.notifyError(msg, exception.message);
    }
};

var PlaceVolumeInfo = class Arc_Menu_PlaceVolumeInfo extends PlaceInfo {
    _init(kind, volume) {
        this._volume = volume;
        super._init(kind, volume.get_activation_root(), volume.get_name());
    }

    launch(timestamp) {
        if (this.file) {
            super.launch(timestamp);
            return;
        }

        this._volume.mount(0, null, null, (volume, result) => {
            volume.mount_finish(result);

            let mount = volume.get_mount();
            this.file = mount.get_root();
            super.launch(timestamp);
        });
    }

    getIcon() {
        return this._volume.get_symbolic_icon();
    }
};

const DefaultDirectories = [
    GLib.UserDirectory.DIRECTORY_DOCUMENTS,
    GLib.UserDirectory.DIRECTORY_PICTURES,
    GLib.UserDirectory.DIRECTORY_MUSIC,
    GLib.UserDirectory.DIRECTORY_DOWNLOAD,
    GLib.UserDirectory.DIRECTORY_VIDEOS,
];

var PlacesManager = class Arc_Menu_PlacesManager {
    constructor() {
        this._places = {
            special: [],
            devices: [],
            bookmarks: [],
            network: [],
        };

        this._settings = new Gio.Settings({ schema_id: BACKGROUND_SCHEMA });
        this._showDesktopIconsChangedId =
            this._settings.connect('changed::show-desktop-icons',
                                   this._updateSpecials.bind(this));
        this._updateSpecials();

        /*
        * Show devices, code more or less ported from nautilus-places-sidebar.c
        */
        this._volumeMonitor = Gio.VolumeMonitor.get();
        this._connectVolumeMonitorSignals();
        this._updateMounts();

        this._bookmarksFile = this._findBookmarksFile();
        this._bookmarkTimeoutId = 0;
        this._monitor = null;

        if (this._bookmarksFile) {
            this._monitor = this._bookmarksFile.monitor_file(Gio.FileMonitorFlags.NONE, null);
            this._monitor.connect('changed', () => {
                if (this._bookmarkTimeoutId > 0)
                    return;
                /* Defensive event compression */
                this._bookmarkTimeoutId = GLib.timeout_add(
                    GLib.PRIORITY_DEFAULT, 100, () => {
                        this._bookmarkTimeoutId = 0;
                        this._reloadBookmarks();
                        return false;
                    });
            });

            this._reloadBookmarks();
        }
    }

    _connectVolumeMonitorSignals() {
        const signals = [
            'volume-added',
            'volume-removed',
            'volume-changed',
            'mount-added',
            'mount-removed',
            'mount-changed',
            'drive-connected',
            'drive-disconnected',
            'drive-changed'
        ];

        this._volumeMonitorSignals = [];
        let func = this._updateMounts.bind(this);
        for (let i = 0; i < signals.length; i++) {
            let id = this._volumeMonitor.connect(signals[i], func);
            this._volumeMonitorSignals.push(id);
        }
    }

    destroy() {
        if (this._settings)
            this._settings.disconnect(this._showDesktopIconsChangedId);
        this._settings = null;

        for (let i = 0; i < this._volumeMonitorSignals.length; i++)
            this._volumeMonitor.disconnect(this._volumeMonitorSignals[i]);

        if (this._monitor)
            this._monitor.cancel();
        if (this._bookmarkTimeoutId)
            GLib.source_remove(this._bookmarkTimeoutId);
    }

    _updateSpecials() {
        this._places.special.forEach(p => p.destroy());
        this._places.special = [];

        let homePath = GLib.get_home_dir();

        this._places.special.push(new PlaceInfo('special',
                                                Gio.File.new_for_path(homePath),
                                                _('Home')));

        let specials = [];
        let dirs = DefaultDirectories.slice();

        if (this._settings.get_boolean('show-desktop-icons'))
            dirs.push(GLib.UserDirectory.DIRECTORY_DESKTOP);

        for (let i = 0; i < dirs.length; i++) {
            let specialPath = GLib.get_user_special_dir(dirs[i]);
            if (specialPath == null || specialPath == homePath)
                continue;

            let file = Gio.File.new_for_path(specialPath), info;
            try {
                info = new PlaceInfo('special', file);
            } catch (e) {
                if (e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND))
                    continue;
                throw e;
            }

            specials.push(info);
        }

        specials.sort((a, b) => GLib.utf8_collate(a.name, b.name));
        this._places.special = this._places.special.concat(specials);

        this.emit('special-updated');
    }

    _updateMounts() {
        let networkMounts = [];
        let networkVolumes = [];

        this._places.devices.forEach(p => p.destroy());
        this._places.devices = [];
        this._places.network.forEach(p => p.destroy());
        this._places.network = [];

        /* Add standard places */
       // this._places.devices.push(new RootInfo());
       /* this._places.network.push(new PlaceInfo('network',
                                                Gio.File.new_for_uri('network:///'),
                                                _('Network'),
                                                'network-workgroup-symbolic'));*/

        /* first go through all connected drives */
        let drives = this._volumeMonitor.get_connected_drives();
        for (let i = 0; i < drives.length; i++) {
            let volumes = drives[i].get_volumes();

            for (let j = 0; j < volumes.length; j++) {
                let identifier = volumes[j].get_identifier('class');
                if (identifier && identifier.includes('network')) {
                    networkVolumes.push(volumes[j]);
                } else {
                    let mount = volumes[j].get_mount();
                    if (mount != null)
                        this._addMount('devices', mount);
                }
            }
        }

        /* add all volumes that is not associated with a drive */
        let volumes = this._volumeMonitor.get_volumes();
        for (let i = 0; i < volumes.length; i++) {
            if (volumes[i].get_drive() != null)
                continue;

            let identifier = volumes[i].get_identifier('class');
            if (identifier && identifier.includes('network')) {
                networkVolumes.push(volumes[i]);
            } else {
                let mount = volumes[i].get_mount();
                if (mount != null)
                    this._addMount('devices', mount);
            }
        }

        /* add mounts that have no volume (/etc/mtab mounts, ftp, sftp,...) */
        let mounts = this._volumeMonitor.get_mounts();
        for (let i = 0; i < mounts.length; i++) {
            if (mounts[i].is_shadowed())
                continue;

            if (mounts[i].get_volume())
                continue;

            let root = mounts[i].get_default_location();
            if (!root.is_native()) {
                networkMounts.push(mounts[i]);
                continue;
            }
            this._addMount('devices', mounts[i]);
        }

        for (let i = 0; i < networkVolumes.length; i++) {
            let mount = networkVolumes[i].get_mount();
            if (mount) {
                networkMounts.push(mount);
                continue;
            }
            this._addVolume('network', networkVolumes[i]);
        }

        for (let i = 0; i < networkMounts.length; i++) {
            this._addMount('network', networkMounts[i]);
        }

        this.emit('devices-updated');
        this.emit('network-updated');
    }

    _findBookmarksFile() {
        let paths = [
            GLib.build_filenamev([GLib.get_user_config_dir(), 'gtk-3.0', 'bookmarks']),
            GLib.build_filenamev([GLib.get_home_dir(), '.gtk-bookmarks']),
        ];

        for (let i = 0; i < paths.length; i++) {
            if (GLib.file_test(paths[i], GLib.FileTest.EXISTS))
                return Gio.File.new_for_path(paths[i]);
        }

        return null;
    }

    _reloadBookmarks() {

        this._bookmarks = [];

        let content = Shell.get_file_contents_utf8_sync(this._bookmarksFile.get_path());
        let lines = content.split('\n');

        let bookmarks = [];
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let components = line.split(' ');
            let bookmark = components[0];

            if (!bookmark)
                continue;

            let file = Gio.File.new_for_uri(bookmark);
            if (file.is_native() && !file.query_exists(null))
                continue;

            let duplicate = false;
            for (let i = 0; i < this._places.special.length; i++) {
                if (file.equal(this._places.special[i].file)) {
                    duplicate = true;
                    break;
                }
            }
            if (duplicate)
                continue;
            for (let i = 0; i < bookmarks.length; i++) {
                if (file.equal(bookmarks[i].file)) {
                    duplicate = true;
                    break;
                }
            }
            if (duplicate)
                continue;

            let label = null;
            if (components.length > 1)
                label = components.slice(1).join(' ');

            bookmarks.push(new PlaceInfo('bookmarks', file, label));
        }

        this._places.bookmarks = bookmarks;

        this.emit('bookmarks-updated');
    }

    _addMount(kind, mount) {
        let devItem;

        try {
            devItem = new PlaceDeviceInfo(kind, mount);
        } catch (e) {
            if (e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND))
                return;
            throw e;
        }

        this._places[kind].push(devItem);
    }

    _addVolume(kind, volume) {
        let volItem;

        try {
            volItem = new PlaceVolumeInfo(kind, volume);
        } catch (e) {
            if (e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND))
                return;
            throw e;
        }

        this._places[kind].push(volItem);
    }

    get(kind) {
        return this._places[kind];
    }
};
Signals.addSignalMethods(PlacesManager.prototype);

//Trash can class implemented from Dash to Dock https://github.com/micheleg/dash-to-dock/blob/master/locations.js
var Trash = class Arc_Menu_Trash {
    constructor(menuItem) {
        this._menuItem = menuItem;
        let trashPath = GLib.get_home_dir() + '/.local/share/Trash/files/';
        this._file = Gio.file_new_for_path(trashPath);
        try {
            this._monitor = this._file.monitor_directory(0, null);
            this._signalId = this._monitor.connect(
                'changed',
                this._onTrashChange.bind(this)
            );
        } catch (e) {
            log(`Impossible to monitor trash: ${e}`);
        }
        this._lastEmpty = true;
        this._empty = true;
        this._schedUpdateId = 0;
        this._updateTrash();
    }

    destroy() {
        if (this._monitor) {
            this._monitor.disconnect(this._signalId);
            this._monitor.run_dispose();
        }
        this._file.run_dispose();
    }

    _onTrashChange() {
        if (this._schedUpdateId) {
            GLib.source_remove(this._schedUpdateId);
        }
        this._schedUpdateId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT, 500, () => {
            this._schedUpdateId = 0;
            this._updateTrash();
            return GLib.SOURCE_REMOVE;
        });
    }

    _updateTrash() {
        try {
            let children = this._file.enumerate_children('*', 0, null);
            this._empty = children.next_file(null) == null;
            children.close(null);
        } catch (e) {
            log(`Impossible to enumerate trash children: ${e}`)
            return;
        }

        this._ensureApp();
    }

    _ensureApp() {
        if (this._trashApp == null ||
            this._lastEmpty != this._empty) {
            let trashKeys = new GLib.KeyFile();
            trashKeys.set_string('Desktop Entry', 'Name', _('Trash'));
            trashKeys.set_string('Desktop Entry', 'Id', 'ArcMenu_Trash');
            trashKeys.set_string('Desktop Entry', 'Icon',
                                 this._empty ? 'user-trash-symbolic' : 'user-trash-full-symbolic');
            trashKeys.set_string('Desktop Entry', 'Type', 'Application');
            trashKeys.set_string('Desktop Entry', 'Exec', 'gio open trash:///');
            trashKeys.set_string('Desktop Entry', 'StartupNotify', 'false');
            trashKeys.set_string('Desktop Entry', 'XdtdUri', 'trash:///');
            if (!this._empty) {
                trashKeys.set_string('Desktop Entry', 'Actions', 'empty-trash;');
                trashKeys.set_string('Desktop Action empty-trash', 'Name', _('Empty Trash'));
                trashKeys.set_string('Desktop Action empty-trash', 'Exec',
                                     'dbus-send --print-reply --dest=org.gnome.Nautilus /org/gnome/Nautilus org.gnome.Nautilus.FileOperations.EmptyTrash');
            }
            else{
                trashKeys.set_string('Desktop Entry', 'Actions', 'empty-trash-inactive;');
                trashKeys.set_string('Desktop Action empty-trash-inactive', 'Name', _('Empty Trash'));
            }

            let trashAppInfo = Gio.DesktopAppInfo.new_from_keyfile(trashKeys);
            this._trashApp = new Shell.App({appInfo: trashAppInfo});
            this._lastEmpty = this._empty;

            this._menuItem._app = this._trashApp;
            if(this._menuItem.contextMenu)
                this._menuItem.contextMenu._app = this._trashApp;
            let trashIcon = this._trashApp.create_icon_texture(MEDIUM_ICON_SIZE);
            if(this._menuItem._icon && trashIcon)
                this._menuItem._icon.gicon = trashIcon.gicon;

            this.emit('changed');
        }
    }

    getApp() {
        this._ensureApp();
        return this._trashApp;
    }
}
Signals.addSignalMethods(Trash.prototype);
