import { INotebookTracker, Notebook, NotebookActions, NotebookPanel, NotebookTracker } from "@jupyterlab/notebook";
import { IStatusBar } from "@jupyterlab/statusbar";
import { Widget } from "@lumino/widgets";
import { Signal, ISignal } from "@lumino/signaling";

import { EventMessage } from "./types";
import recordOnSVG from "./icons/record_on.svg";
import recordOffSVG from "./icons/record_off.svg";
import stopSVG from "./icons/stop.svg";
import playSVG from "./icons/play.svg";
import ejectSVG from "./icons/eject.svg";
import recordStatusSVG from "./icons/record_status.svg";
import stopStatusSVG from "./icons/stop_status.svg";
import playStatusSVG from "./icons/play_status.svg";
import { JupyterFrontEnd } from "@jupyterlab/application";
import { CellModel, Cell, ICellModel } from '@jupyterlab/cells'
import { CodeMirrorEditor } from "@jupyterlab/codemirror";

export class MessageAggregator {

  private _eventMessage: EventMessage;
  public _eventMessages: Array<EventMessage> = [];
  private _app: JupyterFrontEnd;
  private _notebookTracker: INotebookTracker;

  constructor({ app }: { app: JupyterFrontEnd }) {

    this.init = this.init.bind(this);

    this._app = app;

    this.init();
  }

  private dispose() {
    Signal.disconnectAll(this);
  }

  public init() {
    this._eventMessage = {
      event: "",
      notebook_id: "",
      timestamp: 0
    };
  }

  public aggregate(message: EventMessage) {

    switch (message.event) {
      case "cell_started":
      case "capture_stopped":
      case "execution_finished":
      case "record_off":
        message.start_timestamp = this._eventMessage.timestamp;
        message.stop_timestamp = message.timestamp;
        message.duration = message.stop_timestamp - message.start_timestamp;
      default: ;
    }

    this._eventMessage = message;

    this._eventMessages.push(message);
    console.log(message.input, message);
  }

  public async save() {

    let notebookPanel: NotebookPanel;

    try {
      notebookPanel = await this._app.commands.execute("notebook:create-new", {
        kernelName: "python3", cwd: ""
      });

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;

      notebookPanel.content.model.metadata.set("etc_jupyterlab_authoring", JSON.stringify(this._eventMessages));
      await notebookPanel.context.saveAs();
    }
    catch (e) {
      console.error(e);
    }
  }

}

export class MessagePlayer {
  private _messages: Array<EventMessage>;
  private _notebookPanel: NotebookPanel;
  private _notebook: Notebook;
  private _messageIndex: number;
  private _timeoutId: number;

  constructor({ notebookPanel }: { notebookPanel: NotebookPanel }) {
    this._notebookPanel = notebookPanel;
    this._notebook = notebookPanel.content;

    this.createCell = this.createCell.bind(this);
    this.play = this.play.bind(this);

    this._messageIndex = 0;
    this._messages = JSON.parse(this._notebookPanel.content.model.metadata.get("etc_jupyterlab_authoring") as string);
    this._notebookPanel.content.model.cells.removeRange(0, this._notebookPanel.content.model.cells.length);
    const cell = this._notebook.model.contentFactory.createCell(
      this._notebook.notebookConfig.defaultCell,
      {}
    );

    this._notebookPanel.content.model.cells.insert(0, cell);

    console.log(this._messages);
  }

  public play() {
    console.log("MessagePlayer#play");

    let message = this._messages[this._messageIndex];

    if (message) {

      if (message.event == "line") {

        if (message.cell_index > this._notebook.model.cells.length - 1) {
          this.createCell(message.cell_index);
          //  The Notebook may not have sufficient cells; hence, create cells to accomodate the cell index.
        }

        let cell = this._notebook.widgets[message.cell_index];
        let index = 0;

        let intervalId = setInterval(() => {

          if (index > message.input.length - 1) {

            clearInterval(intervalId);

            (cell.editor as CodeMirrorEditor).doc.replaceRange(
              "\n",
              { line: message.line_index, ch: message.input.length }
            );

            this._messageIndex = this._messageIndex + 1;

            this._timeoutId = setTimeout(this.play, 1000);
            return;
          }

          let pos = {
            line: message.line_index,
            ch: index
          };

          (cell.editor as CodeMirrorEditor).doc.replaceRange(message.input[index], pos);

          index = index + 1;

        }, 100);
      }
      else {
        this._messageIndex = this._messageIndex + 1;

        this._timeoutId = setTimeout(this.play, 1000);
      }
    }
  }

