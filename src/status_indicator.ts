import { Widget } from "@lumino/widgets";

import { INotebookTracker, NotebookPanel } from "@jupyterlab/notebook";

import {
    stopStatus,
    playStatus,
    recordStatus
} from './icons'

export class StatusIndicator {

    private _map: WeakMap<NotebookPanel, string>;
    private _currentNotebookPanel: NotebookPanel;
    private _widget: Widget;

    constructor({ widget }: { widget: Widget }) {

        this.onStopped = this.onStopped.bind(this);
        this.onRecorderStarted = this.onRecorderStarted.bind(this);
        this.onPlayerStarted = this.onPlayerStarted.bind(this);

        this._widget = widget;

        this._map = new WeakMap<NotebookPanel, string>();
    }

    public get onPlayerStopped() {
        return this.onStopped;
    }

    public get onRecorderStopped() {
        return this.onStopped;
    }

    public onStopped(sender: any, notebookPanel: NotebookPanel) {

        this._map.set(notebookPanel, 'stop');

        this.updateStatus();
    }

    public onPlayerStarted(sender: any, notebookPanel: NotebookPanel) {

        this._map.set(notebookPanel, 'play');

        this.updateStatus();
    }

    public onRecorderStarted(sender: any, notebookPanel: NotebookPanel) {

        this._map.set(notebookPanel, 'record');

        this.updateStatus();
    }

    public onCurrentChanged(sender: INotebookTracker, notebookPanel: NotebookPanel) {

        if (notebookPanel) {
            if (!this._map.has(notebookPanel)) {

                this._map.set(notebookPanel, 'stop');
            }

            this._currentNotebookPanel = notebookPanel;

            this.updateStatus();
        }
    }

    public updateStatus() {

        if (this._currentNotebookPanel.isVisible) {

            switch (this._map.get(this._currentNotebookPanel)) {
                case 'stop':
                    stopStatus.element({
                        container: this._widget.node,
                        stylesheet: 'toolbarButton',
                        alignSelf: 'normal',
                        height: '24px'
                    });
                    break;
                case 'record':
                    recordStatus.element({
                        container: this._widget.node,
                        stylesheet: 'toolbarButton',
                        alignSelf: 'normal',
                        height: '24px'
                    });
                    break;
                case 'play':
                    playStatus.element({
                        container: this._widget.node,
                        stylesheet: 'toolbarButton',
                        alignSelf: 'normal',
                        height: '24px'
                    });
                    break;
            }
        }
    }

}
