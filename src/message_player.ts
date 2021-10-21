import {
  JSONExt,
  JSONObject,
  PartialJSONObject,
  PartialJSONValue,
  ReadonlyPartialJSONObject
} from '@lumino/coreutils';
import { Notebook, NotebookActions, NotebookPanel } from "@jupyterlab/notebook";
import { EventMessage } from "./types";
import { CodeCell, Cell, ICellModel, MarkdownCell } from '@jupyterlab/cells'
import { CodeMirrorEditor } from "@jupyterlab/codemirror";
import { ExecutionCheckbox, PlayButton } from "./components";
import { ISignal, Signal } from "@lumino/signaling";
import { IObservableUndoableList } from '@jupyterlab/observables';
import { MessageRecorder } from "./message_recorder";

export class MessagePlayer {

  private _playerStarted: Signal<MessagePlayer, NotebookPanel> = new Signal<MessagePlayer, NotebookPanel>(this);
  private _playerStopped: Signal<MessagePlayer, NotebookPanel> = new Signal<MessagePlayer, NotebookPanel>(this);

  private _eventMessages: Array<EventMessage>;
  private _notebookPanel: NotebookPanel;
  private _notebook: Notebook;
  private _intervalId: number;
  private _editor: CodeMirrorEditor;
  private _isRecording: boolean = false;
  private _isPlaying: boolean = false;
  private _audio: HTMLAudioElement;
  private _player: Promise<any>;
  private _recording: Promise<Blob>;
  private _executeCell: boolean;
  private _contentModel: PartialJSONValue;

  constructor({ notebookPanel }: { notebookPanel: NotebookPanel }) {

    this.createCellsTo = this.createCellsTo.bind(this);
    this.createLinesTo = this.createLinesTo.bind(this);
    this.playMessage = this.playMessage.bind(this);
    this.onPlayPressed = this.onPlayPressed.bind(this);
    this.onRecorderStarted = this.onRecorderStarted.bind(this);
    this.onRecorderStopped = this.onRecorderStopped.bind(this);
    this.onStopPressed = this.onStopPressed.bind(this);
    this.onDisposed = this.onDisposed.bind(this);

    this._notebookPanel = notebookPanel;

    this._notebook = notebookPanel.content;

    this._contentModel = notebookPanel.content.model.toJSON();

    notebookPanel.disposed.connect(this.onDisposed, this);

    if (this._notebookPanel.content.model.metadata.has('etc_jupyterlab_authoring')) {

      let data = JSON.parse(this._notebookPanel.content.model.metadata.get('etc_jupyterlab_authoring') as string);

      this._eventMessages = data.eventMessages;

      this._recording = (async () => {

        let result = await fetch(data.audio);

        return result.blob();
      })();
    }
  }

  public onDisposed(sender: NotebookPanel | MessagePlayer, args: any) {

    clearInterval(this._intervalId);

    Signal.disconnectAll(this);
  }

  public onExecutionCheckboxChanged(sender: ExecutionCheckbox, state: boolean) {

    this._executeCell = state;
  }

  public async onResetPressed(sender: any, args: any) {

    if (
      this._notebookPanel.isVisible &&
      !this._isRecording
    ) {

      await this.onStopPressed();

      this._notebookPanel.content.model.fromJSON(this._contentModel);

      this._notebookPanel.content.model.initialize();

      await this._notebookPanel.context.save();
    }
  }

  public onRecorderStarted() {

    this._isRecording = true;

    this._eventMessages = [];
  }

  public async onRecorderStopped(sender: MessageRecorder, args: NotebookPanel) {

    this._eventMessages = sender.eventMessages;

    let recordings = await sender.recordings;

    this._recording = Promise.resolve(new Blob(recordings, { 'type': 'audio/ogg; codecs=opus' }));

    this._isRecording = false;
  }

  public async onStopPressed() {

    if (this._notebookPanel.isVisible && this._isPlaying) {

      this._isPlaying = false;

      this._audio.pause();

      await this._player;

      this._playerStopped.emit(this._notebookPanel);
    }
  }

