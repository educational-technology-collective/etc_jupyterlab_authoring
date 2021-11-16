/// <reference types="@types/dom-mediacapture-record" />

import {
  PartialJSONValue,
} from '@lumino/coreutils';
import { Notebook, NotebookActions, NotebookPanel } from "@jupyterlab/notebook";
import { EventMessage } from "./types";
import { CodeCell, Cell, ICellModel, MarkdownCell } from '@jupyterlab/cells'
import { CodeMirrorEditor } from "@jupyterlab/codemirror";
import { MessageRecorder } from "./message_recorder";
import { StatusIndicator } from './status_indicator';
import { consoleIcon } from '@jupyterlab/ui-components';

export class MessagePlayer {

  public recording: Blob;
  public eventMessages: Array<EventMessage>;

  private _paused: boolean;
  private _stopped: boolean = true;
  private _contentModel: PartialJSONValue;
  private _notebookPanel: NotebookPanel;
  private _notebook: Notebook;
  private _intervalId: number;
  private _editor: CodeMirrorEditor;
  private _audioPlayer: HTMLAudioElement;
  private _audioPlayback: Promise<Event>;
  private _executeCell: boolean;
  private _scrollToCell: boolean;
  private _messageRecorder: MessageRecorder;
  private _statusIndicator: StatusIndicator;
  private _scrollCheckbox: HTMLElement;
  private _executionCheckbox: HTMLElement;
  private _savePlaybackCheckbox: HTMLElement;
  private _savePlayback: boolean;
  private _mediaRecorder: MediaRecorder;
  private _displayRecording: Promise<Blob>;
  private _charIndex: number;
  private _messageIndex: number;
  private _eventTarget: EventTarget;
  private _player: Promise<void>;

  constructor({
    notebookPanel,
    messageRecorder,
    statusIndicator,
    executionCheckbox,
    scrollCheckbox,
    savePlaybackCheckbox
  }: {
    notebookPanel: NotebookPanel
    messageRecorder: MessageRecorder,
    statusIndicator: StatusIndicator,
    executionCheckbox: HTMLElement,
    scrollCheckbox: HTMLElement,
    savePlaybackCheckbox: HTMLElement
  }) {

    this._eventTarget = new EventTarget();

    this._notebookPanel = notebookPanel;
    this._notebook = notebookPanel.content;
    this._statusIndicator = statusIndicator;
    this._executionCheckbox = executionCheckbox;
    this._scrollCheckbox = scrollCheckbox;
    this._savePlaybackCheckbox = savePlaybackCheckbox;

    this._messageRecorder = messageRecorder;
    this._messageRecorder.messagePlayer = this;

    this.handleExecutionCheckboxChange = this.handleExecutionCheckboxChange.bind(this);
    this.handleScrollCheckboxChange = this.handleScrollCheckboxChange.bind(this);
    this.handleSavePlayback = this.handleSavePlayback.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);

    notebookPanel.disposed.connect(this.dispose, this);