  private createCell(index: number) {

    this._notebook.select(this._notebook.widgets[this._notebook.widgets.length - 1]);

    while (this._notebook.model.cells.length <= index) {
      NotebookActions.insertBelow(this._notebook);
    }
  }
}

export class RecordButton extends Widget {

  private _isEnabled: boolean;
  private _enabled: Signal<RecordButton, any> = new Signal(this);
  private _disabled: Signal<RecordButton, any> = new Signal(this);
  private _messageAggregator: MessageAggregator;
  private _notebookPanel: NotebookPanel;
  private _statusIndicator: StatusIndicator;

  constructor(
    { notebookPanel, messageAggregator, statusIndicator }:
      {
        notebookPanel: NotebookPanel,
        messageAggregator: MessageAggregator,
        statusIndicator: StatusIndicator
      }
  ) {
    super({ node: document.createElement("button") })

    this._messageAggregator = messageAggregator;
    this._notebookPanel = notebookPanel;
    this._statusIndicator = statusIndicator;

    this.off = this.off.bind(this);
    this.on = this.on.bind(this);
    this.toggle = this.toggle.bind(this);
    this.keydown = this.keydown.bind(this);

    this.node.innerHTML = recordOffSVG;
    this.addClass("etc-jupyterlab-authoring-button");

    window.addEventListener("keydown", this.keydown, true);
    this.node.addEventListener("click", this.toggle);
  }

  public dispose() {
    window.removeEventListener("keydown", this.keydown, true);
  }

  private keydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key == "F9" && this._notebookPanel.isVisible) {
      event.preventDefault();
      this.toggle();
    }
  }

  public off() {
    if (this._isEnabled) {
      this.node.innerHTML = recordOffSVG;
      this._isEnabled = false;
      this._disabled.emit({ event: "record_off" });
      this._messageAggregator.aggregate({
        event: "record_off",
        notebook_id: this._notebookPanel.content.id,
        timestamp: Date.now()
      });
      this._statusIndicator.stop();
    }
  }

  public on() {
    if (!this._isEnabled) {
      this.node.innerHTML = recordOnSVG;
      this._isEnabled = true;
      this._enabled.emit({ event: "record_on" });
      this._messageAggregator.aggregate({
        event: "record_on",
        notebook_id: this._notebookPanel.content.id,
        timestamp: Date.now()
      });
      this._statusIndicator.record();
    }
  }

  public toggle() {
    if (this._isEnabled) {
      this.off();
    }
    else {
      this.on();
    }
  }

  get enabled(): ISignal<RecordButton, any> {
    return this._enabled;
  }

  get disabled(): ISignal<RecordButton, any> {
    return this._disabled;
  }
}


export class PlayButton extends Widget {

  private _isEnabled: boolean;
  private _enabled: Signal<PlayButton, any> = new Signal(this);
  private _disabled: Signal<PlayButton, any> = new Signal(this);
  private _messageAggregator: MessageAggregator;
  private _notebookPanel: NotebookPanel;
  private _statusIndicator: StatusIndicator;

  constructor(
    { notebookPanel, messageAggregator, statusIndicator }:
      {
        notebookPanel: NotebookPanel,
        messageAggregator: MessageAggregator,
        statusIndicator: StatusIndicator
      }
  ) {

    super({ node: document.createElement("button") })

    this._messageAggregator = messageAggregator;
    this._notebookPanel = notebookPanel;
    this._statusIndicator = statusIndicator;

    this.off = this.off.bind(this);
    this.on = this.on.bind(this);
    this.toggle = this.toggle.bind(this);
    this.keydown = this.keydown.bind(this);

    this.node.innerHTML = playSVG;
    this.addClass("etc-jupyterlab-authoring-button");


    window.addEventListener("keydown", this.keydown, true);
    this.node.addEventListener("click", this.toggle);
  }

