import { Widget } from "@lumino/widgets";

import { INotebookTracker, NotebookPanel } from "@jupyterlab/notebook";

import {
    stopStatus,
    playStatus,
    pauseStatus,
    recordStatus
} from './icons'

export class StatusIndicator {

    private _map: WeakMap<NotebookPanel, string>;
    private _currentNotebookPanel: NotebookPanel;
    private _widget: Widget;

    constructor({ widget }: { widget: Widget }) {

        this._widget = widget;

        this._map = new WeakMap<NotebookPanel, string>();
    }

    public stop(notebookPanel: NotebookPanel) {

        this._map.set(notebookPanel, 'stop');

        this.updateStatus();
    }

    public play(notebookPanel: NotebookPanel) {

        this._map.set(notebookPanel, 'play');

        this.updateStatus();
    }

    public pause(notebookPanel: NotebookPanel) {

        this._map.set(notebookPanel, 'pause');

        this.updateStatus();
    }

    public record(notebookPanel: NotebookPanel) {

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
                case 'pause':
                    pauseStatus.element({
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
