import {
  PartialJSONValue,
} from '@lumino/coreutils';
import { Notebook, NotebookActions, NotebookPanel } from "@jupyterlab/notebook";
import { EventMessage } from "./message_recorder";
import { CodeCell, Cell, ICellModel, MarkdownCell } from '@jupyterlab/cells'
import { CodeMirrorEditor } from "@jupyterlab/codemirror";
import { AuthoringStatus } from './authoring_status';
import { KeyBindings } from './key_bindings';
import { AuthoringToolbarStatus, ExecutionCheckbox, MediaControls, PositionPlaybackCell, SaveDisplayRecordingCheckbox, ScrollCheckbox } from './components';
import { Signal } from '@lumino/signaling';
import * as _path from 'path-browserify';
import { requestAPI } from './handler';

export class MessagePlayer {

  private _mediaRecording: Promise<Blob>;
  private _eventMessages: Array<EventMessage>;
  private _isPaused: boolean = false;
  private _isPlaying: boolean = false;
  private _executeCellEnabled: boolean = false;
  private _scrollToCellEnabled: boolean = false;
  private _saveDisplayRecordingEnabled: boolean = false;
  private _contentModel: PartialJSONValue;
  private _notebookPanel: NotebookPanel;
  private _notebook: Notebook;
  private _editor: CodeMirrorEditor;
  private _mediaPlayer: MediaPlayer;
  private _mediaPlaybackEnded: Promise<Event>;
  private _authoringStatus: AuthoringStatus;
  private _authoringToolbarStatus: AuthoringToolbarStatus;
  private _mediaRecorder: MediaRecorder;
  private _displayRecording: Promise<Blob>;
  private _charIndex: number;
  private _messageIndex: number;
  private _eventTarget: EventTarget;
  private _player: Promise<void>;
  private _positionPlaybackCellPercent: number;
  private _mimeType: string;
  private _mediaFileName: string;

  constructor({
    notebookPanel,
    mediaControls,
    keyBindings,
    saveDisplayRecordingCheckbox,
    executionCheckbox,
    scrollCheckbox,
    positionPlaybackCell,
    authoringStatus,
    authoringToolbarStatus
  }: {
    notebookPanel: NotebookPanel,
    mediaControls: MediaControls,
    keyBindings: KeyBindings,
    saveDisplayRecordingCheckbox: SaveDisplayRecordingCheckbox,
    executionCheckbox: ExecutionCheckbox,
    scrollCheckbox: ScrollCheckbox,
    positionPlaybackCell: PositionPlaybackCell,
    authoringStatus: AuthoringStatus,
    authoringToolbarStatus: AuthoringToolbarStatus
  }) {

    this._eventTarget = new EventTarget();

    this._notebookPanel = notebookPanel;
    this._notebook = notebookPanel.content;
    this._authoringStatus = authoringStatus;
    this._authoringToolbarStatus = authoringToolbarStatus;

    notebookPanel.disposed.connect(this.dispose, this);

    saveDisplayRecordingCheckbox.checkboxChanged.connect((sender: SaveDisplayRecordingCheckbox, checked: boolean) => this._saveDisplayRecordingEnabled = checked, this);
    this._saveDisplayRecordingEnabled = saveDisplayRecordingCheckbox.checked;

    executionCheckbox.checkboxChanged.connect((sender: ExecutionCheckbox, checked: boolean) => this._executeCellEnabled = checked, this);
    this._executeCellEnabled = executionCheckbox.checked;

    scrollCheckbox.checkboxChanged.connect((sender: ScrollCheckbox, checked: boolean) => this._scrollToCellEnabled = checked, this);
    this._scrollToCellEnabled = scrollCheckbox.checked;

    positionPlaybackCell.inputChanged.connect((sender: PositionPlaybackCell, value: number) => this._positionPlaybackCellPercent = value);
    this._positionPlaybackCellPercent = positionPlaybackCell.value;

    keyBindings.keyPressed.connect(this.processCommand, this);
    mediaControls.buttonPressed.connect(this.processCommand, this);

    if (this._notebookPanel.content.model.metadata.has('etc_jupyterlab_authoring')) {

      let metaData = this._notebookPanel.content.model.metadata.get('etc_jupyterlab_authoring') as any;

      console.log('metaData', metaData);

      this._eventMessages = metaData.eventMessages;
      this._mimeType = metaData.mimeType;
      this._mediaFileName = metaData.mediaFileName;

      this._contentModel = notebookPanel.content.model.toJSON();
      //  The Notebook needs to be saved so that it can be reset; hence, freeze the Notebook.

      this._mediaRecording = (async () => {

        try {

          let response = await requestAPI<Response>(`media/${this._mediaFileName}`, { method: 'GET' });

          console.log('response', response);

          let blob = new Blob([await response.blob()], { type: this._mimeType });

          console.log('blob', blob);

          return blob;
        }
        catch (e) {

          console.error('The audio cannot be obtained from the metadata.');

          this._mediaPlayer = null;
        }
      })();

      this._mediaRecording.catch(()=>{})
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

      if (e instanceof Error) {

        console.error(e.message);
      }

      console.error(e);
    }
  }

