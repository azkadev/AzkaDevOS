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
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

var SearchbarLocation = {
    BOTTOM: 0,
    TOP: 1
}

var AppDisplayType = {
    LIST: 0,
    GRID: 1,
    SEARCH: 2,
}

var CategoryType = {
    FAVORITES: 0,
    FREQUENT_APPS: 1,
    ALL_PROGRAMS: 2,
    PINNED_APPS: 3,
    RECENT_FILES: 4,
    HOME_SCREEN: 5,
    SEARCH_RESULTS: 6,
    CATEGORIES_LIST: 7,
    CATEGORY_APP_LIST: 8,
    ALL_PROGRAMS_BUTTON: 9,
};

var DefaultMenuView = {
    PINNED_APPS: 0,
    CATEGORIES_LIST: 1,
    FREQUENT_APPS: 2
}

var PrefsVisiblePage = {
    MAIN: 0,
    PINNED_APPS: 1,
    SHORTCUTS: 2,
    MENU_LAYOUT: 3,
    BUTTON_APPEARANCE: 4,
    LAYOUT_TWEAKS: 5,
    ABOUT: 6
}

var DefaultMenuViewTognee = {
    CATEGORIES_LIST: 0,
    ALL_PROGRAMS: 1
}

var SoftwareManagerIDs = ['org.manjaro.pamac.manager.desktop', 'pamac-manager.desktop', 'io.elementary.appcenter.desktop',
                            'snap-store_ubuntu-software.desktop', 'snap-store_snap-store.desktop', 'org.gnome.Software.desktop'];

