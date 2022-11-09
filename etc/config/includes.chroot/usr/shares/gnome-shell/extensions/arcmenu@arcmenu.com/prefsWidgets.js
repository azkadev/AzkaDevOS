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
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

var Notebook = GObject.registerClass(class Arc_Menu_Notebook extends Gtk.Notebook{
    _init() {
        super._init({
            margin_start: 0,
            margin_end: 0
        });
    }

    append_page(notebookPage) {
        Gtk.Notebook.prototype.append_page.call(
            this,
            notebookPage,
            notebookPage.getTitleLabel()
        );
    }
});

var NotebookPage = GObject.registerClass(class Arc_Menu_NotebookPage extends Gtk.Box {
    _init(title) {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
            spacing: 20,
            homogeneous: false
        });
        this._title = new Gtk.Label({
            label: "<b>" + title + "</b>",
            use_markup: true,
            xalign: 0
        });
    }

    getTitleLabel() {
        return this._title;
    }
});

var Button = GObject.registerClass(class Arc_Menu_Button extends Gtk.Button {
    _init(params) {
        super._init();
        this._params = params;
        this.halign = Gtk.Align.END;
        this.valign = Gtk.Align.CENTER;
        this.box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 5
        });
        this.add(this.box);

        if (this._params.icon_name) {
            let image = new Gtk.Image({
                icon_name: this._params.icon_name,
                halign: Gtk.Align.CENTER
            });
            this.box.add(image);
        }
        if (this._params.tooltip_text){
            this.set_tooltip_text(this._params.tooltip_text);
        }
        if (this._params.title){
            let label = new Gtk.Label({
                label: _(this._params.title),
                use_markup: true,
                xalign: 0
            });
            if(this._params.icon_first)
                this.box.add(label);
            else{
                this.box.add(label);
                this.box.reorder_child(label, 0);
            }
        }
    }
});

var DialogWindow = GObject.registerClass(class Arc_Menu_DialogWindow extends Gtk.Dialog {
    _init(title, parent) {
        super._init({
            title: title,
            transient_for: parent.get_toplevel(),
            modal: true
        });
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
        this.get_content_area().add(vbox);
        this._createLayout(vbox);
    }

    _createLayout(vbox) {
        throw "Not implemented!";
    }
});

var MessageDialog = GObject.registerClass(class Arc_Menu_MessageDialog extends Gtk.MessageDialog {
    _init(params) {
        super._init({
            transient_for: params.transient_for,
            modal: true,
            buttons: params.buttons
        });
        this.set_size_request(300, 50);
        this.grid = new Gtk.Grid({
            row_spacing: 10,
            column_spacing: 24,
            margin_top: 24,
            margin_bottom: 0,
            margin_start: 24,
            margin_end: 24,
            hexpand: false,
            halign: Gtk.Align.CENTER
        });
        this.get_content_area().add(this.grid);
        let text = new Gtk.Label({
            label: "<b>" + _(params.text) + "</b>",
            use_markup: true,
            hexpand: false,
            halign: Gtk.Align.START,
            wrap: true,
        });
        this.grid.attach(text, 1, 0, 1, 1);

        if(params.secondaryText){
            let secondayText = new Gtk.Label({
                label: _(params.secondaryText),
                use_markup: true,
                hexpand: false,
                halign: Gtk.Align.START,
                wrap: true,
            });
            this.grid.attach(secondayText, 1, 1, 1, 1);
        }

        if(params.iconName){
            let image = new Gtk.Image({
                icon_name: params.iconName,
                pixel_size: 48
            });
            this.grid.attach(image, 0, 0, 1, 2);
        }
    }
});

var FrameBox = GObject.registerClass(class Arc_Menu_FrameBox extends Gtk.Frame {
    _init(params) {
        super._init(params);
        this._listBox = new Gtk.ListBox();
        this._listBox.set_selection_mode(Gtk.SelectionMode.NONE);
        this.count = 0;
        this.children = [];
        Gtk.Frame.prototype.add.call(this, this._listBox);
    }

    add(boxRow) {
        this._listBox.add(boxRow);
        this.children.push(boxRow);
        this.count++;
    }
    show_all() {
        this._listBox.show_all();
        super.show_all();
    }
    length() {
        return this._listBox.length;
    }
    remove(boxRow){
        if(boxRow){
            this._listBox.remove(boxRow);
            this.children = this.children.filter(e => e !== boxRow)
            this.count = this.count -1;
        }
    }
    removeChildrenAfterIndex(index){
        let childrenCount = this.count;
        for(let i = childrenCount - 1; i > index; i--){
            let child = this._listBox.get_row_at_index(i);
            if(child) this.remove(child);
        }
        this._listBox.show_all();
    }
    remove_all_children() {
        for(let i = 0; i < this.children.length; i++){
            let child = this.children[i];
            this._listBox.remove(child);
        }
        this.children = [];
        this.count = 0;
        this._listBox.show_all();
    }
    get_index(index){
        return this._listBox.get_row_at_index(index);
    }
    insert(row, pos){
        this._listBox.insert(row, pos);
        this.children.push(row);
        this.count++;
    }
});