  private async resume() {

    if (this._saveDisplayRecordingEnabled) {

      await new Promise((r, j) => {

        this._mediaRecorder.addEventListener('resume', r, { once: true });

        this._mediaRecorder.addEventListener('error', j, { once: true });
      });

      this._mediaRecorder.resume();
    }

    this._isPaused = false;

    this._isPlaying = true;

    this._eventTarget.dispatchEvent(new Event('resume'));

    await this._mediaPlayer?.mediaElement.play();

    this._authoringStatus.setState(this._notebookPanel, 'play');

    this._authoringToolbarStatus.setStatus('Playing...');
  }

  public async pause() {

    if (this._isPlaying && !this._isPaused) {

      this._authoringToolbarStatus.setStatus('Pausing...');

      this._isPaused = true;

      await new Promise((r, j) => {

        this._eventTarget.addEventListener('paused', r, { once: true });
      });

      if (this._mediaPlayer) {

        await new Promise((r, j) => {

          this._mediaPlayer.mediaElement.addEventListener('pause', r, { once: true });

          this._mediaPlayer.mediaElement.addEventListener('error', j, { once: true });

          this._mediaPlayer.mediaElement.pause();
        });
      }

      if (this._saveDisplayRecordingEnabled) {

        this._mediaRecorder.pause();
      }

      this._authoringStatus.setState(this._notebookPanel, 'pause');

      this._authoringToolbarStatus.setStatus('Paused.');
    }
  }

  public async stop() {

    if (this._isPlaying) {

      this._authoringToolbarStatus.setStatus('Stopping...');

      this._isPlaying = false;

      if (this._isPaused) {

        this._isPaused = false;

        this._eventTarget.dispatchEvent(new Event('stop'));
      }
      else if (this._mediaPlayer) {

        //  The audio player of the message player is not already paused; hence, pause the audio player.
        await new Promise<Event>((r, j) => {

          this._mediaPlayer.mediaElement.addEventListener('ended', r, { once: true });

          this._mediaPlayer.mediaElement.addEventListener('pause', r, { once: true });

          this._mediaPlayer.mediaElement.addEventListener('error', j, { once: true });

          this._mediaPlayer.mediaElement.pause();
        });
      }

      await this._player;

      if (this._saveDisplayRecordingEnabled) {

        await this.saveDisplayRecording();
      }

      this._authoringStatus.setState(this._notebookPanel, 'stop');

      this._authoringToolbarStatus.setStatus('Stopped.');
    }
  }

  public reset() {

    if (!this._isPlaying) {

      this._notebookPanel.content.model.fromJSON(this._contentModel);

      this._notebookPanel.content.model.initialize();

      this._authoringToolbarStatus.reset();
    }
  }

  public async play() {

    if (!this._isPaused && !this._isPlaying) {

      this._authoringToolbarStatus.setStatus('Starting Playback...');

      this._notebook.node.focus();

      await (this._player = this.playMessages());

      this._authoringToolbarStatus.setStatus('Playback Stopped.');
    }
    else if (this._isPaused) {

      await this.resume();
    }
  }

  private async playMessages() {

    if (this._saveDisplayRecordingEnabled) {

      await this.startDisplayRecording();
    }

    this._isPlaying = true;
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
    //  This method handles the case where the _mediaRecording isn't available; hence, call it without checking.

    this._authoringStatus.setState(this._notebookPanel, 'play');

    this._authoringToolbarStatus.setStatus('Playing...');

    let startTimestamp = this._eventMessages[0].start_timestamp;

    while (this._isPlaying && this._messageIndex < this._eventMessages.length) {

      if (this._isPaused) {

        let proceed = await new Promise((r, j) => {

          this._eventTarget.addEventListener('resume', () => r(true), { once: true });

          this._eventTarget.addEventListener('stop', () => r(false), { once: true });

          this._eventTarget.dispatchEvent(new Event('paused'));
        });

        if (!proceed) {
          break;
        }
      }

      let message = this._eventMessages[this._messageIndex];

      let targetTime = message.start_timestamp - startTimestamp;

      if (message.cell_type) {
        //  Some events depend on having a cell; hence, this block will only handle events that have a cell_type.

        if (message.cell_index > this._notebook.model.cells.length - 1) {

          this.createCellsTo(message.cell_index);
          //  The Notebook may not have sufficient cells; hence, create cells to accomodate the cell index.
        }

        let cell: Cell<ICellModel> = this._notebook.widgets[message.cell_index];


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

          if (message.input.length) {

            let duration = message.duration / message.input.length;

            while (this._isPlaying && this._charIndex < message.input.length) {

              if (this._isPaused) {

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

              if (
                this._scrollToCellEnabled &&
                (cell.node.offsetTop + cell.node.offsetHeight) > (this._notebook.node.scrollTop + this._notebook.node.offsetHeight)
              ) {

                let scrollTo = cell.node.offsetTop + cell.node.offsetHeight - this._notebook.node.offsetHeight * (this._positionPlaybackCellPercent / 100);

                this._notebook.node.scrollTop = scrollTo;
              }

              cell.update();

              if (this._mediaPlayer) {

                let dt = duration - (this._mediaPlayer.mediaElement.currentTime * 1000 - targetTime);

                dt = dt < 0 ? 0 : dt;

                if (dt > 0) {

                  await new Promise<void>((r, j) => setTimeout(r, dt));
                }

                targetTime = targetTime + duration;
              }
              else {

                await new Promise<void>((r, j) => setTimeout(r, duration));
              }

              this._charIndex++
            }
          }
          else {

            await new Promise<void>((r, j) => setTimeout(r, message.duration));
          }
        }
        else if (message.event == "execution_finished") {

          if (this._executeCellEnabled) {

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

              this._mediaPlayer?.mediaElement.pause();

              await runAndAdvance;

              this._mediaPlayer?.mediaElement.play();
            }
          }
          else {

            await new Promise((r, j) => {

              (cell as CodeCell).model.outputs.fromJSON(message.outputs);

              setTimeout(r, message.duration);
            });
          }
        }

        if (
          this._scrollToCellEnabled &&
          (cell.node.offsetTop + cell.node.offsetHeight) > (this._notebook.node.scrollTop + this._notebook.node.offsetHeight)
        ) {

          let scrollTo = cell.node.offsetTop + cell.node.offsetHeight - this._notebook.node.offsetHeight * (this._positionPlaybackCellPercent / 100);

          this._notebook.node.scrollTop = scrollTo;
        }
      }
      else {

        let duration = message.duration ? message.duration : 0;

        await new Promise((r, j) => { setTimeout(r, duration) });
      }

      this._messageIndex++; this._charIndex = 0;
    }

