let state;
try {
  state = JSON.parse(localStorage.getItem(key)) || initial();
} catch {
  state = initial();
}
let week = initialDate,
  page = "schedule",
  mode = "grid",
  filter = -1,
  day = 2;
const $ = (s) => document.querySelector(s),
  money = (n) => n.toLocaleString("ko-KR"),
  short = (s) => s.slice(5).replace("-", "."),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const paths = {
  calendar: "M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 5q5 3 0 6 M18 15q4 0 4 5",
  chart: "M4 3v17h17 M8 16v-4 M13 16V7 M18 16v-7",
  spark: "m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z",
  store: "M3 10l2-6h14l2 6 M3 10q2 5 5 0 3 5 6 0 4 5 7 0 M5 14v6h14v-6",
  layers: "m3 7 9-5 9 5-9 5z M3 12l9 5 9-5 M3 17l9 5 9-5",
  wallet: "M4 7h15V4L4 7v13h17V8H4 M16 12h5v4h-5z",
  clock: "M12 3a9 9 0 1 1-.01 0 M12 7v5l3 2",
  target: "M12 3a9 9 0 1 1-.01 0 M12 7a5 5 0 1 1-.01 0",
  alert: "m12 3 10 17H2z M12 9v5 M12 17v.2",
  check: "m4 12 5 5L20 6",
  sliders: "M4 7h7m4 0h5 M4 17h3m5 0h8 M11 4v6 M8 14v6",
  arrow: "m9 5 7 7-7 7",
  book: "M12 6Q7 2 2 5v15q5-3 10 0 5-3 10 0V5q-5-3-10 1v14",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  flame: "M12 2c2 6 7 6 7 12a7 7 0 0 1-14 0c0-3 2-5 4-7 0 4 2 4 2 4s3-4 1-9z",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  download: "M12 3v12m-5-5 5 5 5-5 M4 17v4h16v-4",
  bulb: "M9 17c0-3-4-4-4-8a7 7 0 0 1 14 0c0 4-4 5-4 8z M9 21h6",
};
function ic(k) {
  return (
    '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="' +
    paths[k] +
    '"/></svg>'
  );
}
const nav = {
  schedule: ["calendar", "주간 근무표"],
  employees: ["users", "직원 관리"],
  sales: ["chart", "매출·수요 분석"],
  insight: ["bulb", "운영 개선"],
};
function save() {
  markChanged();
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    toast("브라우저 저장 공간을 확인해 주세요.");
  }
}
function current() {
  if (!state.weeks[week]) {
    let grid = generate(state, week);
    if (week === initialDate) {
      [4, 5].forEach((d) => {
        let row = grid.find((x) => x[d]?.p === 1 && x[d]?.r === 0);
        if (row) row[d] = null;
      });
    }
    state.weeks[week] = { grid, final: false };
    save();
  }
  return state.weeks[week];
}
function go(k) {
  location.hash = k;
  page = k;
  document.body.classList.remove("opened");
  render();
  window.scrollTo(0, 0);
}
function currentPage() {
  const route = location.hash.slice(1);
  if (Object.hasOwn(nav, route)) return route;
  if (route) history.replaceState(null, "", "#schedule");
  return "schedule";
}
window.onhashchange = () => {
  page = currentPage();
  render();
};
function btn(t, fn, cl = "") {
  return '<button class="' + cl + '" onclick="' + fn + '">' + t + "</button>";
}
function toast(msg) {
  $("#toast").textContent = msg;
  $("#toast").classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $("#toast").classList.remove("show"), 2500);
}
function modal(title, html) {
  $("#dialog").innerHTML =
    '<div class="modalhead"><h2>' +
    title +
    "</h2>" +
    btn("×", "dialog.close()", "close") +
    "</div>" +
    html;
  $("#dialog").showModal();
}
function jump(n) {
  week = dateAt(week, n * 7);
  render();
}
function render() {
  let w = current(),
    g = w.grid,
    problems = issues(state, week, g);
  document.title = nav[page][1] + " · HURAI";
  $("#side").innerHTML =
    '<div class="brand"><b>' +
    ic("flame") +
    '</b>HURAI<span>.</span></div><button class="store" onclick="storeSettings()" aria-label="매장 정보 수정">' +
    ic("store") +
    "<div><strong>" +
    esc(state.store?.name || "후라이 숯불구이") +
    "</strong><small>" +
    esc(state.store?.branch || "대구 본점") +
    '</small></div></button><small class="navlabel">매장 운영</small>' +
    Object.entries(nav)
      .slice(0, 4)
      .map(([k, [i, n]]) =>
        btn(
          ic(i) + n,
          "go(\'" + k + "\')",
          "nav " + (page === k ? "active" : ""),
        ),
      )
      .join("") +
    "<footer>" +
    '<div class="profile"><b>점</b><div>점주 워크스페이스<small>매장 운영 관리자</small></div></div></footer>';
  $("#top").innerHTML =
    "<div>" +
    btn(ic("menu"), "document.body.classList.toggle(\'opened\')", "mobile") +
    ic("layers") +
    " 워크스페이스 <em>/</em> <strong>" +
    nav[page][1] +
    "</strong></div>" +
    storageButton();
  let dt =
    '<div class="weeknav">' +
    btn("‹", "jump(-1)") +
    '<button class="datepick" onclick="pickWeek()" aria-label="근무 주 선택">' +
    ic("calendar") +
    week.slice(0, 4) +
    ". " +
    short(week) +
    " – " +
    short(dateAt(week, 6)) +
    "</button>" +
    btn("›", "jump(1)") +
    "</div>";
  let sub = {
    schedule: "직원 배치와 인력 수요를 한눈에 확인하세요.",
    employees: "직원별 업무 역량과 근무 가능 조건을 관리하세요.",
    sales: "요일별 매출 패턴으로 시간대별 필요 인력을 확인하세요.",
    insight: "현장 피드백과 배치 기록을 다음 편성에 반영하세요.",
  };
  $("#main").innerHTML =
    '<div class="pagehead"><div><h1>' +
    nav[page][1] +
    "</h1><p>" +
    sub[page] +
    "</p></div>" +
    (["schedule", "sales", "insight"].includes(page) ? dt : "") +
    "</div>" +
    (page === "schedule"
      ? dashboard(g, problems)
      : page === "employees"
        ? employees()
        : page === "sales"
          ? salesPage()
          : insights(problems));
}
function dashboard(g, problems) {
  let hours = g.reduce((n, row) => n + row.filter(Boolean).length * 5, 0),
    cost = g.reduce((n, row, i) => n + used(g, i) * state.staff[i].wage, 0),
    rev = state.sales.flat().reduce((a, b) => a + b, 0);
  let art =
    '<div class="art" aria-hidden="true"><div class="sheet"><b></b><div>' +
    Array.from(
      { length: 21 },
      (_, i) => '<i class="c' + (i % 5) + '"></i>',
    ).join("") +
    "</div></div><span>✦</span></div>";
  let banner =
    '<section class="hero"><div><small>' +
    ic("spark") +
    " HURAI PLANNER</small><h2>스마트 근무 편성</h2><p>매출 수요와 직원별 조건을 반영해 이번 주 근무표를 편성하세요.</p>" +
    btn(ic("spark") + "자동 편성", "generation()", "light") +
    btn(ic("sliders") + "편성 조건", "settings()", "ghost") +
    "</div>" +
    art +
    "</section>";
  let stats = [
    [
      "users",
      "배치 직원",
      g.filter((row) => row.some(Boolean)).length,
      "명",
      "등록 직원 " + g.length + "명",
    ],
    ["clock", "총 근무시간", money(hours), "시간", "주간 배치 합계"],
    ["wallet", "예상 인건비", money(cost), "원", "기본 시급 기준"],
    [
      "chart",
      "예상 인건비율",
      ((100 * cost) / rev).toFixed(1),
      "%",
      "예상 매출 대비",
    ],
  ];
  return (
    banner +
    '<div class="stats">' +
    stats
      .map(
        ([i, t, v, u, n], k) =>
          '<article><div><span class="ico tone' +
          k +
          '">' +
          ic(i) +
          "</span>" +
          t +
          "</div><strong>" +
          v +
          "<small>" +
          u +
          "</small></strong><small>" +
          n +
          "</small></article>",
      )
      .join("") +
    '</div><div class="split"><section class="panel"><div class="panelhead"><h2>근무 일정 <mark>' +
    (current().final ? "확정" : "편성 초안") +
    "</mark></h2>" +
    btn(ic("download"), "downloadCSV()", "square") +
    '</div><div class="tools"><div class="tabs">' +
    btn("직원별", "switchMode(\'grid\')", mode === "grid" ? "sel" : "") +
    btn("시간대별", "switchMode(\'time\')", mode === "time" ? "sel" : "") +
    '</div><select aria-label="담당 업무 필터" onchange="filter=Number(this.value);render()"><option value="-1">전체 업무</option>' +
    roles
      .map(
        (r, i) =>
          '<option value="' +
          i +
          '" ' +
          (filter === i ? "selected" : "") +
          ">" +
          r +
          "</option>",
      )
      .join("") +
    "</select></div>" +
    (mode === "grid" ? table(g) : timeline(g)) +
    '<div class="panelbottom"><span>근무 칸을 선택해 일정을 수정하세요.</span>' +
    btn(current().final ? "편집 재개" : "근무표 확정", "confirmWeek()") +
    '</div></section><div class="rail"><section class="panel"><div class="panelhead"><h2>' +
    ic("target") +
    ' 근무표 점검</h2><mark class="warn">' +
    problems.length +
    "건</mark></div>" +
    (problems.slice(0, 3).map(issueCard).join("") ||
      '<p class="pad">모든 배치 조건을 충족합니다.</p>') +
    btn("전체 점검 내역 ›", "allIssues()", "link") +
    '</section><section class="panel insight"><div class="panelhead"><h2>' +
    ic("spark") +
    " 운영 인사이트</h2></div><strong>저녁 피크 수요</strong><p>예상 매출이 가장 높은 " +
    peak() +
    "요일 저녁의 업무별 배치를 확인하세요.</p>" +
    btn("운영 개선 보기 →", "go(\'insight\')", "link") +
    "</section></div></div>"
  );
}
function switchMode(m) {
  mode = m;
  render();
}
function peak() {
  return days[
    state.sales
      .map((s) => s[1])
      .indexOf(Math.max(...state.sales.map((s) => s[1])))
  ];
}
function issueCard(x) {
  return (
    '<button class="issue" onclick="inspect(' +
    JSON.stringify(x).replaceAll('"', "&quot;") +
    ')"><span>' +
    ic("alert") +
    "</span><div><strong>" +
    x.title +
    "</strong><small>" +
    days[x.d] +
    "요일 · " +
    periods[x.p] +
    (x.i != null ? " · " + state.staff[x.i].name : "") +
    "</small></div>›</button>"
  );
}
function table(g) {
  return (
    '<div class="scroll"><table class="roster"><thead><tr><th>직원</th>' +
    days
      .map(
        (v, d) =>
          "<th>" + v + " <small>" + dateAt(week, d).slice(-2) + "</small></th>",
      )
      .join("") +
    "</tr></thead><tbody>" +
    g
      .map((row, i) => {
        let e = state.staff[i];
        if (
          filter >= 0 &&
          !row.some((s) => s?.r === filter) &&
          !e.skill.includes(filter)
        )
          return "";
        return (
          '<tr><th><span class="avatar a' +
          (i % 5) +
          '">' +
          e.name[0] +
          "</span>" +
          e.name +
          "</th>" +
          row
            .map(
              (s, d) =>
                "<td>" +
                btn(
                  s
                    ? "<b>" +
                        roles[s.r] +
                        "</b><small>" +
                        periods[s.p].replaceAll(":00", "") +
                        "시</small>"
                    : "휴무",
                  "editShift(" + i + "," + d + ")",
                  "shift " +
                    (s ? "role" + s.r : "off") +
                    (s && rules(state, g, i, d).length ? " invalid" : "") +
                    (s && filter >= 0 && s.r !== filter ? " dim" : ""),
                ) +
                "</td>",
            )
            .join("") +
          "</tr>"
        );
      })
      .join("") +
    "</tbody></table></div>"
  );
}
function timeline(g) {
  return (
    '<div class="pad"><div class="daytabs">' +
    days
      .map((v, d) => btn(v, "day=" + d + ";render()", d === day ? "sel" : ""))
      .join("") +
    "</div>" +
    periods
      .map(
        (p, j) =>
          "<h3>" +
          p +
          "</h3>" +
          roles
            .map((r, k) => {
              if (filter >= 0 && filter !== k) return "";
              let ids = state.staff
                .map((e, i) =>
                  g[i][day]?.p === j && g[i][day].r === k ? e.name : null,
                )
                .filter(Boolean);
              return (
                '<div class="row"><strong>' +
                r +
                "</strong><span>" +
                ids.join(", ") +
                " · " +
                ids.length +
                "/" +
                need(state, week, day, j, k) +
                "명</span></div>"
              );
            })
            .join(""),
      )
      .join("") +
    "</div>"
  );
}
function editShift(i, d, init) {
  if (current().final) {
    toast("확정된 근무표입니다. 편집 재개를 선택하세요.");
    return;
  }
  let s = init || current().grid[i][d],
    e = state.staff[i];
  modal(
    e.name + " · " + days[d] + "요일",
    "<p>" +
      dateAt(week, d) +
      " · 가능 업무 " +
      e.skill.map((r) => roles[r]).join(", ") +
      " · 주 " +
      e.max +
      '시간 이내</p><form onsubmit="event.preventDefault();setShift(' +
      i +
      "," +
      d +
      ')"><label>근무 시간대<select id="period"><option value="-1">휴무</option>' +
      periods
        .map(
          (v, j) =>
            '<option value="' +
            j +
            '" ' +
            (s?.p === j ? "selected" : "") +
            ">" +
            v +
            "</option>",
        )
        .join("") +
      '</select></label><label>담당 업무<select id="role">' +
      roles
        .map(
          (v, j) =>
            '<option value="' +
            j +
            '" ' +
            (s?.r === j ? "selected" : "") +
            ">" +
            v +
            "</option>",
        )
        .join("") +
      '</select></label><button class="primary">일정 저장</button></form>',
  );
}
function setShift(i, d) {
  let p = +$("#period").value;
  current().grid[i][d] = p < 0 ? null : { p, r: +$("#role").value };
  finish("일정을 저장했습니다.");
}
function finish(msg) {
  save();
  $("#dialog").close();
  render();
  toast(msg);
}
function settings() {
  modal(
    "편성 조건",
    '<form onsubmit="event.preventDefault();state.priority=this.priority.value;state.unit=Number(this.unit.value);Object.values(state.weeks).forEach(w=>w.final=false);finish(\'편성 조건을 저장했습니다.\')"><label>편성 우선순위<select name="priority"><option value="balanced">근무시간 균형</option><option value="cost" ' +
      (state.priority === "cost" ? "selected" : "") +
      '>인건비 효율</option></select></label><label>시간대당 직원 1명의 기준 매출액 (원)<input name="unit" type="number" min="100000" max="2000000" required value="' +
      state.unit +
      '"></label><p>각 업무에 최소 1명을 배치합니다. 설정 변경 후 자동 편성으로 근무표를 갱신하세요.</p><button class="primary">조건 저장</button></form>',
  );
}
function generation() {
  if (current().final) {
    toast("편집 재개 후 자동 편성할 수 있습니다.");
    return;
  }
  modal(
    "자동 편성 중",
    '<p role="status">OR-Tools가 직원별 조건과 인력 수요를 계산하고 있습니다.</p><button onclick="dialog.close()">취소</button>',
  );
  const dialog = $("#dialog");
  let worker;
  try {
    worker = new Worker(new URL("solver/worker.mjs", document.baseURI), {
      type: "module",
    });
  } catch {
    dialog.close();
    toast(
      "편성 엔진을 시작할 수 없습니다. HTTPS 또는 localhost에서 다시 시도하세요.",
    );
    return;
  }
  const timer = setTimeout(failed, 30000);
  function cleanup() {
    worker.terminate();
    clearTimeout(timer);
    dialog.removeEventListener("close", cleanup);
  }
  function failed() {
    cleanup();
    if (dialog.open) {
      dialog.close();
      toast("편성안 계산에 실패했습니다. 기존 일정은 보존되었습니다.");
    }
  }
  dialog.addEventListener("close", cleanup, { once: true });
  worker.onerror = failed;
  worker.onmessage = ({ data }) => {
    cleanup();
    if (!dialog.open) return;
    if (!data.grid) {
      failed();
      return;
    }
    showProposal(data.grid, data.optimal);
  };
  const demand = days.map((_, d) =>
    periods.map((_, p) => roles.map((_, r) => need(state, week, d, p, r))),
  );
  worker.postMessage({
    demand,
    priority: state.priority,
    staff: state.staff.map(({ skill, off, available, max, wage, pref }) => ({
      skill,
      off,
      available,
      max,
      wage,
      pref,
    })),
  });
}
function showProposal(proposal, optimal) {
  let change = proposal.reduce(
    (n, row, i) =>
      n +
      row.filter(
        (s, d) => JSON.stringify(s) !== JSON.stringify(current().grid[i][d]),
      ).length,
    0,
  );
  const weekCost = (grid) =>
    grid.reduce(
      (total, row, i) =>
        total + row.filter(Boolean).length * 5 * state.staff[i].wage,
      0,
    );
  const original = current(),
    targetWeek = week;
  window.applyProposal = () => {
    if (week !== targetWeek || current() !== original || original.final) {
      $("#dialog").close();
      toast("일정이 변경되었습니다. 다시 편성하세요.");
      return;
    }
    current().grid = proposal;
    finish("새 편성안을 적용했습니다.");
  };
  modal(
    "자동 편성 결과",
    "<p><b>OR-Tools CP-SAT · " +
      (optimal ? "최적해 확인" : "제한 시간 내 실행 가능안") +
      '</b></p><p>현재 조건으로 만든 편성안을 검토하세요. 적용하면 이 주의 기존 일정을 교체합니다.</p><div class="row">변경되는 근무 칸 <b>' +
      change +
      '개</b></div><div class="row">남은 점검 항목 <b>' +
      issues(state, week, proposal).length +
      "건</b></div>" +
      '<div class="row">예상 기본 인건비<b>' +
      money(weekCost(original.grid)) +
      " → " +
      money(weekCost(proposal)) +
      "원</b></div>" +
      btn("편성안 적용", "applyProposal()", "primary"),
  );
}
function allIssues() {
  let xs = issues(state, week, current().grid);
  modal(
    "근무표 점검",
    xs.map(issueCard).join("") || "<p>모든 배치 조건을 충족합니다.</p>",
  );
}
function inspect(x) {
  $("#dialog").close();
  if (x.i != null) {
    editShift(x.i, x.d);
    return;
  }
  let g = current().grid;
  let ids = state.staff
    .map((e, i) => i)
    .filter((i) => {
      let e = state.staff[i];
      return (
        !g[i][x.d] &&
        e.skill.includes(x.r) &&
        e.off !== x.d &&
        used(g, i) + 5 <= e.max &&
        (e.available === 2 || e.available === x.p)
      );
    });
  modal(
    x.title,
    "<p>" +
      days[x.d] +
      "요일 " +
      periods[x.p] +
      " · 추가 배치 가능한 직원</p>" +
      (ids
        .map((i) =>
          btn(
            state.staff[i].name +
              " · " +
              money(state.staff[i].wage) +
              "원/시간  ›",
            "dialog.close();editShift(" +
              i +
              "," +
              x.d +
              ",{r:" +
              x.r +
              ",p:" +
              x.p +
              "})",
            "candidate",
          ),
        )
        .join("") ||
        "<p>조건을 충족하는 대체 인력이 없습니다. 직원 조건과 다른 시간대의 배치를 검토하세요.</p>"),
  );
}
function confirmWeek() {
  if (current().final) {
    current().final = false;
    save();
    render();
    return;
  }
  let n = issues(state, week, current().grid).length;
  if (n) {
    allIssues();
    return;
  }
  current().final = true;
  save();
  render();
  toast("주간 근무표를 확정했습니다.");
}
function downloadCSV() {
  let csv = ["날짜,직원,업무,시간대"];
  current().grid.forEach((row, i) =>
    row.forEach((s, d) => {
      if (s)
        csv.push(
          [dateAt(week, d), state.staff[i].name, roles[s.r], periods[s.p]].join(
            ",",
          ),
        );
    }),
  );
  let a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(["\ufeff" + csv.join("\n")], { type: "text/csv;charset=utf-8" }),
  );
  a.download = "HURAI-" + week + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
