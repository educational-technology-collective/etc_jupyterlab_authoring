import {
  ILabStatus,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";

import {
  INotebookTracker,
  NotebookPanel
} from "@jupyterlab/notebook";

import {
  CellsEvent,
  MessageAggregator
} from "./events"

import { Signal } from "@lumino/signaling";
import { IMainMenu } from "@jupyterlab/mainmenu";
import { Menu } from '@lumino/widgets';
import { LabIcon } from "@jupyterlab/ui-components/lib/icon/labicon";
import { MenuSvg } from "@jupyterlab/ui-components";
import recordOn from "./icons/record_on.svg";
import { RecordButton, PlayButton } from "./widgets";
import { IStatusBar } from "@jupyterlab/statusbar";
import { Widget, Panel, PanelLayout } from "@lumino/widgets";


const recordOnIcon = new LabIcon({ name: 'etc_jupyterlab_authoring:record_on', svgstr: recordOn });

/**
 * Initialization data for the etc-jupyterlab-authoring extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'etc_jupyterlab_authoring:plugin',
  autoStart: true,
  requires: [
    INotebookTracker,
    IStatusBar
  ],
  activate: (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    statusBar: IStatusBar,
  ) => {
    console.log('JupyterLab extension etc_jupyterlab_authoring is activated!');

    Signal.setExceptionHandler((error: Error) => {
      console.error(error);
    })

    let recordButton = new RecordButton({ notebookTracker });
    let playButton = new PlayButton({ notebookTracker });

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;


      let messageAggregator = new MessageAggregator();

      recordButton.buttonEnabled.connect(messageAggregator.onReceiveMessage, messageAggregator);
      recordButton.buttonDisabled.connect(messageAggregator.onReceiveMessage, messageAggregator);
      recordButton.buttonEnabled.connect(playButton.off, playButton);
      playButton.buttonEnabled.connect(recordButton.on, recordButton);

      let cellsEvent = new CellsEvent({ app, notebookPanel, messageAggregator, recordButton });

    });
  }
}

export default extension;