  public dispose() {
    window.removeEventListener("keydown", this.keydown, true);
  }

  private keydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key == "F11" && this._notebookPanel.isVisible) {
      event.preventDefault();
      this.toggle();
    }
  }

  public off() {
    this._isEnabled = false;
    this._disabled.emit({ event: "play_off" });
    this._statusIndicator.stop();
  }

  public on() {
    this._isEnabled = true;
    this._enabled.emit({ event: "play_on" });
    this._statusIndicator.play();
  }

  public toggle() {
    if (this._isEnabled) {
      this.off();
    }
    else {
      this.on();
    }
  }

  get enabled(): ISignal<PlayButton, any> {
    return this._enabled;
  }

  get disabled(): ISignal<PlayButton, any> {
    return this._disabled;
  }
}


export class StopButton extends Widget {

  private _isEnabled: boolean;
  private _pressed: Signal<StopButton, any> = new Signal(this);
  private _messageAggregator: MessageAggregator;
  private _notebookPanel: NotebookPanel;
  private _statusIndicator: StatusIndicator;

  constructor(
    { notebookPanel, messageAggregator, statusIndicator }:
      {
        notebookPanel: NotebookPanel,
        messageAggregator: MessageAggregator,
        statusIndicator: StatusIndicator
      }
  ) {

    super({ node: document.createElement("button") })

    this._messageAggregator = messageAggregator;
    this._notebookPanel = notebookPanel;
    this._statusIndicator = statusIndicator;

    this.stop = this.stop.bind(this);
    this.keydown = this.keydown.bind(this);

    this.node.innerHTML = stopSVG;
    this.addClass("etc-jupyterlab-authoring-button");


    window.addEventListener("keydown", this.keydown, true);
    this.node.addEventListener("click", this.stop);
  }

  public dispose() {
    window.removeEventListener("keydown", this.keydown, true);
  }

  private keydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key == "F12" && this._notebookPanel.isVisible) {
      event.preventDefault();
      this.stop();
    }
  }

  public stop() {
    this._isEnabled = false;
    this._pressed.emit(null);
    this._statusIndicator.stop();
  }


  get pressed(): ISignal<StopButton, any> {
    return this._pressed;
  }
}

export class SaveButton extends Widget {

  private _pressed: Signal<SaveButton, any> = new Signal(this);
  private _messageAggregator: MessageAggregator;
  private _notebookPanel: NotebookPanel;

  constructor(
    { notebookPanel, messageAggregator }:
      {
        notebookPanel: NotebookPanel,
        messageAggregator: MessageAggregator
      }
  ) {

    super({ node: document.createElement("button") })

    this._messageAggregator = messageAggregator;
    this._notebookPanel = notebookPanel;

    this.save = this.save.bind(this);
    this.keydown = this.keydown.bind(this);

    this.node.innerHTML = ejectSVG;
    this.addClass("etc-jupyterlab-authoring-button");

    window.addEventListener("keydown", this.keydown, true);
    this.node.addEventListener("click", this.save);
  }

  public dispose() {
    window.removeEventListener("keydown", this.keydown, true);
  }

  private keydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key == "F11" && this._notebookPanel.isVisible) {
      event.preventDefault();
      this.save();
    }
  }

  public save() {
    this._pressed.emit(null);
    this._messageAggregator.save();
  }

  get pressed(): ISignal<SaveButton, any> {
    return this._pressed;
  }
}

export class StatusIndicator extends Widget {

  private _statusBar: IStatusBar;

  constructor() {
    super();
    this.stop = this.stop.bind(this);
    this.record = this.record.bind(this);
    this.play = this.play.bind(this);

    this.addClass("jp-StatusIndicator");

    this.node.innerHTML = stopStatusSVG;
  }

  public stop() {
    this.node.innerHTML = stopStatusSVG;
  }

  public play() {
    this.node.innerHTML = playStatusSVG;
  }

  public record() {
    this.node.innerHTML = recordStatusSVG;
  }
}