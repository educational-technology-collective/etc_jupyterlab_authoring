import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint = '',
  init: RequestInit = {}
): Promise<Response> {

  // Make request to Jupyter API
  const settings = ServerConnection.makeSettings();

  const requestUrl = URLExt.join(
    settings.baseUrl,
    'etc-jupyterlab-authoring', // API Namespace
    endPoint
  );

  let response: Response;

  try {

    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {

    throw new ServerConnection.NetworkError(error as TypeError);
  }

  return response;
}
