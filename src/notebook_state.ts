import {
  JSONExt,
  JSONObject,
  PartialJSONObject,
  PartialJSONValue,
  ReadonlyPartialJSONObject
} from '@lumino/coreutils';
import { INotebookModel, Notebook, NotebookActions, NotebookPanel } from "@jupyterlab/notebook";
import { EventMessage } from "./types";
import { CodeCell, Cell, ICellModel, MarkdownCell } from '@jupyterlab/cells'
import { CodeMirrorEditor } from "@jupyterlab/codemirror";
import { ExecutionCheckbox, PlayButton } from "./controls";
import { ISignal, Signal } from "@lumino/signaling";
import { MessageRecorder } from "./message_recorder";
import { MessagePlayer } from './message_player';
import { DocumentRegistry } from "@jupyterlab/docregistry";

export class NotebookState {

  private _contentModel: PartialJSONValue;
  private _notebookPanel: NotebookPanel;
  private _isPlaying: boolean = false;
  private _isRecording: boolean = false;

  constructor({ notebookPanel }: { notebookPanel: NotebookPanel }) {

    this.onPlayerStarted = this.onPlayerStarted.bind(this);
    this.onSaveState = this.onSaveState.bind(this);

    this._notebookPanel = notebookPanel;

    notebookPanel.disposed.connect(this.onDisposed, this);

    this._contentModel = notebookPanel.content.model.toJSON();
    //  The Notebook needs to be saved so that it can be reset; hence freeze the Notebook.

    notebookPanel.context.saveState.connect(this.onSaveState, this);
  }

  private onDisposed(sender: NotebookPanel, args: any) {

    Signal.disconnectAll(this);
  }

  public onSaveState(context: DocumentRegistry.IContext<INotebookModel>, saveState: DocumentRegistry.SaveState) {

    if (saveState.match("completed") && !this._isPlaying && !this._isRecording) {

      this._contentModel = this._notebookPanel.content.model.toJSON();
    }
  }

  public async onResetPressed(sender: any, args: any) {

    try {
      if (this._notebookPanel.isVisible && !this._isPlaying && !this._isRecording) {

        this._notebookPanel.content.model.fromJSON(this._contentModel);

        this._notebookPanel.content.model.initialize();

        await this._notebookPanel.context.save();
      }
    }
    catch (e) {

      console.error(e);
    }
  }

  public onPlayerStarted(sender: MessagePlayer, args: any) {
    this._isPlaying = true;
  }

  public onPlayerStopped(sender: MessagePlayer, args: any) {
    this._isPlaying = false;
  }

  public onRecorderStarted(sender: MessageRecorder, args: any) {
    this._isRecording = true;
  }

  public onRecorderStopped(sender: MessageRecorder, args: any) {
    this._isRecording = false;
  }
}