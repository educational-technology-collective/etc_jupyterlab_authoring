import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  JupyterLab
} from "@jupyterlab/application";

import {
  IDocumentManager
} from "@jupyterlab/docmanager";

import {
  INotebookTracker,
  NotebookPanel,
  INotebookModel,
  Notebook,
  NotebookActions
} from "@jupyterlab/notebook";

import {
  Cell,
  CodeCell,
  ICellModel
} from "@jupyterlab/cells";

import {
  IObservableList,
  IObservableUndoableList,
  IObservableString
} from "@jupyterlab/observables";

import { IOutputAreaModel } from "@jupyterlab/outputarea";

import { INotebookContent } from "@jupyterlab/nbformat";

import {
  DocumentRegistry
} from "@jupyterlab/docregistry";

import { IMainMenu } from '@jupyterlab/mainmenu';

import { Menu, Widget } from '@lumino/widgets';

import { ISignal, Signal } from '@lumino/signaling';

import { each } from '@lumino/algorithm';

import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker,
  ToolbarButton
} from '@jupyterlab/apputils';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import {
  LoggerRegistry,
  LogConsolePanel,
  IHtmlLog,
  ITextLog,
  IOutputLog,
} from '@jupyterlab/logconsole';

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import { addIcon, clearIcon, listIcon, LabIcon, Button, consoleIcon } from '@jupyterlab/ui-components';

import recordOn from './icons/record_on.svg';
import recordOff from './icons/record_off.svg';

import {
  IDisposable, DisposableDelegate
} from '@lumino/disposable';
import { CommandRegistry } from "@lumino/commands";
import { Time } from "@jupyterlab/coreutils";
import { Editor } from "codemirror";

import {
  // EOLEvent,
  CellsEvent,
  MessageReceivedEvent,
  RecordButton,
  ExecutionEvent,
  EditorEvent
  // RecordButton,
  // StartEvent,
  // StopEvent,
  // CellSelectedEvent
} from "./events"


/**
 * Initialization data for the etc-jupyterlab-authoring extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'etc-jupyterlab-authoring:plugin',
  autoStart: true,
  requires: [
    INotebookTracker
  ],
  activate: (app: JupyterFrontEnd, notebookTracker: INotebookTracker) => {
    console.log('JupyterLab extension etc-jupyterlab-authoring is activated!');

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;

      let messageReceivedEvent = new MessageReceivedEvent({ notebookPanel });

      let cellsEvent = new CellsEvent({ app, notebookPanel });
      cellsEvent.cellAdded.connect((sender: CellsEvent, cell: Cell<ICellModel>) => {

        let editorEvent = new EditorEvent({ notebookPanel, cell });
        editorEvent.cursorChanged.connect(messageReceivedEvent.receiveMessage, messageReceivedEvent);

        let executionEvent = new ExecutionEvent({ app, notebookPanel, cell });
        executionEvent.executionStarted.connect(messageReceivedEvent.receiveMessage, messageReceivedEvent);
        executionEvent.executionFinished.connect(messageReceivedEvent.receiveMessage, messageReceivedEvent);

        let recordButton = new RecordButton({ notebookPanel });
        recordButton.buttonPressed.connect(messageReceivedEvent.receiveMessage, messageReceivedEvent);

      });

    });
  }
}

export default extension;
