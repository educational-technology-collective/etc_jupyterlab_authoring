import { ISettingRegistry } from "@jupyterlab/settingregistry";
import { Widget, Panel, BoxPanel } from "@lumino/widgets";
import { ISignal, Signal } from "@lumino/signaling";
import {
    recordOffButton,
    stopButton,
    playButton,
    pauseButton,
    ejectButton,
    saveButton
} from './icons';
import { ShowMediaControlsCheckbox } from "./components";
import { NotebookPanel } from "@jupyterlab/notebook";

export class MediaControls {

    public panel: BoxPanel;

    private _buttonPressed: Signal<MediaControls, { command: string }> = new Signal<MediaControls, { command: string }>(this);

    private _resetButton: HTMLElement;
    private _recordButton: HTMLElement;
    private _stopButton: HTMLElement;
    private _playButton: HTMLElement;
    private _pauseButton: HTMLElement;
    private _saveButton: HTMLElement;
    private _showMediaControlsCheckbox: ShowMediaControlsCheckbox;

    constructor({ 
        notebookPanel,
        settings, 
        showMediaControlsCheckbox 
    }: {
        notebookPanel: NotebookPanel,
        settings: ISettingRegistry.ISettings, 
        showMediaControlsCheckbox: ShowMediaControlsCheckbox 
    }) {

        let mediaControlsBoxPanel = this.panel = new BoxPanel({ direction: 'left-to-right', alignment: 'start' });

        mediaControlsBoxPanel.addClass('jp-MediaControlsBoxPanel');

        let recordOffButtonElement = recordOffButton.element({ className: 'record' });
        recordOffButtonElement.setAttribute('name', 'record');
        recordOffButtonElement.addEventListener('click', this, true);

        let stopButtonElement = stopButton.element({ className: 'stop' });
        stopButtonElement.setAttribute('name', 'stop');
        stopButtonElement.addEventListener('click', this, true);

        let playButtonElement = playButton.element({ className: 'play' });
        playButtonElement.setAttribute('name', 'play');
        playButtonElement.addEventListener('click', this, true);

        let pauseButtonElement = pauseButton.element({ className: 'pause' });
        pauseButtonElement.setAttribute('name', 'pause');
        pauseButtonElement.addEventListener('click', this, true);

        let resetButtonElement = ejectButton.element({ className: 'reset' });
        resetButtonElement.setAttribute('name', 'reset');
        resetButtonElement.addEventListener('click', this, true);

        let saveButtonElement = saveButton.element({ className: 'save' });
        saveButtonElement.setAttribute('name', 'save');
        saveButtonElement.addEventListener('click', this, true);

        mediaControlsBoxPanel.addWidget(new Widget({ node: recordOffButtonElement }));
        mediaControlsBoxPanel.addWidget(new Widget({ node: stopButtonElement }));
        mediaControlsBoxPanel.addWidget(new Widget({ node: playButtonElement }));
        mediaControlsBoxPanel.addWidget(new Widget({ node: pauseButtonElement }));
        mediaControlsBoxPanel.addWidget(new Widget({ node: resetButtonElement }));
        mediaControlsBoxPanel.addWidget(new Widget({ node: saveButtonElement }));

        settings.changed.connect(this.updateToolTips, this);

        showMediaControlsCheckbox.checkboxChanged.connect(this.updatePanelVisibily, this);

        this.updateToolTips(settings);

        this.updatePanelVisibily(showMediaControlsCheckbox, showMediaControlsCheckbox.checked);
    }

    dispose() {
        Signal.disconnectAll(this);
    }

    public async handleEvent(event: Event) {

        try {

            if (event.type == 'click') {

                let command = (event.currentTarget as HTMLElement).getAttribute('name');

                this._buttonPressed.emit({ command });
            }
        }
        catch (e) {

            console.error(e);
        }
    }

    private updateToolTips(settings: ISettingRegistry.ISettings, args: void) {

        ['record', 'stop', 'play', 'pause', 'reset', 'save'].forEach((value: string) => {

            let keyBinding = settings.get(value).composite.toString();

            this.panel.node.querySelector(
                `.${value}`
            ).setAttribute(
                'title', `${value[0].toUpperCase() + value.slice(1)}: ${keyBinding}`
            );
        });
    }

    public updatePanelVisibily(sender: ShowMediaControlsCheckbox, state: boolean) {

        this.panel.setHidden(!state);
    }

    get buttonPressed(): ISignal<MediaControls, { command: string }> {
        return this._buttonPressed;
    }
}