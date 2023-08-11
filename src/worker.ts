import render from 'render2';

export interface Env {
    R2_BUCKET: R2Bucket;
    PATH_PREFIX: string;
    ORIGIN_SERVER: string;
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

        let response: Response = await render.fetch(request, env, ctx);
        if (response.status === 404) {
            // Didn't find whatever we were looking for,
            //	check the origin server
            console.log('Origin call');
            const path = new URL(request.url).pathname;
            return fetch(env.ORIGIN_SERVER + path);
        }
        return response;
    },
};
