/// <reference types="@types/dom-mediacapture-record" />

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
import { ISignal, Signal } from "@lumino/signaling";
import { MessageRecorder } from "./message_recorder";
import { StatusIndicator } from './status_indicator';

export class MessagePlayer {

  public recording: Blob;
  public eventMessages: Array<EventMessage>;

  private _contentModel: PartialJSONValue;
  private _notebookPanel: NotebookPanel;
  private _notebook: Notebook;
  private _intervalId: number;
  private _editor: CodeMirrorEditor;
  private _isRecording: boolean = false;
  private _audio: HTMLAudioElement;
  private _player: Promise<any>;
  private _executeCell: boolean;
  private _scrollToCell: boolean;
  private _messageRecorder: MessageRecorder;
  private _statusIndicator: StatusIndicator;
  private _recording: Promise<Blob>;
  private _scrollCheckbox: HTMLElement;
  private _executionCheckbox: HTMLElement;
  private _mediaRecorder: MediaRecorder;

  public isPlaying: boolean = false;

  constructor({
    notebookPanel,
    messageRecorder,
    statusIndicator,
    executionCheckbox,
    scrollCheckbox
  }: {
    notebookPanel: NotebookPanel
    messageRecorder: MessageRecorder,
    statusIndicator: StatusIndicator,
    executionCheckbox: HTMLElement,
    scrollCheckbox: HTMLElement
  }) {

    this._notebookPanel = notebookPanel;
    this._notebook = notebookPanel.content;
    this._statusIndicator = statusIndicator;
    this._executionCheckbox = executionCheckbox;
    this._scrollCheckbox = scrollCheckbox;

    this._messageRecorder.messagePlayer = this;

    this.handleExecutionCheckboxChange = this.handleExecutionCheckboxChange.bind(this);
    this.handleScrollCheckboxEvent = this.handleScrollCheckboxEvent.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);

    notebookPanel.disposed.connect(this.dispose, this);

    window.addEventListener("keydown", this.handleKeydown, true);
    this._executionCheckbox.addEventListener('change', this.handleExecutionCheckboxChange, true);
    this._scrollCheckbox.addEventListener('change', this.handleScrollCheckboxEvent, true);

    if (this._notebookPanel.content.model.metadata.has('etc_jupyterlab_authoring')) {

      let data = JSON.parse(this._notebookPanel.content.model.metadata.get('etc_jupyterlab_authoring') as string);

      this.eventMessages = data.eventMessages;

      this._contentModel = notebookPanel.content.model.toJSON();
      //  The Notebook needs to be saved so that it can be reset; hence freeze the Notebook.

      (async () => {

        try {

          let result = await fetch(data.audio);

          this.recording = await result.blob();
        }
        catch (e) {

          console.error(e);
        }
      })();
    }
  }

  private dispose() {

    clearInterval(this._intervalId);

    window.removeEventListener("keydown", this.handleKeydown, true);
    this._executionCheckbox.removeEventListener('change', this.handleExecutionCheckboxChange, true);
    this._scrollCheckbox.removeEventListener('change', this.handleScrollCheckboxEvent, true);

    Signal.disconnectAll(this);
  }

  handleExecutionCheckboxChange(event: Event) {
    this._executeCell = (event.target as HTMLInputElement).checked
  }

  handleScrollCheckboxEvent(event: Event) {
    this._scrollToCell = (event.target as HTMLInputElement).checked
  }

  handleKeydown(event: KeyboardEvent) {

    try {

      if (this._notebookPanel.isVisible) {

        if (event.ctrlKey && event.key == "F9") {
          if (!this.isPlaying && !this._messageRecorder.isRecording) {

            event.stopImmediatePropagation();
            event.preventDefault();

            this.resetNotebook();
          }
        }
        else if (event.ctrlKey && event.key == "F9") {

          if (this.isPlaying) {

            event.stopImmediatePropagation();
            event.preventDefault();

            this.stopPlayer();
          }
        }
        else if (event.ctrlKey && event.key == "F10") {

          if (!this.isPlaying && !this._messageRecorder.isRecording) {

            event.stopImmediatePropagation();
            event.preventDefault();

            this.startPlayer();
          }
        }
      }
    }
    catch (e) {
      console.log(e);
    }
  }

  public async stopPlayer() {

    try {
      if (this._notebookPanel.isVisible && this.isPlaying) {

        this.isPlaying = false;

        this._audio.pause();

        await this._player;

        this._statusIndicator.stop(this._notebookPanel);
      }
    }
    catch (e) {

      console.error(e);
    }
  }

  private async startDisplayRecording() {

    try {

      this._mediaRecorder = new MediaRecorder(await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true }));

      let displayRecording = new Promise<Blob>((r, j) => {

        let recordings: Array<Blob> = [];

        this._mediaRecorder.addEventListener('dataavailable', (event: BlobEvent) => {

          recordings.push(event.data);
        });

        this._mediaRecorder.addEventListener('stop', () => {

          r(new Blob(recordings));
        });

        this._mediaRecorder.addEventListener('error', j);
      });

      this._mediaRecorder.start();

      await displayRecording;

      return displayRecording;
    }
    catch (e) {
      console.error(e);
    }
  }

  private async startAudioPlayback() {
    try {
      this._audio = new Audio();

      this._audio.src = URL.createObjectURL(this.recording);

      let audio = new Promise((r, j) => {

        this._audio.addEventListener('ended', r);

        this._audio.addEventListener('error', j);
      })

      await this._audio.play();

      await audio;

      return audio;
    }
    catch (e) {
      console.error(e);
    }
  }

  public async startPlayer() {

    try {

      let displayRecording = this.startDisplayRecording();

      this._contentModel = this._notebookPanel.content.model.toJSON();

      this._statusIndicator.play(this._notebookPanel);

      //
      const cell = this._notebookPanel.content.model.contentFactory.createCell(
        this._notebookPanel.content.notebookConfig.defaultCell,
        {}
      );

      //
      this._notebookPanel.content.model.cells.insert(0, cell);

      this._notebookPanel.content.model.cells.removeRange(1, this._notebookPanel.content.model.cells.length);
      //  The playback is done on an empty Notebook; hence remove all the cells from the current Notebook.

      this.isPlaying = true;

      let audio = this.startAudioPlayback();

      for (let index = 0; this.isPlaying && index < this.eventMessages.length; index++) {

        let message = this.eventMessages[index];

        await (this._player = this.playMessage(message));
      }

      await audio;

      this._mediaRecorder.stop()

      let a = document.createElement("a");

      a.href = URL.createObjectURL(await displayRecording);

      a.download = "file.webm";

      a.click();

    }
    catch (e) {

      console.error(e);
    }
    finally {

      this._statusIndicator.stop(this._notebookPanel);
      
      this.isPlaying = false;
    }
  }

  public async playMessage(message: EventMessage) {

    if (message.cell_type) {
      //  Some events depend on having a cell; hence, this block will only handle events that have a cell_type.

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

          for (let charIndex = 0; this.isPlaying && charIndex < message.input.length; charIndex++) {

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

  public resetNotebook() {

    try {

      this._notebookPanel.content.model.fromJSON(this._contentModel);

      this._notebookPanel.content.model.initialize();
    }
    catch (e) {

      console.error(e);
    }
  }
}