var FrameBoxRow = GObject.registerClass(class Arc_Menu_FrameBoxRow extends Gtk.ListBoxRow {
    _init(params) {
        super._init(params);
        this.selectable = false;
        this.activatable = false;
        this._grid = new Gtk.Grid({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_top: 5,
            margin_bottom: 5,
            margin_start: 5,
            margin_end: 5,
            column_spacing: 20,
            row_spacing: 20
        });
        this.x = 0;
        Gtk.ListBoxRow.prototype.add.call(this, this._grid);
    }

    add(widget) {
        this._grid.attach(widget, this.x, 0, 1, 1);
        this.x++;
    }
    
    setVerticalAlignmentBottom(){
        this._grid.vexpand = true;
        this._grid.valign = Gtk.Align.END;
    }
});

var FrameBoxDragRow = GObject.registerClass(class Arc_Menu_FrameBoxDragRow extends Gtk.ListBoxRow {
    _init(scrolledWindow) {
        this.moveIndex = 0;
        super._init();

        this._grid = new Gtk.Grid({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_top: 5,
            margin_bottom: 5,
            margin_start: 5,
            margin_end: 5,
            column_spacing: 20,
            row_spacing: 20
        });

        this._eventBox = new Gtk.EventBox({visible: true});
        this.connect('button-press-event', (actor, event) => {return true;});

        this._eventBox.drag_source_set(Gdk.ModifierType.BUTTON1_MASK, null, Gdk.DragAction.MOVE);
        let targets = new Gtk.TargetList(null);
        targets.add(Gdk.atom_intern('GTK_LIST_BOX_ROW', false), Gtk.TargetFlags.SAME_APP, 0);
        this._eventBox.drag_source_set_target_list(targets);
        this.drag_dest_set(Gtk.DestDefaults.ALL, null, Gdk.DragAction.MOVE);
        this.drag_dest_set_target_list(targets);


        this._eventBox.connect('button-press-event', (actor, event) => {return false;});
        this._eventBox.connect('enter-notify-event', (actor, event) => {return false;});
        this._eventBox.connect('leave-notify-event', (actor, event) => {return false;});
        this._eventBox.connect('button-release-event', (actor, event) => {return false;});
        
        this._eventBox.add(this._grid);
        this.x = 0;
        Gtk.ListBoxRow.prototype.add.call(this, this._eventBox);
        this._eventBox.connect("drag-begin", (widget, context) => {
            //get listbox parent
            let parent = widget.get_parent();
            let listBox = parent.get_parent();
            listBox.dragLeave = true;
            //get widgets parent - the listBoxDragRow
            listBox.dragRow = parent;
            //create a new copy drag row 
            let alloc = this.get_allocation();
            let window = widget.get_window();
            let [_window, x, y] = window.get_device_position(context.get_device());
            let dragWidget = this.createDragRow(alloc);
            listBox.dragWidget = dragWidget;
            Gtk.drag_set_icon_widget(context, dragWidget, x, y);
        });

        this.connect("drag-leave", (widget)=> {
            this.set_state_flags(Gtk.StateFlags.NORMAL, true);
            let listBox = widget.get_parent();
            listBox.drag_unhighlight_row();
            listBox.dragLeave = true;
        });

        this._eventBox.connect("drag-end", (widget, context)=> {
            let parent = widget.get_parent();
            let listBox = parent.get_parent();
            listBox.drag_unhighlight_row();
            if(listBox.dragWidget){
                listBox.dragWidget.hide();
                listBox.dragWidget.destroy();
                listBox.dragWidget = null;
            }
        });

        this.connect("drag-motion", (widget)=> {
            let listBox = widget.get_parent();
            if(listBox.dragLeave){
                listBox.drag_highlight_row(widget);
                listBox.dragLeave = false;
                
                if(!scrolledWindow)
                    return true;

                let alloc = widget.get_allocation();

                let height = alloc.height;
                alloc = scrolledWindow.get_allocation();
                let scrollHeight = alloc.height;
                let widgetLoc = widget.get_index() * height;
                let value = scrolledWindow.vadjustment.value;
                
                if((widgetLoc + (height * 4)) > (value + scrollHeight))
                    scrolledWindow.vadjustment.value += height;
                else if((widgetLoc - (height * 2)) < value)
                    scrolledWindow.vadjustment.value -= height;

            }
        });

        this._eventBox.connect("drag-failed", (widget, context, result)=> {
            let parent = widget.get_parent();
            let listBox = parent.get_parent();
            listBox.dragWidget.hide();
            listBox.dragWidget.destroy();
            listBox.dragWidget = null;
            return true;
        });
        
        this.connect("drag-drop", (widget, context, x, y, selection, info, time)=> {
            //get listbox parent 
            let listBox = this.get_parent();
            let index = widget.get_index();
            listBox.remove(listBox.dragRow);
            listBox.show_all();
            listBox.insert(listBox.dragRow, index);
            listBox.show_all();
            this.resetButton ? this.resetButton.set_sensitive(true) : null;
            this.saveButton.set_sensitive(true);
            Gtk.drag_finish(context, true, Gdk.DragAction.MOVE, time);
        });
    }

    createDragRow(alloc){
        let dragWidget = new Gtk.ListBox();

        let dragRow = new FrameBoxRow();
        dragRow.set_size_request(alloc.width, alloc.height);
        dragWidget.add(dragRow);
        dragWidget.drag_highlight_row(dragRow);

        let image = new Gtk.Image( {
            gicon: this._gicon,
            pixel_size: 22
        });

        let imageBox = new Gtk.Box({
            margin_start: 0,
            hexpand: false,
            vexpand: true,
            spacing: 5,
        });
        let dragImage = new Gtk.Image( {
            gicon: Gio.icon_new_for_string("drag-symbolic"),
            pixel_size: 12
        });

        imageBox.add(dragImage);
        imageBox.add(image);

        dragRow.add(imageBox);

        let label = new Gtk.Label({
            use_markup: true,
            xalign: 0,
            hexpand: true,
            label: _(this._name)
        });
        dragRow.add(label);
        let grid = new Gtk.Grid({
            margin_top: 0,
            margin_bottom: 0,
            vexpand: false,
            hexpand: false,
            column_spacing: 10
        })
        let editButton = new Gtk.Button({
            image:  new Gtk.Image({
                icon_name: 'view-more-symbolic'
            }),
        });
        grid.attach(editButton, 0, 0, 1, 1);

        if(this.hasSwitch){
            let modifyButton = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
                margin_start: 10,
                active: this.switchActive
            });
            grid.insert_column(0);
            grid.attach(Gtk.Separator.new(Gtk.Orientation.VERTICAL), 0, 0, 1, 1);
            grid.insert_column(0);
            grid.attach(modifyButton, 0, 0, 1, 1);
        }
        if(this.hasEditButton){
            let editButton = new Button({
                icon_name: 'text-editor-symbolic',
            });
            grid.insert_column(0);
            grid.attach(Gtk.Separator.new(Gtk.Orientation.VERTICAL), 0, 0, 1, 1);
            grid.insert_column(0);
            grid.attach(editButton, 0, 0, 1, 1);
        }
        dragRow.add(grid);

        dragWidget.show_all();
        return dragWidget;
    }

    add(widget) {
        this._grid.attach(widget, this.x, 0, 1, 1);
        this.x++;
    }
    
    setVerticalAlignmentBottom(){
        this._grid.vexpand = true;
        this._grid.valign = Gtk.Align.END;
    }
});

