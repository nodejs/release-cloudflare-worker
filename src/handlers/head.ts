import { headDirectory } from '../actions/directory';
import { headFile } from '../actions/file';
import responses from '../responses';
import { isDirectoryPath } from '../utils/path';
import { parseUrl } from '../utils/request';
import { Handler } from './handler';

const headHandler: Handler = async (request, ctx) => {
  const url = parseUrl(request);

  if (url === undefined) {
    return responses.badRequest();
  }

  const isPathADirectory = isDirectoryPath(url.pathname);

  const response = isPathADirectory
    ? await headDirectory(url.pathname, ctx)
    : await headFile(url.pathname, ctx);

  return response;
};

export default headHandler;
