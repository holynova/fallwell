interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const mountPath = "/fallwell";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === mountPath) {
      url.pathname += "/";
      return Response.redirect(url.toString(), 308);
    }
    if (url.pathname.startsWith(`${mountPath}/`)) {
      url.pathname = url.pathname.slice(mountPath.length);
    }
    // The asset store remains at its root; only this game's route is mounted
    // under the portfolio host. The existing workers.dev root still works.
    return env.ASSETS.fetch(new Request(url, request));
  },
};