    window.addEventListener("keydown", this.handleKeydown, true);
    this._executionCheckbox.addEventListener('change', this.handleExecutionCheckboxChange, true);
    this._scrollCheckbox.addEventListener('change', this.handleScrollCheckboxChange, true);
    this._savePlaybackCheckbox.addEventListener('change', this.handleSavePlayback, true);

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
    this._scrollCheckbox.removeEventListener('change', this.handleScrollCheckboxChange, true);
  }

  handleExecutionCheckboxChange(event: Event) {
    this._executeCell = (event.target as HTMLInputElement).checked
  }

  handleScrollCheckboxChange(event: Event) {
    this._scrollToCell = (event.target as HTMLInputElement).checked
  }

  handleSavePlayback(event: Event) {
    this._savePlayback = (event.target as HTMLInputElement).checked
  }

  async handleKeydown(event: KeyboardEvent) {

    try {

      if (this._notebookPanel.isVisible) {

        if (event.ctrlKey && event.key == "F6") {

          if (this._stopped && !this._messageRecorder.isRecording) {

            event.stopImmediatePropagation();
            event.preventDefault();

            this.reset();
          }
        }
        else if (event.ctrlKey && event.key == "F9") {

          if (!this._stopped && !this._messageRecorder.isRecording) {

            event.stopImmediatePropagation();
            event.preventDefault();

            if (this._paused) {

              this._eventTarget.dispatchEvent(new Event('resume'));
            }

            await this.stop();
          }
        }
        else if (event.ctrlKey && event.key == "F10") {

          if (!this._messageRecorder.isRecording) {

            event.stopImmediatePropagation();
            event.preventDefault();

            if (!this._paused) {

              this._stopped = false;

              await (this._player = this.play());
            }
            else {

              await this.resume();
            }
          }
        }
        else if (event.ctrlKey && event.key == "F11") {

          if (!this._stopped && !this._messageRecorder.isRecording) {

            event.stopImmediatePropagation();
            event.preventDefault();

            await this.pause();
          }
        }
      }
    }
    catch (e) {

      console.error(e);
    }
  }

  private async resume() {

    if (this._savePlayback) {

      this._mediaRecorder.resume();
    }

    this._eventTarget.dispatchEvent(new Event('resume'));

    await this._audioPlayer.play();

    this._paused = false;

    this._stopped = false;

    this._statusIndicator.play(this._notebookPanel);
  }

  private async pause() {

    this._paused = true;

    await new Promise((r, j) => {

      this._eventTarget.addEventListener('paused', r, { once: true });
    })

    this._audioPlayer.pause();

    if (this._savePlayback) {

      this._mediaRecorder.pause();
    }

    this._statusIndicator.pause(this._notebookPanel);
  }

  public async stop() {

    this._stopped = true;

    await this._player;

    this._audioPlayer.pause();

    await this._audioPlayback;

    if (this._savePlayback) {

      this._mediaRecorder.stop();
    }

    this._statusIndicator.stop(this._notebookPanel);
  }

  public reset() {

    try {

      this._notebookPanel.content.model.fromJSON(this._contentModel);

      this._notebookPanel.content.model.initialize();
    }
    catch (e) {

      // console.error(e);
    }
  }

  private async play() {

    if (this._savePlayback) {

      await this.startDisplayRecording();
    }

    this._messageIndex = 0;
    this._charIndex = 0;

    this._contentModel = this._notebookPanel.content.model.toJSON();

    //
    const cell = this._notebookPanel.content.model.contentFactory.createCell(
      this._notebookPanel.content.notebookConfig.defaultCell,
      {}
    );

    //
    this._notebookPanel.content.model.cells.insert(0, cell);

    this._notebookPanel.content.model.cells.removeRange(1, this._notebookPanel.content.model.cells.length);
    //  The playback is done on an empty Notebook; hence remove all the cells from the current Notebook.

    await this.startAudioPlayback();

    this._statusIndicator.play(this._notebookPanel);

    while (!this._stopped && this._messageIndex < this.eventMessages.length) {

      if (this._paused) {

        await new Promise((r, j) => {

          this._eventTarget.addEventListener('resume', r, { once: true });

          this._eventTarget.dispatchEvent(new Event('paused'));
        });
      }

      let message = this.eventMessages[this._messageIndex];

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

            while (!this._stopped && this._charIndex < message.input.length) {

              if (this._paused) {

                await new Promise((r, j) => {

                  this._eventTarget.addEventListener('resume', r, { once: true });

                  this._eventTarget.dispatchEvent(new Event('paused'));
                });
              }

              let pos = {
                line: message.line_index,
                ch: this._charIndex
              };

              this._editor.doc.replaceRange(message.input[this._charIndex], pos);

              cell.update();

              await new Promise<void>((r, j) => setTimeout(r, duration));

              this._charIndex++
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

              try {

                await NotebookActions.runAndAdvance(this._notebookPanel.content, this._notebookPanel.sessionContext);

                resolved = true;
              }
              catch (e) { // This will cause an unhandled promise rejection warning, due to the setTimeout below; hence, do not allow this to reject.

                console.error(e);
              }
            })();

            await new Promise((r, j) => { setTimeout(r, message.duration) });

            if (!resolved) {
              //  This is the case where the execution is taking longer than the duration.

              this._audioPlayer.pause();

              await runAndAdvance;

              this._audioPlayer.play();
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

      this._messageIndex++; this._charIndex = 0;
    }

    if (!this._stopped) {

      await this._audioPlayback;

      if (this._savePlayback) {

        this._mediaRecorder.stop();
      }

      this._statusIndicator.stop(this._notebookPanel);
    }
  }

  private async startDisplayRecording() {

    this._mediaRecorder = new MediaRecorder(await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true }));

    (async () => {

      try {

        this._displayRecording = new Promise<Blob>((r, j) => {

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

        await this._displayRecording;
      }
      catch (e) {

        console.error(e);
      }
    })();
  }

  private async startAudioPlayback() {

    if (!this._paused) {

      this._audioPlayer = new Audio();

      this._audioPlayer.src = URL.createObjectURL(this.recording);
    }

    (async () => {

      try {

        this._audioPlayback = new Promise<Event>((r, j) => {

          this._audioPlayer.addEventListener('ended', r, { once: true });

          this._audioPlayer.addEventListener('pause', r, { once: true });

          this._audioPlayer.addEventListener('error', j, { once: true });
        });

        await this._audioPlayback;
      }
      catch (e) {

        console.error(e);
      }
    })();

    await this._audioPlayer.play();
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

  createPause(): Promise<boolean> {

    return new Promise<boolean>((r, j) => {

      this._eventTarget.addEventListener('start', () => r(true), { once: true });

      this._eventTarget.addEventListener('stop', () => r(false), { once: true });

      this._eventTarget.addEventListener('error', j, { once: true });
    });
  }

  get isPlaying(): boolean {
    return !this._stopped
  }
}