var EditEntriesBox = GObject.registerClass({
    Signals: {
        'modify': {},
        'change': {},
        'move-up': {},
        'move-down': {},
        'delete': {},
    },
},  class Arc_Menu_EditEntriesBox extends Gtk.Grid{
    _init(params){
        super._init({
            margin_top: 0,
            margin_bottom: 0,
            vexpand: false,
            hexpand: false,
            column_spacing: 10
        });
        let editPopover = new Gtk.Popover();
        let frameRow = params.frameRow;
        let frame = params.frame;
        let buttons = params.buttons;

        let modifyButton, deleteButton, changeButton;

        if(params.modifyButton){
            modifyButton = new Gtk.Button({
                label: _("Modify"),
                relief: Gtk.ReliefStyle.NONE
            });
            modifyButton.connect('clicked', () => {
                editPopover.popdown();
                this.emit('modify');
            });
        }

        if(params.changeButton){
            changeButton = new Button({
                icon_name: 'text-editor-symbolic',
            });
            changeButton.connect('clicked', () => {
                editPopover.popdown();
                this.emit('change');
            });
        }

        let editButton = new Gtk.MenuButton({
            image:  new Gtk.Image({
                icon_name: 'view-more-symbolic'
            }),
            popover: editPopover
        });
        editButton.connect("clicked", ()=>{
            editPopover.show_all();
        });

        this.attach(editButton, 0, 0, 1, 1);

        let editPopoverBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL
        });

        editPopover.add(editPopoverBox);

        let moveUpButton = new Gtk.Button({
            label: _("Move Up"),
            relief: Gtk.ReliefStyle.NONE
        });
        moveUpButton.connect('clicked', ()=> {
            this.emit('move-up');
            let index = frameRow.get_index();
            if(index > 0){
                frame.remove(frameRow);
                frame.insert(frameRow, index - 1);
            }
            frame.show_all();
            buttons.forEach(button => button.set_sensitive(true));
            editPopover.popdown();
        });

        let moveDownButton = new Gtk.Button({
            label: _("Move Down"),
            relief: Gtk.ReliefStyle.NONE
        });
        moveDownButton.connect('clicked', ()=> {
            this.emit('move-down');
            let index = frameRow.get_index();
            if(index + 1 < frame.count) {
              frame.remove(frameRow);
              frame.insert(frameRow, index + 1);
            }
            frame.show_all();
            buttons.forEach(button => button.set_sensitive(true));
            editPopover.popdown();
        });

        if(params.deleteButton){
            deleteButton = new Gtk.Button({
                label: _("Delete"),
                relief: Gtk.ReliefStyle.NONE
            });
            deleteButton.connect('clicked', ()=> {
                this.emit('delete');
                frame.remove(frameRow);
                frame.show_all();
                buttons.forEach(button => button.set_sensitive(true));
                editPopover.popdown();
            });
        }

        if(params.changeButton){
            this.insert_column(0);
            this.attach(Gtk.Separator.new(Gtk.Orientation.VERTICAL), 0, 0, 1, 1);
            this.insert_column(0);
            this.attach(changeButton, 0, 0, 1, 1);
        }

        if(params.modifyButton){
            editPopoverBox.add(modifyButton);
            editPopoverBox.add(Gtk.Separator.new(Gtk.Orientation.HORIZONTAL));
        }

        editPopoverBox.add(moveUpButton);
        editPopoverBox.add(moveDownButton);

        if(params.deleteButton){
            editPopoverBox.add(Gtk.Separator.new(Gtk.Orientation.HORIZONTAL));
            editPopoverBox.add(deleteButton);
        }
    }
});

