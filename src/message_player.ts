import { Notebook, NotebookActions, NotebookPanel } from "@jupyterlab/notebook";
import { EventMessage } from "./types";
import { CodeCell, Cell, ICellModel, MarkdownCell } from '@jupyterlab/cells'
import { CodeMirrorEditor } from "@jupyterlab/codemirror";
import { ExecutionCheckbox, PlayButton } from "./components";
import { ISignal, Signal } from "@lumino/signaling";

export class MessagePlayer {

  private _playerStarted: Signal<MessagePlayer, NotebookPanel> = new Signal<MessagePlayer, NotebookPanel>(this);
  private _playerStopped: Signal<MessagePlayer, NotebookPanel> = new Signal<MessagePlayer, NotebookPanel>(this);

  private _messages: Array<EventMessage>;
  private _notebookPanel: NotebookPanel;
  private _notebook: Notebook;
  private _intervalId: number;
  private _cell: Cell<ICellModel>;
  private _editor: CodeMirrorEditor;
  private _isRecording: boolean = false;
  private _isPlaying: boolean = false;
  private _audio: HTMLAudioElement;
  private _player: Promise<any>;
  private _executeCell: boolean;

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

    this._isRecording = false;

    notebookPanel.disposed.connect(this.onDisposed, this);
  }

  public onDisposed(sender: NotebookPanel | MessagePlayer, args: any) {

    clearInterval(this._intervalId);

    Signal.disconnectAll(this);
  }

  public onExecutionCheckboxChanged(sender: ExecutionCheckbox, state: boolean) {

    this._executeCell = state;
  }

  public onRecorderStarted() {

    this._isRecording = true;
  }

  public onRecorderStopped() {

    this._isRecording = false;
  }

  public async onStopPressed() {

    if (this._isPlaying && this._notebookPanel.isVisible) {

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
        this._notebookPanel.isVisible &&
        this._notebookPanel.content.model.metadata.has("etc_jupyterlab_authoring")
      ) {

        this._audio = new Audio();

        this._messages = ((this._notebookPanel.content.model.metadata.get("etc_jupyterlab_authoring") as unknown) as Array<EventMessage>);

        const cell = this._notebookPanel.content.model.contentFactory.createCell(
          this._notebookPanel.content.notebookConfig.defaultCell,
          {}
        );

        this._notebookPanel.content.model.cells.insert(0, cell);

        this._notebookPanel.content.model.cells.removeRange(1, this._notebookPanel.content.model.cells.length);

        this._playerStarted.emit(this._notebookPanel);

        this._isPlaying = true;

        for (let index = 0; this._isPlaying && index < this._messages.length; index++) {

          let message = this._messages[index];

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

    try {

      let audioEnded: Promise<any>;
      let printEnded: Promise<any>;

      if (message?.recordingDataURL && message?.recordingDataURL.includes('base64')) {

        try {

          let result = await fetch(message.recordingDataURL);

          let blob = await result.blob();

          let objectURL = URL.createObjectURL(blob);

          this._audio.src = objectURL;

          audioEnded = new Promise((r, j) => {

            this._audio.onended = r;

            this._audio.onpause = r;
          })

          this._audio.load();

          await this._audio.play();
        }
        catch (e) {

          audioEnded = Promise.resolve();
        }
      }
      else {

        audioEnded = Promise.resolve();
      }

      if (message.event == "line_finished" || message.event == "record_stopped") {

        if (message.cell_index > this._notebook.model.cells.length - 1) {

          this.createCellsTo(message.cell_index);
          //  The Notebook may not have sufficient cells; hence, create cells to accomodate the cell index.
        }

        this._cell = this._notebook.widgets[message.cell_index];

        if (message.cell_type && message.cell_type != this._cell.model.type) {

          this._notebook.select(this._notebook.widgets[message.cell_index]);

          if (message.cell_type == "markdown") {

            NotebookActions.changeCellType(this._notebook, "markdown");

            this._cell = this._notebook.widgets[message.cell_index];

            (this._cell as MarkdownCell).rendered = true;
          }
          else if (message.cell_type == "raw") {

            NotebookActions.changeCellType(this._notebook, "raw");

            this._cell = this._notebook.widgets[message.cell_index];
          }
        }

        this._editor = (this._cell.editor as CodeMirrorEditor);

        if (message.line_index > this._editor.lastLine()) {

          this.createLinesTo(message.line_index);
        }

        let timeout = message.input.length ? message.duration / message.input.length : 0;

        for (let charIndex=0; this._isPlaying && charIndex < message.input.length; charIndex++) {

          let pos = {
            line: message.line_index,
            ch: charIndex
          };

          this._editor.doc.replaceRange(message.input[charIndex], pos);

          this._cell.update();

          await new Promise<void>((r, j) => setTimeout(() => r(), timeout));
        }

        printEnded = Promise.resolve();
      }
      else if (message.event == "execution_finished") {

        if (!this._isPlaying) {

          printEnded = Promise.resolve();
        }
        else {

          if (this._executeCell) {

            await NotebookActions.runAndAdvance(this._notebookPanel.content, this._notebookPanel.sessionContext);

            printEnded = Promise.resolve();
          }
          else {

            printEnded = new Promise((r, j) => {

              (this._cell as CodeCell).model.outputs.fromJSON(message.outputs);

              setTimeout(r, message.duration);
            });
          }
        }
      }
      else {

        let duration = message.duration ? message.duration : 0;

        if (!this._isPlaying) {

          printEnded = Promise.resolve();
        }
        else {

          printEnded = new Promise((r, j) => {

            setTimeout(r, duration);
          });
        }
      }

      return Promise.all([audioEnded, printEnded]);
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