function employees() {
  return (
    '<section class="panel"><div class="panelhead"><h2>직원 명단 <mark>' +
    state.staff.length +
    "명</mark></h2>" +
    btn("직원 등록", "employee(state.staff.length)", "primary") +
    '</div><div class="staffgrid">' +
    state.staff
      .map((e, i) =>
        btn(
          '<span class="avatar a' +
            (i % 5) +
            '">' +
            e.name[0] +
            "</span><strong>" +
            e.name +
            "</strong><small>" +
            e.skill.map((r) => roles[r]).join(" · ") +
            "</small><p>주 " +
            e.max +
            "시간 · 시급 " +
            money(e.wage) +
            "원</p>",
          "employee(" + i + ")",
          "staffcard",
        ),
      )
      .join("") +
    "</div></section>"
  );
}
function options(list, sel) {
  return list
    .map(
      (v, i) =>
        '<option value="' +
        i +
        '" ' +
        (sel === i ? "selected" : "") +
        ">" +
        v +
        "</option>",
    )
    .join("");
}
function employee(i) {
  const e = state.staff[i] || {
    name: "",
    skill: [0],
    max: 30,
    wage: 12000,
    off: 7,
    pref: 0,
    available: 2,
  };
  modal(
    e.name ? esc(e.name) + " 근무 조건" : "직원 등록",
    '<form onsubmit="event.preventDefault();updateEmployee(' +
      i +
      ',this)"><label>직원 이름<input required maxlength="30" name="displayName" value="' +
      esc(e.name) +
      '"></label><label>가능 업무</label><div class="checks">' +
      roles
        .map(
          (r, j) =>
            '<label><input name="skill" type="checkbox" value="' +
            j +
            '" ' +
            (e.skill.includes(j) ? "checked" : "") +
            ">" +
            r +
            "</label>",
        )
        .join("") +
      '</div><div class="fields"><label>주간 상한 (시간)<input name="max" type="number" min="0" max="60" required value="' +
      e.max +
      '"></label><label>시급 (원)<input name="wage" type="number" min="1" max="1000000" required value="' +
      e.wage +
      '"></label></div><label>희망 휴무일<select name="off">' +
      options([...days, "없음"], e.off) +
      '</select></label><label>근무 가능 시간<select name="available">' +
      options([...periods, "모든 시간대"], e.available) +
      '</select></label><label>선호 시간대<select name="pref">' +
      options(periods, e.pref) +
      '</select></label><button class="primary">조건 저장</button></form>',
  );
}
function updateEmployee(i, f) {
  let skill = [...f.querySelectorAll("[name=skill]:checked")].map(
    (x) => +x.value,
  );
  if (!skill.length) {
    toast("가능 업무를 하나 이상 선택하세요.");
    return;
  }
  const name = f.elements.displayName.value.trim();
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .·-]{0,29}$/u.test(name)) {
    toast("이름은 글자나 숫자로 시작하는 30자 이내로 입력하세요.");
    return;
  }
  if (i === state.staff.length) {
    if (i >= 80) {
      toast("직원은 최대 80명까지 등록할 수 있습니다.");
      return;
    }
    state.staff.push({});
    Object.values(state.weeks).forEach((w) => w.grid.push(Array(7).fill(null)));
  }
  Object.assign(state.staff[i], {
    name,
    skill,
    ...Object.fromEntries(
      ["max", "wage", "off", "available", "pref"].map((k) => [
        k,
        +f.elements[k].value,
      ]),
    ),
  });
  Object.values(state.weeks).forEach((w) => (w.final = false));
  finish("직원 조건을 저장했습니다.");
}
function salesPage() {
  let max = Math.max(...state.sales.flat());
  return (
    '<section class="panel"><div class="panelhead"><h2>요일별 예상 매출</h2>' +
    btn("기초 매출 수정", "editSales()") +
    '</div><div class="pad"><p>과거 동일 요일·시간대 평균 매출로 산정한 예시 수요입니다.</p><div class="legend">● 점심 &nbsp; <b>● 저녁</b></div><div class="chart">' +
    state.sales
      .map(
        (v, d) =>
          "<div><div>" +
          v
            .map(
              (n, p) =>
                '<i title="' +
                money(n) +
                '원" style="height:' +
                Math.round((n / max) * 155) +
                'px" class="bar' +
                p +
                '"></i>',
            )
            .join("") +
          "</div><small>" +
          days[d] +
          "</small></div>",
      )
      .join("") +
    '</div></div></section><section class="panel spaced"><div class="panelhead"><h2>업무별 배치 기준</h2></div><div class="scroll"><table><thead><tr><th>요일</th><th>시간대</th><th>평균 매출</th>' +
    roles.map((r) => "<th>" + r + "</th>").join("") +
    "</tr></thead><tbody>" +
    state.sales
      .map((s, d) =>
        s
          .map(
            (v, p) =>
              "<tr><th>" +
              days[d] +
              "</th><td>" +
              periods[p] +
              "</td><td>" +
              money(v) +
              "원</td>" +
              roles
                .map((_, r) => "<td>" + need(state, week, d, p, r) + "명</td>")
                .join("") +
              "</tr>",
          )
          .join(""),
      )
      .join("") +
    "</tbody></table></div></section>"
  );
}
function editSales() {
  modal(
    "기초 매출 수정",
    '<form onsubmit="event.preventDefault();saveSales(this)"><p>과거 같은 요일의 점심·저녁 평균 매출을 원 단위로 입력하세요.</p>' +
      state.sales
        .map(
          (s, d) =>
            '<div class="fields">' +
            s
              .map(
                (n, p) =>
                  "<label>" +
                  days[d] +
                  " · " +
                  ["점심", "저녁"][p] +
                  '<input name="s' +
                  d +
                  p +
                  '" type="number" min="1" max="100000000" required value="' +
                  n +
                  '"></label>',
              )
              .join("") +
            "</div>",
        )
        .join("") +
      '<button class="primary">매출 저장</button></form>',
  );
}
function saveSales(f) {
  state.sales = state.sales.map((s, d) =>
    s.map((_, p) => +f.elements["s" + d + p].value),
  );
  Object.values(state.weeks).forEach((w) => (w.final = false));
  finish("수요 기준을 갱신했습니다.");
}
function proposal() {
  let max = -1,
    pick = 0;
  state.sales.forEach((s, d) => {
    let votes = state.feedback.filter(
        (f) => f.d === d && f.week === week,
      ).length,
      score = s[1] / state.unit + votes;
    if (score > max) {
      max = score;
      pick = d;
    }
  });
  return pick;
}
function insights(xs) {
  let d = proposal(),
    target = dateAt(week, 7),
    id = [d, 1, 0].join("-"),
    ok = state.boost[target]?.includes(id);
  return (
    '<div class="split"><section class="panel"><div class="panelhead"><h2>' +
    ic("spark") +
    ' 운영 개선 제안</h2><mark>규칙 기반 예시</mark></div><div class="pad"><h2>' +
    days[d] +
    "요일 저녁 홀 인력 보강</h2><p>저녁 예상 매출 " +
    money(state.sales[d][1]) +
    "원, 해당 요일의 혼잡 피드백 " +
    state.feedback.filter((f) => f.d === d && f.week === week).length +
    '건입니다. 다음 주 같은 시간대 홀 기준을 1명 높이는 안을 검토하세요.</p><div class="row">현재 주간 점검 항목<b>' +
    xs.length +
    '건</b></div><div class="row">추가 배치 시 근무시간<b>5시간</b></div><p>적용 대상 ' +
    target +
    " 주간 · 승인 후 해당 주 자동 편성 시 반영</p>" +
    btn(
      ok ? "승인 취소" : "다음 주 기준에 반영",
      "approve(" + d + ")",
      "primary",
    ) +
    '</div></section><section class="panel"><div class="panelhead"><h2>익명 현장 피드백</h2></div><div class="pad"><form onsubmit="event.preventDefault();addFeedback(this)"><label>혼잡했던 저녁<select name="d">' +
    options(days, day) +
    '</select></label><label>현장 메모<textarea name="note" required maxlength="300" placeholder="어느 업무에 손이 더 필요했나요?"></textarea></label><button>피드백 기록</button></form>' +
    state.feedback
      .filter((f) => f.week === week)
      .slice()
      .reverse()
      .map(
        (f) =>
          '<div class="note"><b>' +
          days[f.d] +
          "요일 저녁</b><p>" +
          esc(f.note) +
          "</p></div>",
      )
      .join("") +
    "</div></section></div>"
  );
}
function approve(d) {
  let w = dateAt(week, 7),
    id = [d, 1, 0].join("-"),
    a = state.boost[w] || [];
  state.boost[w] = a.includes(id) ? a.filter((x) => x !== id) : [...a, id];
  if (state.weeks[w]) state.weeks[w].final = false;
  save();
  render();
  toast("다음 주 편성 기준을 저장했습니다.");
}
function addFeedback(f) {
  let note = f.note.value.trim();
  if (!note) return;
  state.feedback.push({ week, d: +f.d.value, note });
  save();
  render();
  toast("익명 피드백을 기록했습니다.");
}
page = currentPage();
render();

discoverStorage();

function storeSettings() {
  modal(
    "매장 정보",
    '<form onsubmit="event.preventDefault();saveStore(this)"><label>매장명<input name="storeName" required maxlength="30" value="' +
      esc(state.store?.name || "후라이 숯불구이") +
      '"></label><label>지점명<input name="branch" required maxlength="30" value="' +
      esc(state.store?.branch || "대구 본점") +
      '"></label><button class="primary">매장 정보 저장</button></form>',
  );
}
function saveStore(f) {
  const name = f.storeName.value.trim(),
    branch = f.branch.value.trim();
  if (!name || !branch) return;
  state.store = { name, branch };
  finish("매장 정보를 저장했습니다.");
}
function pickWeek() {
  modal(
    "근무 주 선택",
    '<form onsubmit="event.preventDefault();selectDate(this.date.value)"><label>확인할 날짜<input name="date" type="date" required min="2000-01-01" max="2099-12-31" value="' +
      week +
      '"></label><button class="primary">해당 주 열기</button></form>',
  );
}
function selectDate(date) {
  const weekday = new Date(date + "T12:00:00Z").getUTCDay();
  week = dateAt(date, -((weekday + 6) % 7));
  $("#dialog").close();
  render();
}
