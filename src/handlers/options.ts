import { Handler } from './handler';

const optionsHandler: Handler = async () => {
  return new Response(undefined, {
    headers: {
      Allow: 'GET, HEAD, OPTIONS',
    },
  });
};

export default optionsHandler;
