import { Notebook, NotebookActions, NotebookPanel } from "@jupyterlab/notebook";
import { EventMessage } from "./types";
import { JupyterFrontEnd } from "@jupyterlab/application";
import { CodeCell, Cell, ICellModel, MarkdownCell, RawCell } from '@jupyterlab/cells'
import { CodeMirrorEditor } from "@jupyterlab/codemirror";
import { PlayButton } from "./components";
import { Signal } from "@lumino/signaling";


export class MessagePlayer {

  private _messages: Array<EventMessage>;
  private _message: EventMessage;
  private _notebookPanel: NotebookPanel;
  private _notebook: Notebook;
  private _messageIndex: number;
  private _charIndex: number;
  private _intervalId: number;
  private _cell: Cell<ICellModel>;
  private _editor: CodeMirrorEditor;
  private _isRecording: boolean;
  private _isMessageFinished: boolean;
  private _isAudioFinished: boolean;
  private _audio: HTMLAudioElement;

  constructor({ notebookPanel }: { notebookPanel: NotebookPanel }) {

    this.createCellsTo = this.createCellsTo.bind(this);
    this.createLinesTo = this.createLinesTo.bind(this);
    this.printChar = this.printChar.bind(this);
    this.playMessage = this.playMessage.bind(this);
    this.onPlayPressed = this.onPlayPressed.bind(this);
    this.onRecordPressed = this.onRecordPressed.bind(this);
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

  public onRecordPressed() {
    this._isRecording = true;
  }

  public onStopPressed() {
    this._isRecording = false;
  }

  public onPlayPressed(sender: PlayButton, event: Event) {

    if (
      !this._isRecording &&
      this._notebookPanel.isVisible &&
      this._notebookPanel.content.model.metadata.has("etc_jupyterlab_authoring")
    ) {

      this._messageIndex = 0;

      this._audio = new Audio();

      this._audio.addEventListener('ended', () => {

        this._isAudioFinished = true;

        console.log('AUDIO FINISHED')

        if (this._isMessageFinished) {

          this._messageIndex = this._messageIndex + 1;

          setTimeout(this.playMessage, 0);
        }
      });

      this._messages = ((this._notebookPanel.content.model.metadata.get("etc_jupyterlab_authoring") as unknown) as Array<EventMessage>);

      this._notebookPanel.content.model.cells.removeRange(0, this._notebookPanel.content.model.cells.length);

      const cell = this._notebookPanel.content.model.contentFactory.createCell(
        this._notebookPanel.content.notebookConfig.defaultCell,
        {}
      );

      this._notebookPanel.content.model.cells.insert(0, cell);

      this.playMessage();
    }
  }

  public async playMessage() {

    this._isMessageFinished = false;
    this._isAudioFinished = false;

    this._message = this._messages[this._messageIndex];

    if (this._message) {

      console.log(`Playing message ${this._messageIndex}. event: ${this._message.event}`);

      if (this._message.recordingDataURL) {

        try {

          let result = await fetch(this._message.recordingDataURL);

          let blob = await result.blob();

          let objectURL = URL.createObjectURL(blob);

          this._audio.src = objectURL;

          this._audio.load();

          await this._audio.play();
        }
        catch (e) {

          console.error(e);
        }
      }
      else {

        this._isAudioFinished = true;
      }

      if (this._message.event == "line_finished" || this._message.event == "record_stopped") {

        if (this._message.cell_index > this._notebook.model.cells.length - 1) {

          this.createCellsTo(this._message.cell_index);
          //  The Notebook may not have sufficient cells; hence, create cells to accomodate the cell index.
        }

        this._cell = this._notebook.widgets[this._message.cell_index];

        if (this._message.cell_type && this._message.cell_type != this._cell.model.type) {

          this._notebook.select(this._notebook.widgets[this._message.cell_index]);

          if (this._message.cell_type == "markdown") {

            NotebookActions.changeCellType(this._notebook, "markdown");

            this._cell = this._notebook.widgets[this._message.cell_index];

            (this._cell as MarkdownCell).rendered = true;
          }
          else if (this._message.cell_type == "raw") {

            NotebookActions.changeCellType(this._notebook, "raw");

            this._cell = this._notebook.widgets[this._message.cell_index];
          }
        }

        this._editor = (this._cell.editor as CodeMirrorEditor);

        if (this._message.line_index > this._editor.lastLine()) {

          this.createLinesTo(this._message.line_index);
        }

        this._charIndex = 0;

        let timeout = this._message.input.length ? this._message.duration / this._message.input.length : 0;

        this._intervalId = setInterval(this.printChar, timeout);
      }
      else if (this._message.event == "execution_finished") {

        this._isMessageFinished = true;

        (this._cell as CodeCell).model.outputs.fromJSON(this._message.outputs);

        if (this._isAudioFinished) {

          this._messageIndex = this._messageIndex + 1;

          setTimeout(this.playMessage, this._message.duration);
        }
      }
      else {

        let duration = this._message.duration ? this._message.duration : 0;

        this._isMessageFinished = true;

        if (this._isAudioFinished) {

          this._messageIndex = this._messageIndex + 1;

          setTimeout(this.playMessage, duration);
        }
      }
    }
  }

  private printChar() {

    if (this._charIndex > this._message.input.length - 1) {

      clearInterval(this._intervalId);

      this._isMessageFinished = true;

      if (this._isAudioFinished) {

        this._messageIndex = this._messageIndex + 1;

        console.log('MESSAGE FINISHED')

        setTimeout(this.playMessage, 500);
      }

      return;
    }

    let pos = {
      line: this._message.line_index,
      ch: this._charIndex
    };

    this._editor.doc.replaceRange(this._message.input[this._charIndex], pos);

    this._cell.update();

    this._charIndex = this._charIndex + 1;
  }

  private createCellsTo(index: number) {

    this._notebook.select(this._notebook.widgets[this._notebook.widgets.length - 1]);

    while (this._notebook.model.cells.length <= index) {

      NotebookActions.insertBelow(this._notebook);
    }
  }

  private createLinesTo(index: number) {
    console.log("MessagePlayer#createLinesTo", index);

    let lastLine: number = this._editor.lastLine();

    while (lastLine < index) {

      let lastChar: number = this._editor.getLine(lastLine).length;

      this._editor.doc.replaceRange(
        "\n",
        { line: lastLine, ch: lastChar });

      lastLine = this._editor.lastLine();
    }
  }
}