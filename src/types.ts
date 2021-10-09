import * as nbformat from '@jupyterlab/nbformat';

export interface EventMessage {
    event: string;
    notebook_id: string;
    cell_id?: string;
    cell_index?: number;
    cell_type?: string;
    line_index?: number;
    input?: string;
    outputs?: Array<nbformat.IOutput>;
    start_timestamp?: number;
    stop_timestamp?: number;
    duration?: number;
    recording?: Promise<Blob>;
    recordingDataURL?: string;
}