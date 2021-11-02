import { PartialJSONValue } from '@lumino/coreutils';
import { INotebookModel, NotebookPanel } from "@jupyterlab/notebook";
import { Signal } from "@lumino/signaling";
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

    this._notebookPanel = notebookPanel;

    notebookPanel.disposed.connect(this.onDisposed, this);

    this._contentModel = notebookPanel.content.model.toJSON();
    //  The Notebook needs to be saved so that it can be reset; hence freeze the Notebook.
  }

  private onDisposed(sender: NotebookPanel, args: any) {

    Signal.disconnectAll(this);
  }

  public onResetPressed(sender: any, args: any) {

    try {
      if (this._notebookPanel.isVisible && !this._isPlaying && !this._isRecording) {

        this._notebookPanel.content.model.fromJSON(this._contentModel);

        this._notebookPanel.content.model.initialize();

        // await this._notebookPanel.context.save();
      }
    }
    catch (e) {

      console.error(e);
    }
  }

  public onPlayerStarted(sender: MessagePlayer, args: any) {

    this._isPlaying = true;

    this._contentModel = this._notebookPanel.content.model.toJSON();
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