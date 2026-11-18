// The static Pages demo keeps data local. A same-origin API enables private snapshots.
let storageMode = "local",
  serverRevision = 0,
  pendingSave = false,
  hasChanges = false;
const storageLabels = {
  local: "브라우저 저장",
  ready: "서버 저장 시작",
  saved: "서버 저장됨",
  dirty: "서버에 저장",
  busy: "저장 중…",
  restore: "서버 사본 확인",
  conflict: "저장 충돌",
  error: "저장 재시도",
};
function storageButton() {
  return storageMode === "local"
    ? '<span class="saved">● &nbsp; 브라우저 저장</span>'
    : btn(
        storageLabels[storageMode],
        "storageDialog()",
        "storage " + storageMode,
      );
}
function storageStatus(mode) {
  storageMode = mode;
  const el = document.querySelector("#top .storage, #top .saved");
  if (el) el.outerHTML = storageButton();
}
function markChanged() {
  hasChanges = true;
  if (storageMode === "saved") storageStatus("dirty");
}
async function discoverStorage() {
  if (
    location.hostname.endsWith(".github.io") ||
    !/^https?:$/.test(location.protocol)
  )
    return;
  try {
    const res = await fetch("api/workspace", { cache: "no-store" });
    if (
      !res.ok ||
      !res.headers.get("content-type")?.includes("application/json")
    )
      return;
    const data = await res.json();
    storageStatus(data.revision ? "restore" : "ready");
  } catch {
    /* Local editing remains available when the backend is offline. */
  }
}
function storageDialog() {
  if (pendingSave) return;
  const review = ["restore", "conflict"].includes(storageMode);
  modal(
    "작업공간 저장",
    review
      ? "<p>서버에 저장된 사본이 있습니다. 불러오면 이 브라우저의 일정을 포함한 작업공간 전체를 교체합니다.</p>" +
          btn("현재 사본 내려받기", "exportWorkspace()") +
          btn("서버 사본 불러오기", "restoreWorkspace()", "primary")
      : "<p>직원 조건·근무표·피드백을 이 브라우저 전용 서버 공간에 저장합니다. 같은 브라우저에서 쿠키가 유지되는 동안 다시 불러올 수 있습니다.</p>" +
          btn("서버에 저장", "storeWorkspace()", "primary"),
  );
}
function exportWorkspace() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
  );
  a.download = "hurai-workspace.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 300);
}
async function storeWorkspace() {
  if (pendingSave) return;
  pendingSave = true;
  $("#dialog").close();
  storageStatus("busy");
  const snapshot = JSON.stringify(state);
  try {
    const response = await fetch("api/workspace", {
      method: serverRevision ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hurai-Client": "workspace",
      },
      body: JSON.stringify({
        revision: serverRevision,
        state: JSON.parse(snapshot),
      }),
    });
    if (response.status === 409) {
      storageStatus("conflict");
      toast(
        "서버 사본이 변경되었습니다. 로컬 변경 사항을 보관한 뒤 확인하세요.",
      );
      return;
    }
    if (!response.ok) throw Error();
    serverRevision = (await response.json()).revision;
    hasChanges = JSON.stringify(state) !== snapshot;
    storageStatus(hasChanges ? "dirty" : "saved");
    toast("서버에 저장했습니다.");
  } catch {
    storageStatus("error");
    toast("서버 저장에 실패했습니다. 현재 브라우저에서 다시 시도하세요.");
  } finally {
    pendingSave = false;
  }
}
async function restoreWorkspace() {
  if (pendingSave) return;
  pendingSave = true;
  try {
    const res = await fetch("api/workspace", { cache: "no-store" });
    if (!res.ok) throw Error();
    const data = await res.json();
    if (!data.state) {
      serverRevision = 0;
      storageStatus("ready");
      $("#dialog").close();
      toast("서버 사본이 만료되었습니다. 현재 사본을 저장할 수 있습니다.");
      return;
    }
    state = data.state;
    serverRevision = data.revision;
    save();
    hasChanges = false;
    storageStatus("saved");
    $("#dialog").close();
    render();
    toast("서버 사본을 불러왔습니다.");
  } catch {
    toast("불러오지 못했습니다. 다시 시도하세요.");
  } finally {
    pendingSave = false;
  }
}