var StackListBox = GObject.registerClass(class Arc_Menu_StackListBox extends Gtk.ListBox{
    _init(widget, params){
        super._init(params);
        this.valign = Gtk.Align.FILL;
        this.vexpand = true;
        this.hexpand = false;
        this.settingsFrameStack = widget.settingsFrameStack;
        this.settingsListStack = widget.settingsListStack
        this.connect("row-selected", (self, row) => {
            if(row){
                let stackName = row.stackName;
                this.settingsFrameStack.set_visible_child_name(stackName);
                if(row.nextPage){
                    if(widget.backButton.get_parent())
                        widget.leftHeaderBox.remove(widget.backButton);
                    widget.leftHeaderBox.add(widget.backButton);
                    this.settingsListStack.set_visible_child_name(row.nextPage);
                    this.settingsListStack.get_child_by_name(row.nextPage).listBox.selectFirstRow();
                }
            }
        });
        this.scrollWindow =  new Gtk.ScrolledWindow({
            valign: Gtk.Align.FILL,
            vexpand: true
        });
        this.scrollWindow.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.scrollWindow.add_with_viewport(this);
        this.scrollWindow.listBox = this;
    }

    getRowAtIndex(index){
        return this.get_row_at_index(index).get_children()[0];
    }

    getSelectedRow(){
        return this.get_selected_row().get_children()[0];
    }

    selectFirstRow(){
        this.select_row(this.get_row_at_index(0));
    }

    selectRowAtIndex(index){
        this.select_row(this.get_row_at_index(index));
    }

    addRow(name, translateableName, iconName, nextPage){
        let row1 = new Gtk.ListBoxRow();
        this.add(row1);

        let row = new Gtk.Grid({
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12, 
            column_spacing: 10
        });
        row1.add(row);
        row1.stackName = name;
        row1.translateableName = translateableName;
        
        let image = new Gtk.Image({ 
            icon_name: iconName
        });

        let label = new Gtk.Label({
            label: translateableName,
            halign: Gtk.Align.START,
        });
        row.attach(image, 0, 0, 1, 1);
        row.attach(label, 1, 0, 1, 1);

        if(nextPage){
            row1.nextPage = nextPage;
            let image2 = new Gtk.Image({ 
                gicon: Gio.icon_new_for_string('go-next-symbolic'),
                halign: Gtk.Align.END,
                hexpand: true
            });
            row.attach(image2, 2, 0, 1, 1);
        }
    }

    setSeparatorIndices(indexArray){
        this.set_header_func((_row, _before) =>{
            for(let i = 0; i < indexArray.length; i++){
                if(_row.get_index() === indexArray[i]){
                    let sep = Gtk.Separator.new(Gtk.Orientation.HORIZONTAL);
                    sep.show_all();
                    _row.set_header(sep);
                    
                }
            }
        });
    }
});

