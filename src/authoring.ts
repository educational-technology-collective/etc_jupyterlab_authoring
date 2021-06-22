import { INotebookTracker } from "@jupyterlab/notebook";
import { IStatusBar } from "@jupyterlab/statusbar";
import { Widget } from "@lumino/widgets";
import { Signal, ISignal } from "@lumino/signaling";

import { EventMessage } from "./types";
import recordSVG from "./icons/record.svg";
import stopSVG from "./icons/stop.svg";
import playSVG from "./icons/play.svg";

export class MessageAggregator {

  private _eventMessage: EventMessage;
  public _eventMessages: Array<EventMessage> = [];

  constructor() {
    this._eventMessage = {
      event: "",
      notebook_id: "",
      timestamp: 0
    };
  }

  private dispose() {
    Signal.disconnectAll(this);
  }

  aggregate(message: EventMessage) {

    switch (message.event) {
      case "capture_started":
      case "capture_stopped":
      case "execution_finished":
        message.start_timestamp = this._eventMessage.timestamp;
        message.stop_timestamp = message.timestamp;
        message.duration = message.stop_timestamp - message.start_timestamp;
      default: ;
    }

    this._eventMessage = message;

    this._eventMessages.push(message);
    console.log(message.input, message);
  }
}

export class MessagePlayer {

  private _messageAggregator: MessageAggregator;

  constructor(
    { messageAggregator }:
      { messageAggregator: MessageAggregator }
  ) {

    this._messageAggregator = messageAggregator;
  }

  play() {

  }
}

export class RecordButton {

  private _isEnabled: boolean;
  private _enabled: Signal<RecordButton, any> = new Signal(this);
  private _disabled: Signal<RecordButton, any> = new Signal(this);
  private _messageAggregator: MessageAggregator;
  private _notebookTracker: INotebookTracker;
  private _statusIndicator: StatusIndicator;

  constructor(
    { notebookTracker, messageAggregator, statusIndicator }:
      {
        notebookTracker: INotebookTracker,
        messageAggregator: MessageAggregator,
        statusIndicator: StatusIndicator
      }
  ) {

    this._messageAggregator = messageAggregator;
    this._notebookTracker = notebookTracker;
    this._statusIndicator = statusIndicator;

    this.off = this.off.bind(this);
    this.on = this.on.bind(this);
    this.toggle = this.toggle.bind(this);
    this.keydown = this.keydown.bind(this);

    window.addEventListener("keydown", this.keydown, true)
  }

  public dispose() {
    window.removeEventListener("keydown", this.keydown, true);
  }

  private keydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key == "F9") {
      event.preventDefault();
      this.toggle();
    }
  }

  public off() {
    this._isEnabled = false;
    this._messageAggregator.aggregate({
      event: "record_off",
      notebook_id: this._notebookTracker.currentWidget.content.id,
      timestamp: Date.now()
    });
    this._disabled.emit({ event: "record_off" });
    this._statusIndicator.stop();
  }

  public on() {
    this._isEnabled = true;
    this._messageAggregator.aggregate({
      event: "record_on",
      notebook_id: this._notebookTracker.currentWidget.content.id,
      timestamp: Date.now()
    });
    this._enabled.emit({ event: "record_on" });
    this._statusIndicator.record();
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

export class StatusIndicator extends Widget {

  private _statusBar: IStatusBar;

  constructor() {
    super();
    this.stop = this.stop.bind(this);
    this.record = this.record.bind(this);
    this.play = this.play.bind(this);

    this.addClass("jp-StatusIndicator");

    this.node.innerHTML = stopSVG;
  }

  public stop() {
    this.node.innerHTML = stopSVG;
  }

  public play() {
    this.node.innerHTML = playSVG;
  }

  public record() {
    this.node.innerHTML = recordSVG;
  }
}