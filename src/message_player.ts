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
import { ExecutionCheckbox, PlayButton, ScrollCheckbox } from "./controls";
import { ISignal, Signal } from "@lumino/signaling";
import { MessageRecorder } from "./message_recorder";

export class MessagePlayer {

  private _playerStarted: Signal<MessagePlayer, NotebookPanel> = new Signal<MessagePlayer, NotebookPanel>(this);
  private _playerStopped: Signal<MessagePlayer, NotebookPanel> = new Signal<MessagePlayer, NotebookPanel>(this);
  private _eventMessagesChanged: Signal<MessagePlayer, Array<EventMessage>> = new Signal<MessagePlayer, Array<EventMessage>>(this);

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
  private _scrollToCell: boolean;

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

    notebookPanel.disposed.connect(this.onDisposed, this);

    if (this._notebookPanel.content.model.metadata.has('etc_jupyterlab_authoring')) {

      let data = JSON.parse(this._notebookPanel.content.model.metadata.get('etc_jupyterlab_authoring') as string);

      this._eventMessages = data.eventMessages;

      this._recording = (async () => {

        try {

          let result = await fetch(data.audio);

          return result.blob();
        }
        catch (e) {

          console.error(e);
        }
      })();
    }
  }

  private onDisposed(sender: NotebookPanel, args: any) {

    clearInterval(this._intervalId);

    Signal.disconnectAll(this);
  }

  public onScrollCheckboxChanged(sender: ScrollCheckbox, state: boolean) {

    this._scrollToCell = state;
  }

  public onExecutionCheckboxChanged(sender: ExecutionCheckbox, state: boolean) {

    this._executeCell = state;
  }

  public async onNotebookInitializationStarted(sender: any, args: any) {

    try {
      if (
        this._notebookPanel.isVisible &&
        !this._isRecording
      ) {

        await this.onStopPressed();
      }
    }
    catch (e) {

      console.error(e);
    }
  }

  public onRecorderStarted() {

    this._isRecording = true;

    this._eventMessages = [];
  }

  public async onRecorderStopped(sender: MessageRecorder, args: NotebookPanel) {

    try {

      this._isRecording = false;

      this._eventMessages = sender.eventMessages;

      let recordings = await sender.recordings;

      this._recording = Promise.resolve(new Blob(recordings, { 'type': 'audio/ogg; codecs=opus' }));
    }
    catch (e) {

      console.error(e);
    }
  }

  public async onStopPressed() {

    try {
      if (this._notebookPanel.isVisible && this._isPlaying) {

        this._isPlaying = false;

        this._audio.pause();

        await this._player;

        this._playerStopped.emit(this._notebookPanel);
      }
    }
    catch (e) {

      console.error(e);
    }
  }

  public async onPlayPressed(sender: PlayButton, event: Event) {

    try {
      if (
        !this._isPlaying &&
        !this._isRecording &&
        this._notebookPanel.isVisible
      ) {

        this._playerStarted.emit(this._notebookPanel);

        //
        const cell = this._notebookPanel.content.model.contentFactory.createCell(
          this._notebookPanel.content.notebookConfig.defaultCell,
          {}
        );

        //
        this._notebookPanel.content.model.cells.insert(0, cell);

        this._notebookPanel.content.model.cells.removeRange(1, this._notebookPanel.content.model.cells.length);
        //  The playback is done on an empty Notebook; hence remove all the cells from the current Notebook.

        this._isPlaying = true;

        this._audio = new Audio();

        this._audio.src = URL.createObjectURL(await this._recording);

        let audioEnded = new Promise((r, j) => {

          this._audio.addEventListener('ended', r);

          this._audio.addEventListener('error', j);
        })

        await this._audio.play();

        for (let index = 0; this._isPlaying && index < this._eventMessages.length; index++) {

          let message = this._eventMessages[index];

          await (this._player = this.playMessage(message));
        }

        await audioEnded;
      }
    }
    catch (e) {

      console.error(e);
    }
    finally {

      this._playerStopped.emit(this._notebookPanel);

      this._isPlaying = false;
    }
  }

  public async playMessage(message: EventMessage) {

    if (message.cell_type) {
      //  Some evnets depend on having a cell; hence, this block will only handle events that have a cell_type.

      if (message.cell_index > this._notebook.model.cells.length - 1) {

        this.createCellsTo(message.cell_index);
        //  The Notebook may not have sufficient cells; hence, create cells to accomodate the cell index.
      }

      let cell: Cell<ICellModel> = this._notebook.widgets[message.cell_index];

      if (this._scrollToCell) {

        this._notebook.scrollToCell(cell);
      }

      if (message.event == "line_finished" || message.event == "record_stopped") {

        if (message.cell_type != cell.model.type) {
          //  The Cell may not be the same type as the recorded cell; hence, change the cell type accordingly.

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

        let duration = message.input.length ? message.duration / message.input.length : message.duration;

        if (message.input.length) {

          for (let charIndex = 0; this._isPlaying && charIndex < message.input.length; charIndex++) {

            let pos = {
              line: message.line_index,
              ch: charIndex
            };

            this._editor.doc.replaceRange(message.input[charIndex], pos);

            cell.update();

            await new Promise<void>((r, j) => setTimeout(r, duration));
          }
        }
        else {

          await new Promise<void>((r, j) => setTimeout(r, duration));
        }
      }
      else if (message.event == "execution_finished") {

        if (this._executeCell) {

          let resolved = null;

          let runAndAdvance = (async () => {

            await NotebookActions.runAndAdvance(this._notebookPanel.content, this._notebookPanel.sessionContext);

            resolved = true;
          })();

          await new Promise((r, j) => { setTimeout(r, message.duration) });

          if (!resolved) {

            this._audio.pause();

            await runAndAdvance;

            this._audio.play();
          }
        }
        else {

          await new Promise((r, j) => {

            (cell as CodeCell).model.outputs.fromJSON(message.outputs);

            setTimeout(r, message.duration);
          });
        }
      }
    }
    else {

      let duration = message.duration ? message.duration : 0;

      await new Promise((r, j) => { setTimeout(r, duration) });
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

  get eventMessagesChanged(): ISignal<MessagePlayer, Array<EventMessage>> {
    return this._eventMessagesChanged;
  }

  get eventMessages(): Array<EventMessage> {
    return this._eventMessages;
  }
}