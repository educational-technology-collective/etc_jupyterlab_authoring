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
    timestamp: number;
    start_timestamp?: number;
    stop_timestamp?: number;
    duration?: number;
}