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
import { Widget } from "@lumino/widgets";
import { consoleIcon } from '@jupyterlab/ui-components';
import { KeyBindings } from './key_bindings';
import { ExecutionCheckbox, MediaControls, MediaPlayer, SaveDisplayRecordingCheckbox, ScrollCheckbox } from './components';
import { Signal } from '@lumino/signaling';


export class MessagePlayer {

  public audioRecording: Blob;
  public eventMessages: Array<EventMessage>;
  public isPaused: boolean = false;
  public isPlaying: boolean = false;
  public executeCellEnabled: boolean = false;
  public scrollToCellEnabled: boolean = false;
  public saveDisplayRecordingEnabled: boolean = false;

  private _contentModel: PartialJSONValue;
  private _notebookPanel: NotebookPanel;
  private _notebook: Notebook;
  private _editor: CodeMirrorEditor;
  private _mediaPlayer: MediaPlayer;
  private _mediaPlaybackEnded: Promise<Event>;
  private _statusIndicator: StatusIndicator;
  private _mediaRecorder: MediaRecorder;
  private _displayRecording: Promise<Blob>;
  private _charIndex: number;
  private _messageIndex: number;
  private _eventTarget: EventTarget;
  private _player: Promise<void>;

  constructor({
    notebookPanel,
    mediaControls,
    keyBindings,
    saveDisplayRecordingCheckbox,
    executionCheckbox,
    scrollCheckbox,
    statusIndicator
  }: {
    notebookPanel: NotebookPanel,
    mediaControls: MediaControls,
    keyBindings: KeyBindings,
    statusIndicator: StatusIndicator,
    executionCheckbox: ExecutionCheckbox,
    scrollCheckbox: ScrollCheckbox,
    saveDisplayRecordingCheckbox: SaveDisplayRecordingCheckbox
  }) {

    this._eventTarget = new EventTarget();

    this._notebookPanel = notebookPanel;
    this._notebook = notebookPanel.content;
    this._statusIndicator = statusIndicator;

    notebookPanel.disposed.connect(this.dispose, this);

    saveDisplayRecordingCheckbox.checkboxChanged.connect((sender: SaveDisplayRecordingCheckbox, checked: boolean) => this.saveDisplayRecordingEnabled = checked, this);
    this.saveDisplayRecordingEnabled = saveDisplayRecordingCheckbox.checked;

    executionCheckbox.checkboxChanged.connect((sender: ExecutionCheckbox, checked: boolean) => this.executeCellEnabled = checked, this);
    this.executeCellEnabled = executionCheckbox.checked;

    scrollCheckbox.checkboxChanged.connect((sender: ScrollCheckbox, checked: boolean) => this.scrollToCellEnabled = checked, this);
    this.scrollToCellEnabled = scrollCheckbox.checked;

    keyBindings.keyPressed.connect(this.processCommand, this);
    mediaControls.buttonPressed.connect(this.processCommand, this);

    if (this._notebookPanel.content.model.metadata.has('etc_jupyterlab_authoring')) {

      let data = JSON.parse(this._notebookPanel.content.model.metadata.get('etc_jupyterlab_authoring') as string);

      this.eventMessages = data.eventMessages;

      this._contentModel = notebookPanel.content.model.toJSON();
      //  The Notebook needs to be saved so that it can be reset; hence freeze the Notebook.

      (async () => {

        try {

          let result = await fetch(data.audio);

          this.audioRecording = await result.blob();
        }
        catch (e) {

          console.error(e);
        }
      })();
    }
  }

  private dispose() {

    Signal.disconnectAll(this);
  }

  private async processCommand(sender: KeyBindings | MediaControls, args: { command: string }) {

    try {

      if (this._notebookPanel.isVisible) {

        switch (args.command) {

          case 'reset':
            this.reset();
            break;
          case 'stop':
            await this.stop();
            break;
          case 'play':
            await this.play();
            break;
          case 'pause':
            await this.pause();
            break;
        }
      }
    }
    catch (e) {

      console.error(e);
    }
  }

