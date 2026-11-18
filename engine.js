const days = [..."월화수목금토일"],
  roles = ["홀 서빙", "주방", "그릴"],
  periods = ["11:00–16:00", "17:00–22:00"];
const initialDate = "2026-11-16",
  key = "hurai-workspace-v1";
function dateAt(week, d) {
  let date = new Date(week + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + d);
  return date.toISOString().slice(0, 10);
}
function initial() {
  const names =
    "김지훈 박서연 이민수 최예린 정현우 윤하진 강도윤 한소희 오지수 서준호 임유진 신태민 장하늘 배서진 문지안".split(
      " ",
    );
  const staff = names.map((name, i) => ({
    name,
    skill: [i % 3, ...(i % 4 === 0 ? [(i + 1) % 3] : [])],
    max: i % 3 === 0 ? 35 : 30,
    wage: 12000 + (i % 4) * 500,
    off: (i + 3) % 7,
    pref: i % 2,
    available: 2,
  }));
  const sales = Array.from({ length: 7 }, (_, d) => [
    680000 + (d % 3) * 50000 + (d > 4 ? 420000 : 0),
    1150000 + (d >= 4 ? 750000 : 0) + d * 22000,
  ]);
  return {
    staff,
    sales,
    weeks: {},
    feedback: [],
    boost: {},
    unit: 600000,
    priority: "balanced",
  };
}
function need(state, w, d, p, r) {
  return (
    Math.max(
      1,
      Math.ceil((state.sales[d][p] * [0.46, 0.29, 0.25][r]) / state.unit),
    ) + (state.boost[w]?.includes([d, p, r].join("-")) ? 1 : 0)
  );
}
function used(grid, i) {
  return grid[i].filter(Boolean).length * 5;
}
function rules(state, grid, i, d) {
  let s = grid[i][d],
    e = state.staff[i];
  if (!s) return [];
  return [
    !e.skill.includes(s.r) && "업무 역량 미충족",
    e.off === d && "희망 휴무일 배정",
    e.available !== 2 && e.available !== s.p && "근무 가능 시간 위반",
    used(grid, i) > e.max && "주간 계약 상한 초과",
  ].filter(Boolean);
}
function generate(state, w) {
  let best,
    score = Infinity;
  for (let pass = 0; pass < 24; pass++) {
    let grid = state.staff.map(() => Array(7).fill(null)),
      cost = 0;
    for (let j = 0; j < 7; j++) {
      let d = (j + pass) % 7;
      for (let k = 0; k < 6; k++) {
        let n = (k + pass) % 6,
          p = n % 2,
          r = Math.floor(n / 2);
        for (let a = 0; a < need(state, w, d, p, r); a++) {
          const candidates = state.staff
            .map((e, i) => ({ e, i }))
            .filter(
              ({ e, i }) =>
                e.skill.includes(r) &&
                e.off !== d &&
                (e.available === 2 || e.available === p) &&
                !grid[i][d] &&
                used(grid, i) + 5 <= e.max,
            );
          function rank({ e, i }) {
            return (
              (used(grid, i) / e.max) * 8 +
              (e.pref !== p ? 2 : 0) +
              (e.wage - 12000) / (state.priority === "cost" ? 350 : 2500) +
              e.skill.length * 0.3 +
              ((i + pass) % 7) * 0.05
            );
          }
          candidates.sort((x, y) => rank(x) - rank(y));
          if (!candidates.length) {
            cost += 10000;
            break;
          }
          let { e, i } = candidates[0];
          grid[i][d] = { r, p };
          cost += rank({ e, i });
        }
      }
    }
    if (cost < score) {
      score = cost;
      best = grid;
    }
  }
  return best;
}
function issues(state, w, grid) {
  let out = [];
  days.forEach((_, d) => {
    periods.forEach((_, p) =>
      roles.forEach((_, r) => {
        let assigned = grid.filter(
          (row) => row[d]?.r === r && row[d]?.p === p,
        ).length;
        let gap = need(state, w, d, p, r) - assigned;
        if (gap > 0)
          out.push({ d, p, r, gap, title: roles[r] + " " + gap + "명 부족" });
      }),
    );
    grid.forEach((_, i) =>
      rules(state, grid, i, d).forEach((title) =>
        out.push({ d, i, title, p: grid[i][d].p }),
      ),
    );
  });
  return out;
}
