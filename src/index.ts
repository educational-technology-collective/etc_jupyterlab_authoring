import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";

import {
  INotebookTracker,
  NotebookActions,
  NotebookPanel
} from "@jupyterlab/notebook";

import { Signal } from "@lumino/signaling";

import {
  AudioInputSelectorWidget,
  StatusIndicatorWidget,
  AuthoringPanel,
  ExecutionCheckboxWidget,
  ScrollCheckboxWidget
} from './widgets';

import {
  StatusIndicator
} from './status_indicator';

import { IStatusBar } from "@jupyterlab/statusbar";
import { MessageRecorder } from './message_recorder';
import { MessagePlayer } from './message_player';
import { MessageEditor } from "./message_editor";
import { AudioInputSelector } from "./audio_input_selector";

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
    statusBar: IStatusBar
  ) => {
    console.log("JupyterLab extension etc_jupyterlab_authoring is activated!");

    Signal.setExceptionHandler((error: Error) => {
      console.error(error);
    });

    let authoringPanel = new AuthoringPanel();

    let audioInputSelectorWidget = new AudioInputSelectorWidget();
    let executionCheckboxWidget = new ExecutionCheckboxWidget()
    let scrollCheckboxWidget = new ScrollCheckboxWidget()

    authoringPanel.addWidget(audioInputSelectorWidget);

    authoringPanel.addWidget(executionCheckboxWidget);

    authoringPanel.addWidget(scrollCheckboxWidget);

    labShell.add(authoringPanel, 'right');

    let statusIndicatorWidget = new StatusIndicatorWidget();
    let statusIndicator = new StatusIndicator({ widget: statusIndicatorWidget });

    let audioInputSelector = new AudioInputSelector({ node: audioInputSelectorWidget.node });

    statusBar.registerStatusItem('etc_jupyterlab_authoring:plugin:statusIndicator', {
      item: statusIndicatorWidget,
      align: "left",
      rank: -100
    });

    notebookTracker.currentChanged.connect(statusIndicator.onCurrentChanged, statusIndicator);
    //  There is one status indicator for all Notebooks; hence notify the status indicator whenever the user changes Notebooks.


    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      try {

        await notebookPanel.revealed;
        await notebookPanel.sessionContext.ready;

        let messageRecorder = new MessageRecorder({ 
          notebookPanel,
          audioInputSelector,
          statusIndicator
        });

        let messagePlayer = new MessagePlayer({ 
          notebookPanel, 
          messageRecorder, 
          statusIndicator,
          executionCheckbox:executionCheckboxWidget.node,
          scrollCheckbox: scrollCheckboxWidget.node
        });
      }
      catch (e) {

        console.error(e);
      }
    });
  }
}

export default extension;