  private async resume() {

    if (this.saveDisplayRecordingEnabled) {

      await new Promise((r, j) => {

        this._mediaRecorder.addEventListener('resume', r, { once: true });

        this._mediaRecorder.addEventListener('error', j, { once: true });

        this._mediaRecorder.resume();
      })
    }

    this.isPaused = false;

    this.isPlaying = true;

    this._eventTarget.dispatchEvent(new Event('resume'));

    await this._mediaPlayer.mediaElement.play();

    this._statusIndicator.play(this._notebookPanel);
  }

  public async pause() {

    if (this.isPlaying && !this.isPaused) {

      this.isPaused = true;

      await new Promise((r, j) => {

        this._eventTarget.addEventListener('paused', r, { once: true });
      });

      await new Promise((r, j) => {

        this._mediaPlayer.mediaElement.addEventListener('pause', r, { once: true });

        this._mediaPlayer.mediaElement.addEventListener('error', j, { once: true });

        this._mediaPlayer.mediaElement.pause();
      });

      if (this.saveDisplayRecordingEnabled) {

        this._mediaRecorder.pause();
      }

      this._statusIndicator.pause(this._notebookPanel);
    }
  }

  public async stop() {

    if (this.isPlaying) {

      this.isPlaying = false;

      if (this.isPaused) {

        this.isPaused = false;

        this._eventTarget.dispatchEvent(new Event('stop'));
      }
      else {

        //  The audio player of the message player is not already paused; hence, pause the audio player.
        await new Promise<Event>((r, j) => {

          this._mediaPlayer.mediaElement.addEventListener('ended', r, { once: true });

          this._mediaPlayer.mediaElement.addEventListener('pause', r, { once: true });

          this._mediaPlayer.mediaElement.addEventListener('error', j, { once: true });

          this._mediaPlayer.mediaElement.pause();
        });
      }

      await this._player;

      if (this.saveDisplayRecordingEnabled) {

        await this.saveDisplayRecording();
      }

      this._mediaPlayer.remove();

      this._statusIndicator.stop(this._notebookPanel);
    }
  }

  public reset() {

    if (!this.isPlaying) {

      this._notebookPanel.content.model.fromJSON(this._contentModel);

      this._notebookPanel.content.model.initialize();
    }
  }

  public async play() {

    if (this.audioRecording && !this.isPaused && !this.isPlaying) {

      await (this._player = this.playMessages());
    }
    else if (this.isPaused) {

      await this.resume();
    }
  }

