import render, { Env as RenderEnv } from './render2';

export interface Env extends RenderEnv {
}

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext,
    ): Promise<Response> {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            return new Response(undefined, {
                status: request.method === 'OPTIONS' ? 200 : 405,
                headers: { Allow: 'GET' },
            });
        }

        const url = new URL(request.url);
        if (url.pathname.endsWith('.json')) {
            env.ALLOWED_ORIGINS = '*';
        }

        let r2Path: string = url.pathname;
        if (url.pathname.startsWith('/dist')) {
            r2Path = `/nodejs/release${url.pathname.substring(5)}`;
        } else if (url.pathname.startsWith('/download')) {
            r2Path = `/nodejs${url.pathname.substring(9)}`;
        } else if (url.pathname.startsWith('/docs')) {
            r2Path = `/nodejs/docs${url.pathname.substring(5)}`;
        } else if (url.pathname.startsWith('/api')) {
            r2Path = `/nodejs/docs/latest/api${url.pathname.substring(4)}`;
        } else if (!url.pathname.startsWith('/metrics')) {
            return new Response(undefined, { status: 401 });
        }
        r2Path = decodeURIComponent(r2Path);

        return await render.fetch(r2Path, request, env, ctx);
    },
};
