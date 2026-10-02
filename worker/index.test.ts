import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "./index";

function assets() {
  const requests: Request[] = [];
  return {
    requests,
    env: { ASSETS: { async fetch(request: Request) {
      requests.push(request);
      return new Response("asset", { headers: { "Content-Type": "text/plain" } });
    } } },
  };
}

test("game mount redirects to a trailing slash and preserves query", async () => {
  const { env, requests } = assets();
  const response = await worker.fetch(new Request("https://xiaosang.cc/fallwell?run=1"), env);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("Location"), "https://xiaosang.cc/fallwell/?run=1");
  assert.equal(requests.length, 0);
});

test("mounted HTML and images resolve to the root asset store", async () => {
  const { env, requests } = assets();
  for (const path of ["/fallwell/", "/fallwell/assets/art/characters-v1.webp?cache=1"]) {
    const response = await worker.fetch(new Request("https://xiaosang.cc" + path), env);
    assert.equal(await response.text(), "asset");
  }
  assert.equal(new URL(requests[0].url).pathname, "/");
  assert.equal(new URL(requests[1].url).pathname, "/assets/art/characters-v1.webp");
  assert.equal(new URL(requests[1].url).search, "?cache=1");
});

test("workers.dev root and unrelated prefixes are not rewritten", async () => {
  const { env, requests } = assets();
  for (const path of ["/", "/assets/file.js", "/fallwell-other/file.js"]) {
    await worker.fetch(new Request("https://fallwell.holy-nova.workers.dev" + path), env);
    assert.equal(new URL(requests.at(-1)!.url).pathname, path);
  }
});

test("HEAD and conditional asset request headers survive mount rewriting", async () => {
  const { env, requests } = assets();
  await worker.fetch(new Request("https://xiaosang.cc/fallwell/assets/file.js", {
    method: "HEAD", headers: { "If-None-Match": "release-hash" },
  }), env);
  assert.equal(requests[0].method, "HEAD");
  assert.equal(requests[0].headers.get("If-None-Match"), "release-hash");
});