    if (this._isPlaying) {
      
      await this._mediaPlaybackEnded;

      if (this._saveDisplayRecordingEnabled) {

        await this.saveDisplayRecording();
      }

      this._isPlaying = false;

      this._authoringStatus.setState(this._notebookPanel, 'stop');

    }
  }

  private async saveDisplayRecording() {

    await new Promise((r, j) => {

      this._mediaRecorder.addEventListener('stop', r, { once: true });

      this._mediaRecorder.addEventListener('error', j, { once: true });

      this._mediaRecorder.stop();
    });

    let name = _path.parse(this._notebookPanel.context.localPath).name;

    name = `${name.replace(/\.[^.]+$/, '')}_playback_${Date.now().toString()}.webm`;

    let mediaFileName = `${_path.join(_path.dirname(this._notebookPanel.context.localPath), name)}`;

    let response = await requestAPI<Response>(`media/${mediaFileName}`, {
      method: 'PUT',
      body: await this._displayRecording,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });

    console.log(await response.text());
  }

  private async startDisplayRecording() {

    // {
    //   "aspectRatio": 1.7777777777777777,
    //   "cursor": "never",
    //   "displaySurface": "browser",
    //   "frameRate": 30,
    //   "height": 2160,
    //   "logicalSurface": true,
    //   "resizeMode": "crop-and-scale",
    //   "width": 3840
    // }
    let stream = await (navigator.mediaDevices as any).getDisplayMedia(
      {
        video: true,
        audio: true
      });

    this._mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm; codecs="vp8, opus"',
      bitsPerSecond: 40000000
    });

    await new Promise((r, j) => setTimeout(r, 5000));

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

    this._displayRecording.catch(()=>{});

    this._mediaRecorder.start();
  }

  private async startMediaPlayback() {

    if (await this._mediaRecording) {

      let mediaPlayer = this._mediaPlayer = new MediaPlayer({
        notebookPanel: this._notebookPanel,
        blob: await this._mediaRecording
      });

      this._mediaPlaybackEnded = new Promise((r, j) => {

        mediaPlayer.mediaElement.addEventListener('ended', r, { once: true });

        mediaPlayer.mediaElement.addEventListener('error', j, { once: true });
      });

      this._mediaPlaybackEnded.catch(()=>{});

      await mediaPlayer.mediaElement.play();
    }
    else {

      this._mediaPlayer = null;
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

  createPause(): Promise<boolean> {

    return new Promise<boolean>((r, j) => {

      this._eventTarget.addEventListener('start', () => r(true), { once: true });

      this._eventTarget.addEventListener('stop', () => r(false), { once: true });

      this._eventTarget.addEventListener('error', j, { once: true });
    });
  }
}

export class MediaPlayer {

  private _videoElement: HTMLVideoElement;
  private _notebookPanel: NotebookPanel;

  constructor({ notebookPanel, blob }: { notebookPanel: NotebookPanel, blob: Blob }) {

    this._notebookPanel = notebookPanel;

    let videoElement = this._videoElement = document.createElement('video');

    this._videoElement.src = URL.createObjectURL(blob);

    videoElement.style.border = '5px solid white';
    videoElement.style.position = 'absolute';
    videoElement.style.right = '0px';
    videoElement.style.top = '0px';
    videoElement.style.width = '300px';
    videoElement.style.zIndex = '9999';
    videoElement.style.backgroundColor = 'black';
    videoElement.style.opacity = '0';
  }

  get mediaElement(): HTMLVideoElement {

    return this._videoElement;
  }
}