var Categories = [
    {CATEGORY: CategoryType.FAVORITES, NAME: _("Favorites"), ICON: 'emblem-favorite-symbolic'},
    {CATEGORY: CategoryType.FREQUENT_APPS, NAME: _("Frequent Apps"), ICON: 'user-bookmarks-symbolic'},
    {CATEGORY: CategoryType.ALL_PROGRAMS, NAME: _("All Programs"), ICON: 'view-grid-symbolic'},
    {CATEGORY: CategoryType.PINNED_APPS, NAME: _("Pinned Apps"), ICON: Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg'},
    {CATEGORY: CategoryType.RECENT_FILES, NAME: _("Recent Files"), ICON: 'document-open-recent-symbolic'}
]

var ArcMenuPlacement = {
    PANEL: 0,
    DTP: 1,
    DASH: 2
};

var TooltipLocation = {
    TOP_CENTERED: 0,
    BOTTOM_CENTERED: 1,
    BOTTOM: 2,
};

var SeparatorAlignment = {
    VERTICAL: 0,
    HORIZONTAL: 1
};

var SeparatorStyle = {
    NORMAL: 0,
    LONG: 1,
    SHORT: 2,
    MAX: 3,
    MEDIUM: 4,
};

var CaretPosition = {
    END: -1,
    START: 0,
    MIDDLE: 2,
};

var ForcedMenuLocation = {
    OFF: 0,
    TOP_CENTERED: 1,
    BOTTOM_CENTERED: 2,
}

var MenuItemType = {
    BUTTON: 0,
    MENU_ITEM: 1
};

var SUPER_L = 'Super_L';
var SUPER_R = 'Super_R';
var EMPTY_STRING = '';

var HotKey = {
    UNDEFINED: 0,
    SUPER_L: 1,
    SUPER_R: 2,
    CUSTOM: 3,
    // Inverse mapping
    0: EMPTY_STRING,
    1: SUPER_L,
    2: SUPER_R,
};

var HotCornerAction = {
    DEFAULT: 0,
    DISABLED: 1,
    TOGGLE_ARCMENU: 2,
    CUSTOM: 3
}

var SECTIONS = [
    'devices',
    'network',
    'bookmarks',
];

var MenuPosition = {
    LEFT: 0,
    CENTER: 1,
    RIGHT: 2
};

var DiaglogType = {
    DEFAULT: 0,
    OTHER: 1,
    APPLICATIONS: 2,
    DIRECTORIES: 3
};

var MenuButtonAppearance = {
    ICON: 0,
    TEXT: 1,
    ICON_TEXT: 2,
    TEXT_ICON: 3,
    NONE: 4
};

var MenuIcon = { 
    ARC_MENU: 0,
    DISTRO_ICON: 1,
    CUSTOM: 2
};

var PowerType = {
    LOGOUT: 0,
    LOCK: 1,
    RESTART: 2,
    POWER_OFF: 3,
    SUSPEND: 4,
    HYBRID_SLEEP: 5,
    HIBERNATE: 6,
};

var SleepIcon = {
    PATH: '/media/icons/menu_icons/sleep-symbolic.svg'
};

var PowerOptions = [
    { TYPE: PowerType.LOGOUT, IMAGE: 'application-exit-symbolic', TITLE: _("Log Out") },
    { TYPE: PowerType.LOCK, IMAGE: 'changes-prevent-symbolic', TITLE: _("Lock") },
    { TYPE: PowerType.RESTART, IMAGE: 'system-reboot-symbolic', TITLE: _("Restart") },
    { TYPE: PowerType.POWER_OFF, IMAGE: 'system-shutdown-symbolic', TITLE: _("Power Off") },
    { TYPE: PowerType.SUSPEND, IMAGE: 'media-playback-pause-symbolic', TITLE: _("Suspend") },
    { TYPE: PowerType.HYBRID_SLEEP, IMAGE: Me.path + SleepIcon.PATH, TITLE: _("Hybrid Sleep") },
    { TYPE: PowerType.HIBERNATE, IMAGE: 'document-save-symbolic', TITLE: _("Hibernate") },
];

var MenuIcons = [
    { PATH: '/media/icons/menu_button_icons/icons/arcmenu-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/arcmenu-logo-alt-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/arc-menu-old-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/arc-menu-alt-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/arc-menu-old2-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/curved-a-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/focus-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/triple-dash-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/whirl-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/whirl-circle-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/sums-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/arrow-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/lins-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/diamond-square-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/octo-maze-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/search-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/transform-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/3d-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/alien-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/cloud-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/dragon-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/fly-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/pacman-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/peaks-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/pie-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/pointer-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/toxic-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/tree-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/zegon-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/apps-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/bug-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/cita-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/dragonheart-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/eclipse-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/football-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/heddy-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/helmet-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/palette-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/peeks-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/record-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/saucer-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/step-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/vancer-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/vibe-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/start-box-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/dimond-win-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/dolphin-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/dota-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/football2-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/loveheart-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/pyrimid-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/rewind-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/snap-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/time-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/3D-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/a-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/app-launcher-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/bat-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/dra-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/equal-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/gnacs-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/groove-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/kaaet-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/launcher-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/pac-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/robots-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/sheild-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/somnia-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/utool-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/swirl-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/icons/round-symbolic.svg'},
]

var DistroIcons = [
    { PATH: 'start-here-symbolic'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/debian-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/fedora-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/manjaro-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/pop-os-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/ubuntu-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/arch-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/opensuse-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/raspbian-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/kali-linux-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/pureos-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/solus-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/budgie-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/gentoo-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/mx-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/redhat-logo-symbolic.svg'},
    { PATH: '/media/icons/menu_button_icons/distro_icons/voyager-logo-symbolic.svg'},
]

var MenuLayout = {
    ARCMENU: 0,
    BRISK: 1,
    WHISKER: 2,
    GNOME_MENU: 3,
    MINT: 4,
    ELEMENTARY: 5,
    GNOME_OVERVIEW: 6,
    SIMPLE: 7,
    SIMPLE_2: 8,
    REDMOND: 9,
    UNITY: 10,
    BUDGIE: 11,
    INSIDER: 12,
    RUNNER: 13,
    CHROMEBOOK: 14,
    RAVEN: 15,
    TOGNEE: 16,
    PLASMA: 17,
    WINDOWS: 18,
    LAUNCHER: 19,
    ELEVEN: 20,
};

var TraditionalMenus = [   
    { IMAGE: 'arcmenu-layout-symbolic', TITLE: _('ArcMenu'), LAYOUT: MenuLayout.ARCMENU},
    { IMAGE: 'brisk-layout-symbolic', TITLE: _('Brisk'), LAYOUT: MenuLayout.BRISK},
    { IMAGE: 'whisker-layout-symbolic', TITLE: _('Whisker'), LAYOUT: MenuLayout.WHISKER},
    { IMAGE: 'gnomemenu-layout-symbolic', TITLE: _('GNOME Menu'), LAYOUT: MenuLayout.GNOME_MENU},
    { IMAGE: 'mint-layout-symbolic', TITLE: _('Mint'), LAYOUT: MenuLayout.MINT},
    { IMAGE: 'budgie-layout-symbolic', TITLE: _('Budgie'), LAYOUT: MenuLayout.BUDGIE}];

var ModernMenus = [
    { IMAGE: 'unity-layout-symbolic', TITLE: _('Unity'), LAYOUT: MenuLayout.UNITY},
    { IMAGE: 'plasma-layout-symbolic', TITLE: _('Plasma'), LAYOUT: MenuLayout.PLASMA},
    { IMAGE: 'tognee-layout-symbolic', TITLE: _('tognee'), LAYOUT: MenuLayout.TOGNEE},
    { IMAGE: 'insider-layout-symbolic', TITLE: _('Insider'), LAYOUT: MenuLayout.INSIDER},
    { IMAGE: 'redmond-layout-symbolic', TITLE: _('Redmond'), LAYOUT: MenuLayout.REDMOND},
    { IMAGE: 'windows-layout-symbolic', TITLE: _('Windows'), LAYOUT: MenuLayout.WINDOWS},
    { IMAGE: 'eleven-layout-symbolic', TITLE: _('Eleven'), LAYOUT: MenuLayout.ELEVEN}];

var TouchMenus = [   
    { IMAGE: 'elementary-layout-symbolic', TITLE: _('Elementary'), LAYOUT: MenuLayout.ELEMENTARY},
    { IMAGE: 'chromebook-layout-symbolic', TITLE: _('Chromebook'), LAYOUT: MenuLayout.CHROMEBOOK}];

var LauncherMenus = [
    { IMAGE: 'launcher-layout-symbolic', TITLE: _('Launcher'), LAYOUT: MenuLayout.LAUNCHER},
    { IMAGE: 'runner-layout-symbolic', TITLE: _('Runner'), LAYOUT: MenuLayout.RUNNER},
    { IMAGE: 'gnomeoverview-layout-symbolic', TITLE: _('GNOME Overview'), LAYOUT: MenuLayout.GNOME_OVERVIEW}];

var SimpleMenus = [   
    { IMAGE: 'simple-layout-symbolic', TITLE: _('Simple'), LAYOUT: MenuLayout.SIMPLE},
    { IMAGE: 'simple2-layout-symbolic', TITLE: _('Simple 2'), LAYOUT: MenuLayout.SIMPLE_2}];

var AlternativeMenus = [   
    { IMAGE: 'raven-layout-symbolic', TITLE: _('Raven'), LAYOUT: MenuLayout.RAVEN}];

var MenuStyles = {
    STYLES: [ 
        { IMAGE: 'traditional-category-symbolic', TITLE: _("Traditional"), MENU_TYPE: TraditionalMenus },
        { IMAGE: 'modern-category-symbolic', TITLE: _("Modern"), MENU_TYPE: ModernMenus },
        { IMAGE: 'touch-category-symbolic', TITLE: _("Touch"), MENU_TYPE: TouchMenus },
        { IMAGE: 'simple-category-symbolic', TITLE: _("Simple"), MENU_TYPE: SimpleMenus },
        { IMAGE: 'launcher-category-symbolic', TITLE: _("Launcher"), MENU_TYPE: LauncherMenus },
        { IMAGE: 'alternative-category-symbolic', TITLE: _("Alternative"), MENU_TYPE: AlternativeMenus }
    ]
};

var ArcMenuSettingsCommand = 'gnome-extensions prefs arcmenu@arcmenu.com';

var HamburgerIcon = {
    PATH: '/media/icons/menu_icons/hamburger-symbolic.svg'
};

var DistroIconsDisclaimer = '<i>"All brand icons are trademarks of their respective owners. The use of these trademarks does not indicate endorsement of the trademark holder by ArcMenu project, nor vice versa. Please do not use brand logos for any purpose except to represent the company, product, or service to which they refer."</i>'+
                                '\n\n•   <b>Ubuntu®</b> - Ubuntu name and Ubuntu logo are trademarks of Canonical© Ltd.'+
                                '\n\n•   <b>Fedora®</b> - Fedora and the Infinity design logo are trademarks of Red Hat, Inc.'+
                                '\n\n•   <b>Debian®</b> - is a registered trademark owned by Software in the Public Interest, Inc. Debian trademark is a registered United States trademark of Software in the Public Interest, Inc., managed by the Debian project.'+
                                '\n\n•   <b>Manjaro®</b> - logo and name are trademarks of Manjaro GmbH &amp; Co. KG'+
                                '\n\n•   <b>Pop_OS!®</b> - logo and name are trademarks of system 76© Inc.'+
                                '\n\n•   <b>Arch Linux™</b> - The stylized Arch Linux logo is a recognized trademark of Arch Linux, copyright 2002–2017 Judd Vinet and Aaron Griffin.'+
                                '\n\n•   <b>openSUSE®</b> - logo and name 2001–2020 SUSE LLC, © 2005–2020 openSUSE Contributors &amp; others.'+
                                '\n\n•   <b>Raspberry Pi®</b> - logo and name are part of Raspberry Pi Foundation UK Registered Charity 1129409'+
                                '\n\n•   <b>Kali Linux™</b> - logo and name are part of © OffSec Services Limited 2020'+
                                '\n\n•   <b>PureOS</b> - logo and name are developed by members of the Purism community'+
                                '\n\n•   <b>Solus</b> - logo and name are copyright © 2014–2018 by Solus Project'+
                                '\n\n•   <b>Gentoo Authors©</b> - 2001–2020 Gentoo is a trademark of the Gentoo Foundation, Inc.'+
                                '\n\n•   <b>Voyager© Linux</b> - name and logo'+
                                '\n\n•   <b>MX Linux©</b> - 2020 - Linux - is the registered trademark of Linus Torvalds in the U.S. and other countries.'+
                                '\n\n•   <b>Red Hat, Inc.©</b> - Copyright 2020 name and logo';


var DEVELOPERS = '<b>Andrew Zaech</b> <a href="https://gitlab.com/AndrewZaech">@AndrewZaech</a>\nLead Project Developer and Maintainer\t' +
                '\n\n<b>LinxGem33</b> aka <b>Andy C</b> <a href="https://gitlab.com/LinxGem33">@LinxGem33</a> - <b>(Inactive)</b>\nArcMenu Founder - Former Maintainer - Former Digital Art Designer';
var TRANSLATORS = '<b>Thank you to all translators!</b>\n\n' +
                    '<b>For a list of all translators please visit <a href="https://gitlab.com/arcmenu/ArcMenu">ArcMenu on GitLab</a></b>';
var CONTRIBUTORS = '<b>Thank you to all who contributed to, and/or helped, the developement of ArcMenu!</b>'
                    +'\n\n<b>For a list of all contributors please visit <a href="https://gitlab.com/arcmenu/ArcMenu">ArcMenu on GitLab</a></b>';
var ARTWORK = '<b>LinxGem33</b> aka <b>Andy C</b>\nWiki Screens, Icons, Wire-Frames, ArcMenu Assets' +
                '\n\n<b>Andrew Zaech</b>\nIcons, Wire-Frames';     
        
var GNU_SOFTWARE = '<span size="small">' +
    'This program comes with absolutely no warranty.\n' +
    'See the <a href="https://gnu.org/licenses/old-licenses/gpl-2.0.html">' +
	'GNU General Public License, version 2 or later</a> for details.' +
	'</span>';