  private async playMessages() {

    if (this.saveDisplayRecordingEnabled) {

      await this.startDisplayRecording();
    }

    this.isPlaying = true;
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

    await this.startMediaPlayback();

    this._statusIndicator.play(this._notebookPanel);

    let startTimestamp = this.eventMessages[0].start_timestamp;

    while (this.isPlaying && this._messageIndex < this.eventMessages.length) {

      if (this.isPaused) {

        let proceed = await new Promise((r, j) => {

          this._eventTarget.addEventListener('resume', () => r(true), { once: true });

          this._eventTarget.addEventListener('stop', () => r(false), { once: true });

          this._eventTarget.dispatchEvent(new Event('paused'));
        });

        if (!proceed) {
          break;
        }
      }

      let message = this.eventMessages[this._messageIndex];

      let targetTime = message.start_timestamp - startTimestamp;

      if (message.cell_type) {
        //  Some events depend on having a cell; hence, this block will only handle events that have a cell_type.

        if (message.cell_index > this._notebook.model.cells.length - 1) {

          this.createCellsTo(message.cell_index);
          //  The Notebook may not have sufficient cells; hence, create cells to accomodate the cell index.
        }

        let cell: Cell<ICellModel> = this._notebook.widgets[message.cell_index];

        if (this.scrollToCellEnabled) {

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

            if (this.scrollToCellEnabled) {

              this._notebook.scrollToCell(cell);
            }
          }

          this._mediaPlayer.updatePosition(cell.node, this._editor.lineCount);

          if (message.input.length) {

            let duration = message.duration / message.input.length;

            while (this.isPlaying && this._charIndex < message.input.length) {

              if (this.isPaused) {

                let proceed = await new Promise((r, j) => {

                  this._eventTarget.addEventListener('resume', () => r(true), { once: true });

                  this._eventTarget.addEventListener('stop', () => r(false), { once: true });

                  this._eventTarget.dispatchEvent(new Event('paused'));
                });

                if (!proceed) {
                  break;
                }
              }

              let pos = {
                line: message.line_index,
                ch: this._charIndex
              };

              this._editor.doc.replaceRange(message.input[this._charIndex], pos);

              cell.update();

              let dt = duration - (this._mediaPlayer.mediaElement.currentTime * 1000 - targetTime);

              dt = dt < 0 ? 0 : dt;

              if (dt > 0) {

                await new Promise<void>((r, j) => setTimeout(r, dt));
              }

              targetTime = targetTime + duration;

              this._charIndex++
            }
          }
          else {

            await new Promise<void>((r, j) => setTimeout(r, message.duration));
          }
        }
        else if (message.event == "execution_finished") {

          if (this.executeCellEnabled) {

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

              this._mediaPlayer.mediaElement.pause();

              await runAndAdvance;

              this._mediaPlayer.mediaElement.play();
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

    if (this.isPlaying) {

      await this._mediaPlaybackEnded;

      if (this.saveDisplayRecordingEnabled) {

        await this.saveDisplayRecording();
      }

      this.isPlaying = false;

      this._statusIndicator.stop(this._notebookPanel);

      this._mediaPlayer.remove();
    }
  }

  private async saveDisplayRecording() {

    await new Promise((r, j) => {

      this._mediaRecorder.addEventListener('stop', r, { once: true });

      this._mediaRecorder.addEventListener('error', j, { once: true });

      this._mediaRecorder.stop();
    });

    let a = document.createElement("a");

    a.href = URL.createObjectURL(await this._displayRecording);

    a.download = "recording.webm";

    a.click();
  }

  private async startDisplayRecording() {

    this._mediaRecorder = new MediaRecorder(
      await (navigator.mediaDevices as any).getDisplayMedia(
        {
          video: {
            "aspectRatio": 1.7777777777777777,
            "cursor": "never",
            "displaySurface": "browser",
            "frameRate": 30,
            "height": 2160,
            "logicalSurface": true,
            "resizeMode": "crop-and-scale",
            "width": 3840
          },
          audio: true
        }));

    await new Promise((r, j) => setTimeout(r, 3000));

    (async () => {

      try {

        await (this._displayRecording = new Promise<Blob>((r, j) => {

          let recordings: Array<Blob> = [];

          this._mediaRecorder.addEventListener('dataavailable', (event: BlobEvent) => {

            recordings.push(event.data);
          });

          this._mediaRecorder.addEventListener('stop', () => {

            r(new Blob(recordings));
          });

          this._mediaRecorder.addEventListener('error', j);

          this._mediaRecorder.start();
        }));
      }
      catch (e) {

        console.error(e);
      }
    })();
  }

  private async startMediaPlayback() {

    let mediaPlayer = this._mediaPlayer = new MediaPlayer({
      notebookPanel: this._notebookPanel,
      blob: this.audioRecording
    });

    (async () => {

      try {

        this._mediaPlaybackEnded = new Promise((r, j) => {

          mediaPlayer.mediaElement.addEventListener('ended', r, { once: true });

          mediaPlayer.mediaElement.addEventListener('error', j, { once: true });
        });

        await this._mediaPlaybackEnded;
      }
      catch (e) {

        console.error(e);
      }
    })();

    await mediaPlayer.mediaElement.play();
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
}