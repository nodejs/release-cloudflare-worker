import render from 'render2';

export interface Env {
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

        return await render.fetch(request, env, ctx);
    },
};
