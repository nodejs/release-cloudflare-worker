import render, { Env as RenderEnv } from 'render2';

export interface Env extends RenderEnv {
    R2_BUCKET: R2Bucket;
    CACHE_CONTROL: string;
    DIRECTORY_CACHE_CONTROL: string;
}

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext,
    ): Promise<Response> {
        if (request.method !== 'GET') {
            return new Response(undefined, {
                status: 405,
                headers: { Allow: 'GET' },
            });
        }

        const url = new URL(request.url);
        if (url.pathname.endsWith('.json')) {
            env.ALLOWED_ORIGINS = '*';
        }
        
        if (url.pathname.startsWith('/dist')) {
            env.PATH_PREFIX = 'nodejs/release';
        } else if (url.pathname.startsWith('/download') || url.pathname.startsWith('/docs')) {
            env.PATH_PREFIX = 'nodejs/';
        } else if (url.pathname.startsWith('/api')) {
            env.PATH_PREFIX = 'nodejs/docs/latest';
        }

        return await render.fetch(request, env, ctx);
    },
};
