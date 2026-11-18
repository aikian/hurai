const integer = (n, low, high) => Number.isInteger(n) && n >= low && n <= high;
const array = (a, n, test) =>
  Array.isArray(a) && a.length === n && a.every(test);
const record = (o) => o && Object.getPrototypeOf(o) === Object.prototype;
const date = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const weeksMap = (o, test) =>
  record(o) &&
  Object.keys(o).length <= 156 &&
  Object.entries(o).every(([w, v]) => date(w) && test(v));
const employee = (e) =>
  record(e) &&
  typeof e.name === "string" &&
  /^[\p{L}\p{N}][\p{L}\p{N} .·-]{0,29}$/u.test(e.name) &&
  Array.isArray(e.skill) &&
  e.skill.length >= 1 &&
  e.skill.length <= 3 &&
  e.skill.every((r) => integer(r, 0, 2)) &&
  new Set(e.skill).size === e.skill.length &&
  integer(e.max, 0, 60) &&
  integer(e.wage, 1, 1000000) &&
  integer(e.pref, 0, 1) &&
  integer(e.available, 0, 2) &&
  integer(e.off, 0, 7);
function valid(s) {
  return (
    record(s) &&
    (s.store === undefined ||
      (record(s.store) &&
        [s.store.name, s.store.branch].every(
          (x) => typeof x === "string" && x.length > 0 && x.length <= 30,
        ))) &&
    Array.isArray(s.staff) &&
    integer(s.staff.length, 1, 80) &&
    s.staff.every(employee) &&
    array(s.sales, 7, (slots) =>
      array(slots, 2, (n) => integer(n, 1, 100000000)),
    ) &&
    integer(s.unit, 100000, 2000000) &&
    ["balanced", "cost"].includes(s.priority) &&
    weeksMap(
      s.weeks,
      (w) =>
        record(w) &&
        typeof w.final === "boolean" &&
        array(w.grid, s.staff.length, (row) =>
          array(
            row,
            7,
            (v) =>
              v === null ||
              (record(v) && integer(v.p, 0, 1) && integer(v.r, 0, 2)),
          ),
        ),
    ) &&
    weeksMap(
      s.boost,
      (a) =>
        Array.isArray(a) &&
        a.length <= 42 &&
        a.every((k) => /^[0-6]-[01]-[012]$/.test(k)),
    ) &&
    Array.isArray(s.feedback) &&
    s.feedback.length <= 2000 &&
    s.feedback.every(
      (f) =>
        record(f) &&
        date(f.week) &&
        integer(f.d, 0, 6) &&
        typeof f.note === "string" &&
        f.note.length <= 300,
    )
  );
}
const ttl = 60 * 60 * 24 * 90,
  limit = 1024 * 1024;
async function digest(s) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
}
async function parse(req) {
  const reader = req.body?.getReader();
  if (!reader) throw Error();
  let size = 0,
    chunks = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw RangeError();
    }
    chunks.push(value);
  }
  return JSON.parse(await new Blob(chunks).text());
}
export async function workspace(req, db) {
  const respond = (value, status = 200, extra = {}) =>
    Response.json(value, {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ...extra,
      },
    });
  const url = new URL(req.url),
    secure = url.protocol === "https:",
    cookie = secure ? "__Host-hurai" : "hurai_local";
  const sid = (req.headers.get("Cookie") || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(cookie + "="))
    ?.slice(cookie.length + 1);
  const id = sid && /^[a-f0-9]{64}$/.test(sid) ? await digest(sid) : null;
  const now = Math.floor(Date.now() / 1000);
  if (req.method === "GET") {
    const row =
      id &&
      (await db
        .prepare(
          "SELECT revision,payload FROM workspaces WHERE id=? AND updated>?",
        )
        .bind(id, now - ttl)
        .first());
    return respond(
      row
        ? { revision: row.revision, state: JSON.parse(row.payload) }
        : { revision: 0 },
    );
  }
  if (!["PUT", "POST"].includes(req.method))
    return respond({ error: "method" }, 405);
  if (
    req.headers.get("Origin") !== url.origin ||
    req.headers.get("X-Hurai-Client") !== "workspace" ||
    req.headers.get("content-type")?.split(";")[0] !== "application/json"
  )
    return respond({ error: "origin" }, 403);
  let body;
  try {
    body = await parse(req);
  } catch (e) {
    return respond({ error: "body" }, e instanceof RangeError ? 413 : 400);
  }
  if (!body || !valid(body.state) || !integer(body.revision, 0, 2147483646))
    return respond({ error: "validation" }, 422);
  const payload = JSON.stringify(body.state);
  if (req.method === "POST") {
    if (body.revision !== 0) return respond({ error: "revision" }, 409);
    if (
      id &&
      (await db
        .prepare("SELECT id FROM workspaces WHERE id=? AND updated>?")
        .bind(id, now - ttl)
        .first())
    )
      return respond({ error: "exists" }, 409);
    await db
      .prepare("DELETE FROM workspaces WHERE updated<=?")
      .bind(now - ttl)
      .run();
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    const inserted = await db
      .prepare(
        "INSERT INTO workspaces SELECT ?,1,?,?,? WHERE (SELECT COUNT(*) FROM workspaces WHERE created>?)<200",
      )
      .bind(await digest(token), payload, now, now, now - 86400)
      .run();
    if (!inserted.meta.changes) return respond({ error: "quota" }, 429);
    return respond({ revision: 1 }, 201, {
      "Set-Cookie":
        cookie +
        "=" +
        token +
        "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" +
        ttl +
        (secure ? "; Secure" : ""),
    });
  }
  if (!id) return respond({ error: "session" }, 401);
  const result = await db
    .prepare(
      "UPDATE workspaces SET revision=revision+1,payload=?,updated=? WHERE id=? AND revision=? AND updated>?",
    )
    .bind(payload, now, id, body.revision, now - ttl)
    .run();
  return result.meta.changes
    ? respond({ revision: body.revision + 1 })
    : respond({ error: "stale_or_expired" }, 409);
}
