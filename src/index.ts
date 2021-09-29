import { each } from '@lumino/algorithm';

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";

import {
  INotebookTracker,
  NotebookPanel
} from "@jupyterlab/notebook";

import { Signal } from "@lumino/signaling";
import { AdvanceButton, RecordButton, StopButton, PlayButton, PauseButton, SaveButton } from "./controls";

import { IStatusBar } from "@jupyterlab/statusbar";
import { Listener } from './listener';
import { MessageAggregator, MessagePlayer } from './authoring';
import { StackedLayout, PanelLayout, Widget } from "@lumino/widgets";
import { ILabIconManager } from '@jupyterlab/ui-components';


class SelectorWidget extends Widget{

  constructor(){
    super({node:document.createElement('select')});

    this.id = 'etc_jupyterlab_authoring:plugin:selector_widget';

    this.node.style.width = '100px';
    this.node.style.height = '100px';
    this.node.style.backgroundColor = '#000';
  }
}

class AuthoringWidget extends Widget {

  layout: PanelLayout;

  constructor() {
    super();

    this.id = 'etc_jupyterlab_authoring:plugin:authoring_widget';

    this.node.style.width = '100%';
    this.node.style.height = '100%';
    this.node.style.backgroundColor = '#fff';

    this.layout = new StackedLayout();

    this.layout.addWidget(new SelectorWidget());
  }
}


/**
 * Initialization data for the etc-jupyterlab-authoring extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'etc_jupyterlab_authoring:plugin',
  autoStart: true,
  requires: [
    INotebookTracker,
    ILabShell,
    IStatusBar
  ],
  activate: (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    labShell: ILabShell,
    statusBar: IStatusBar,
  ) => {
    console.log("JupyterLab extension etc_jupyterlab_authoring is activated!");

    let authoringWidget = new AuthoringWidget();

    labShell.add(authoringWidget, 'right');

    (async () => {

      let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log(stream.getTracks());
      let devices = await navigator.mediaDevices.enumerateDevices();
      console.log(devices);
    })();

    Signal.setExceptionHandler((error: Error) => {
      console.error(error);
    })

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;

      let cellTypeIndex: number = 0;

      each(notebookPanel.toolbar.names(), (name: string, index: number) => {

        if (name == 'cellType') {
          cellTypeIndex = index;
        }
      });

      let recordButton = new RecordButton({ notebookPanel, cellTypeIndex });
      let stopButton = new StopButton({ notebookPanel, cellTypeIndex });
      let playButton = new PlayButton({ notebookPanel, cellTypeIndex });
      let pauseButton = new PauseButton({ notebookPanel, cellTypeIndex });
      let saveButton = new SaveButton({ notebookPanel, cellTypeIndex });
      let advanceButton = new AdvanceButton({ notebookPanel });

      let listener = new Listener({
        app,
        notebookPanel,
        advanceButton,
        recordButton,
        stopButton,
        playButton,
        pauseButton,
        saveButton
      });
    });
  }
}

export default extension;
