import { Widget, Panel} from "@lumino/widgets";

import { NotebookPanel } from "@jupyterlab/notebook";

import {
    stopStatus,
    playStatus,
    pauseStatus,
    recordStatus
} from './icons'

export class AuthoringStatus {

    public panel: Panel;

    private secondsWidget: Widget;
    private stateWidget: Widget;
    private secondsMap: WeakMap<NotebookPanel, number>;
    private stateMap: WeakMap<NotebookPanel, string>;
    private currentNotebookPanel: NotebookPanel;

    constructor() {

        this.panel = new Panel();

        this.secondsWidget = new Widget();
        this.stateWidget = new Widget()

        this.panel.addWidget(this.stateWidget);
        this.panel.addWidget(this.secondsWidget);

        this.secondsMap = new WeakMap<NotebookPanel, number>();
        this.stateMap = new WeakMap<NotebookPanel, string>();

        this.panel.addClass('jp-AuhtoringStatus');
    }

    public updateCurrentNotebookPanel(notebookPanel: NotebookPanel) {

        if (notebookPanel) {

            this.currentNotebookPanel = notebookPanel;

            this.renderSeconds();
            this.renderState();
        }
    }

    public setSeconds(notebookPanel: NotebookPanel, value: number) {

        this.secondsMap.set(notebookPanel, value);

        this.renderSeconds();
    }

    public setState(notebookPanel: NotebookPanel, value: string) {

        this.stateMap.set(notebookPanel, value);

        this.renderState();
    }

    private renderSeconds() {

        if (this.currentNotebookPanel.isVisible) {


            if (!this.secondsMap.has(this.currentNotebookPanel)) {

                this.secondsMap.set(this.currentNotebookPanel, 0);
            }

            this.secondsWidget.node.innerHTML = `${this.secondsMap.get(this.currentNotebookPanel)} seconds`;
        }
    }

    private renderState() {

        if (this.currentNotebookPanel.isVisible) {

            if (!this.stateMap.has(this.currentNotebookPanel)) {

                this.stateMap.set(this.currentNotebookPanel, 'stop');
            }

            switch (this.stateMap.get(this.currentNotebookPanel)) {

                case 'stop':
                    stopStatus.element({
                        container: this.stateWidget.node,
                        stylesheet: 'toolbarButton',
                        alignSelf: 'normal',
                        height: '20px'
                    });
                    break;
                case 'record':
                    recordStatus.element({
                        container: this.stateWidget.node,
                        stylesheet: 'toolbarButton',
                        alignSelf: 'normal',
                        height: '22px'
                    });
                    break;
                case 'play':
                    playStatus.element({
                        container: this.stateWidget.node,
                        stylesheet: 'toolbarButton',
                        alignSelf: 'normal',
                        height: '22px'
                    });
                    break;
                case 'pause':
                    pauseStatus.element({
                        container: this.stateWidget.node,
                        stylesheet: 'toolbarButton',
                        alignSelf: 'normal',
                        height: '22px'
                    });
                    break;
            }
        }
    }
}