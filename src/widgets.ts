import {
  JupyterFrontEnd
} from "@jupyterlab/application";

import {
  NotebookPanel,
  Notebook,
  NotebookActions,
  INotebookTracker,
  NotebookTracker
} from "@jupyterlab/notebook";

import {
  Cell,
  CodeCell,
  ICellModel,
  MarkdownCell
} from "@jupyterlab/cells";

import {
  IObservableList
} from "@jupyterlab/observables";

import { Widget } from "@lumino/widgets";

import { ISignal, Signal } from "@lumino/signaling";

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import recordOn from "./icons/record_on.svg";
import recordOff from "./icons/record_off.svg";
import playOn from "./icons/play_on.svg";
import playOff from "./icons/play_off.svg";

import { Editor } from "codemirror";

import { consoleIcon } from "@jupyterlab/ui-components";
import { Message } from "@jupyterlab/services/lib/kernel/messages";
import { EventMessage } from "./types"

export class ToggleButton extends Widget {

  protected _buttonEnabled: Signal<ToggleButton, EventMessage> = new Signal(this);
  protected _buttonDisabled: Signal<ToggleButton, EventMessage> = new Signal(this);

  protected _notebookTracker: INotebookTracker;
  protected _keyBinding: string;
  protected _eventName: string;
  protected _off: string;
  protected _on: string;
  protected _position: number;
  protected _altName: string;

  constructor({ onHTML, offHTML }:
    { onHTML: string, offHTML: string }) {
    super({ tag: "button" });

    this.toggle = this.toggle.bind(this);

    this._off = offHTML;
    this._on = onHTML;
    this.node.innerHTML = offHTML;

    this.node.addEventListener("click", this.toggle);
  }

  public dispose() {
    this.node.removeEventListener("click", this.toggle);
    Signal.disconnectAll(this);
    super.dispose();
  }

  public off(sender?: any, args?: any) {
    this.node.innerHTML = this._off;
    this.node.blur();
  }

  public on(sender?: any, args?: any) {
    this.node.innerHTML = this._on;
    this.node.blur();
  }

  public toggle(sender?: any, args?: any) {
    this.node.innerHTML = this.node.innerHTML == this._on ? this._off : this._on;
    this.node.blur();
  }

  get buttonEnabled(): ISignal<ToggleButton, any> {
    return this._buttonEnabled;
  }

  get buttonDisabled(): ISignal<ToggleButton, any> {
    return this._buttonDisabled;
  }
}

export class RecordButton extends ToggleButton {
  constructor({ notebookTracker }: { notebookTracker: INotebookTracker }) {
    super({
      onHTML: recordOn,
      offHTML: recordOff
    })

    window.addEventListener("keydown", this.keydown, true)

  }

  public dispose() {
    window.removeEventListener("keydown", this.keydown, true);
    super.dispose();
  }

  public off() {
    super.off();
    this._buttonDisabled.emit({
      event: this._eventName + "_off",
      notebook_id: this._notebookTracker.currentWidget.content.id,
      timestamp: Date.now()
    });
  }

  public on() {
    super.on();
    this._buttonEnabled.emit({
      event: this._eventName + "_on",
      notebook_id: this._notebookTracker.currentWidget.content.id,
      timestamp: Date.now()
    });
  }

  private keydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key == "F9") {
      this.toggle();
    }
  }
}

export class PlayButton extends ToggleButton {
  constructor({ notebookTracker }: { notebookTracker: INotebookTracker }) {
    super({
      onHTML: recordOn,
      offHTML: recordOff
    })

    window.addEventListener("keydown", this.keydown, true)
  }

  public dispose() {
    window.removeEventListener("keydown", this.keydown, true);
    super.dispose();
  }

  public off() {
    super.off();
  }

  public on() {
    super.on();
  }

  private keydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key == "F10") {
      this.toggle();
    }
  }
}