var TileGrid = GObject.registerClass(class Arc_Menu_TileGrid extends Gtk.FlowBox{
    _init(maxColumns) {
        super._init({
            row_spacing: 5,
            column_spacing: 5,
            vexpand: true,
            hexpand: true,
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.CENTER,
            max_children_per_line: maxColumns,
            homogeneous: true,
            selection_mode: Gtk.SelectionMode.NONE
        });
    }
});

var IconGrid = GObject.registerClass(class Arc_Menu_IconGrid extends Gtk.FlowBox{
    _init() {
        super._init({
            max_children_per_line: 7,
            row_spacing: 10,
            column_spacing: 10,
            vexpand: true,
            hexpand: false,
            valign: Gtk.Align.START,
            halign: Gtk.Align.CENTER,
            homogeneous: true,
            selection_mode: Gtk.SelectionMode.SINGLE
        });
        this.childrenCount = 0;
    }

    add(widget){
        this.insert(widget, -1);
        this.childrenCount++;
    }
});

var Tile = GObject.registerClass(class Arc_Menu_Tile extends FrameBox{
    _init(name, file, width, height, layout) {
        super._init({
            hexpand: true,
            vexpand: false,
            halign: Gtk.Align.FILL,
            valign: Gtk.Align.CENTER
        });
        this.box = new FrameBoxRow();
        this.box.activatable = true;
        this.box._grid.row_spacing = 0;
        this.box._grid.orientation = Gtk.Orientation.VERTICAL,
        this.activatable = true;
        this.name = name;
        this.layout = layout;
        this._image = new Gtk.Image({
            
            gicon: Gio.icon_new_for_string(file),
            pixel_size: width
        });
        this._label = new Gtk.Label({ label: _(this.name) });

        this.box._grid.attach(this._image, 0, 0, 1, 1);
        this.box._grid.attach(this._label, 0, 1, 1, 1);
        this._listBox.add(this.box);
    }
});

var LayoutTile = GObject.registerClass(class Arc_Menu_LayoutTile extends FrameBox{
    _init(name, file, layout) {
        super._init({
            halign: Gtk.Align.FILL,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            vexpand: false
        });
        this._listBox.set_selection_mode(Gtk.SelectionMode.NONE);
        this.name = name;
        this.layout = layout.MENU_TYPE;
        
        this.box = new FrameBoxRow();
        this.box.activatable = true;
        this.box._grid.row_spacing = 0;
        this.box._grid.column_spacing = 0;

        this._image = new Gtk.Image({ 
            hexpand: false,
            halign: Gtk.Align.START,
            gicon: Gio.icon_new_for_string(file),
            pixel_size: 46
        });
        
        let titleLabel = new Gtk.Label({
            label: "<b>" + _("%s Menu Layouts", layout.TITLE).format(layout.TITLE) + "</b>",
            use_markup: true,
            hexpand: true,
            halign: Gtk.Align.CENTER,
            vexpand: true,
            valign: Gtk.Align.CENTER,
            wrap: true,
        })

        let goNextImage = new Gtk.Image({
            gicon: Gio.icon_new_for_string('go-next-symbolic'),
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            hexpand: false,
            vexpand: false,
        })

        this.box._grid.attach(this._image, 0, 0, 1, 2);
        this.box._grid.attach(titleLabel, 1, 0, 1, 1);
        this.box._grid.attach(goNextImage, 2, 0, 1, 2);
        
        this._listBox.add(this.box);
   }
});