  public async onPlayPressed(sender: PlayButton, event: Event) {

    try {

      if (
        !this._isPlaying &&
        !this._isRecording &&
        this._notebookPanel.isVisible
      ) {

        this._contentModel = this._notebookPanel.content.model.toJSON();

        const cell = this._notebookPanel.content.model.contentFactory.createCell(
          this._notebookPanel.content.notebookConfig.defaultCell,
          {}
        );

        this._notebookPanel.content.model.cells.insert(0, cell);

        this._notebookPanel.content.model.cells.removeRange(1, this._notebookPanel.content.model.cells.length);

        this._playerStarted.emit(this._notebookPanel);

        this._isPlaying = true;

        this._audio = new Audio();

        this._audio.src = URL.createObjectURL(await this._recording);

        await this._audio.play();

        for (let index = 0; this._isPlaying && index < this._eventMessages.length; index++) {

          let message = this._eventMessages[index];

          await (this._player = this.playMessage(message));
        }

        this._playerStopped.emit(this._notebookPanel);

        this._isPlaying = false;
      }
    }
    catch (e) {

      console.error(e);
    }
  }

  public async playMessage(message: EventMessage) {

    if (message.cell_index > this._notebook.model.cells.length - 1) {

      this.createCellsTo(message.cell_index);
      //  The Notebook may not have sufficient cells; hence, create cells to accomodate the cell index.
    }

    let cell: Cell<ICellModel> = this._notebook.widgets[message.cell_index];

    try {

      if (message.event == "line_finished" || message.event == "record_stopped") {

        if (message.cell_type && message.cell_type != cell.model.type) {

          this._notebook.select(this._notebook.widgets[message.cell_index]);

          if (message.cell_type == "markdown") {

            NotebookActions.changeCellType(this._notebook, "markdown");

            cell = this._notebook.widgets[message.cell_index];

            (cell as MarkdownCell).rendered = true;
          }
          else if (message.cell_type == "raw") {

            NotebookActions.changeCellType(this._notebook, "raw");

            cell = this._notebook.widgets[message.cell_index];
          }
        }

        this._editor = (cell.editor as CodeMirrorEditor);

        if (message.line_index > this._editor.lastLine()) {

          this.createLinesTo(message.line_index);
        }

        let timeout = message.input.length ? message.duration / message.input.length : 0;

        for (let charIndex = 0; this._isPlaying && charIndex < message.input.length; charIndex++) {

          let pos = {
            line: message.line_index,
            ch: charIndex
          };

          this._editor.doc.replaceRange(message.input[charIndex], pos);

          cell.update();

          await new Promise<void>((r, j) => setTimeout(() => r(), timeout));
        }
      }
      else if (message.event == "execution_finished") {

        if (this._executeCell) {

          await NotebookActions.runAndAdvance(this._notebookPanel.content, this._notebookPanel.sessionContext);
        }
        else {

          await new Promise((r, j) => {

            (cell as CodeCell).model.outputs.fromJSON(message.outputs);

            setTimeout(r, message.duration);
          });
        }
      }
      else {

        let duration = message.duration ? message.duration : 0;

        await new Promise((r, j) => {

          setTimeout(r, duration);
        });
      }
    }
    catch (e) {

      console.error(e);
    }
  }

  private createCellsTo(index: number) {

    this._notebook.select(this._notebook.widgets[this._notebook.widgets.length - 1]);

    while (this._notebook.model.cells.length <= index) {

      NotebookActions.insertBelow(this._notebook);
    }
  }

  private createLinesTo(index: number) {

    let lastLine: number = this._editor.lastLine();

    while (lastLine < index) {

      let lastChar: number = this._editor.getLine(lastLine).length;

      this._editor.doc.replaceRange(
        "\n",
        { line: lastLine, ch: lastChar });

      lastLine = this._editor.lastLine();
    }
  }

  get playerStarted(): ISignal<MessagePlayer, NotebookPanel> {
    return this._playerStarted;
  }

  get playerStopped(): ISignal<MessagePlayer, NotebookPanel> {
    return this._playerStopped;
  }
}