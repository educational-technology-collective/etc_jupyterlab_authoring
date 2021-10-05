import { Notebook, NotebookActions, NotebookPanel } from "@jupyterlab/notebook";
import { EventMessage } from "./types";
import { JupyterFrontEnd } from "@jupyterlab/application";
import { CodeCell, Cell, ICellModel, MarkdownCell, RawCell } from '@jupyterlab/cells'
import { CodeMirrorEditor } from "@jupyterlab/codemirror";

export class MessageAggregator {

  public _eventMessages: Array<EventMessage> = [];
  private _lastMessageTimeStamp: number | null;

  constructor() {

    this.aggregate = this.aggregate.bind(this);

    this._lastMessageTimeStamp = null;
  }

  public aggregate(message: EventMessage) {

    switch (message.event) {
      case "cell_started":
      case "line_finished":
      case "execution_finished":
      case "record_stopped":

        message.start_timestamp = this._lastMessageTimeStamp === null ? message.timestamp : this._lastMessageTimeStamp;
        this._lastMessageTimeStamp = message.stop_timestamp = message.timestamp;
        message.duration = message.stop_timestamp - message.start_timestamp;
        //  The message must have a duration; hence, calculate a duration based on the timestamp of the previous message.
      default: ;
    }

    this._eventMessages.push(message);

    console.log(message.input, message);
  }
}

export class MessagePlayer {

  private _messages: Array<EventMessage>;
  private _message: EventMessage;
  private _notebookPanel: NotebookPanel;
  private _notebook: Notebook;
  private _messageIndex: number;
  private _charIndex: number;
  private _intervalId: number;
  private _timeout: number = 0;
  private _cell: Cell<ICellModel>;
  private _editor: CodeMirrorEditor;

  constructor({ notebookPanel, messages }: { notebookPanel: NotebookPanel, messages: Array<EventMessage>}) {

    this.createCellsTo = this.createCellsTo.bind(this);
    this.createLinesTo = this.createLinesTo.bind(this);
    this.printChar = this.printChar.bind(this);
    this.playMessage = this.playMessage.bind(this);

    this._notebookPanel = notebookPanel;
    this._messages = messages;

    this._notebook = notebookPanel.content;
    this._messageIndex = 0;
  }

  public async playMessage() {
    // console.log("MessagePlayer#play");

    this._message = this._messages[this._messageIndex];

    if (this._message) {

      console.log(`Playing message ${this._messageIndex}. event: ${this._message.event}`);

      if (this._message.recordingDataURL) {

        let result = await fetch(this._message.recordingDataURL);

        let blob = await result.blob();
  
        let objectURL = URL.createObjectURL(blob);
  
        let audio = new Audio(objectURL);
  
        await audio.play();
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

        if (this._message.duration < 500) {
          console.log('this._message.duration < 500');
          this._editor.doc.replaceRange(this._message.input, {
            line: this._message.line_index,
            ch: this._charIndex
          });

          this._cell.update();

          this._messageIndex = this._messageIndex + 1;

          setTimeout(this.playMessage, 0);
          //  The line was printed synchronously; hence, call play asynchronously.  This may permit interruption of playback.
        }
        else {

          let timeout = this._message.input.length ? this._message.duration / this._message.input.length : 0;

          this._intervalId = setInterval(this.printChar, timeout);
        }
      }
      else if (this._message.event == "execution_finished") {

        setTimeout(() => {

          (this._cell as CodeCell).model.outputs.fromJSON(this._message.outputs);

          this._messageIndex = this._messageIndex + 1;

          this.playMessage();

        }, this._message.duration);
      }
      else {

        let duration = this._message.duration ? this._message.duration : 0;

        setTimeout(() => {

          this._messageIndex = this._messageIndex + 1;

          this.playMessage();

        }, duration);
      }
    }
  }

  private printChar() {
    console.log("MessagePlayer#printChar");

    if (this._charIndex > this._message.input.length - 1) {

      clearInterval(this._intervalId);

      this._messageIndex = this._messageIndex + 1;

      this.playMessage();
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