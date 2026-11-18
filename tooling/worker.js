import {
  CpModel,
  CpSolver,
  CpSolverStatus,
  LinearExpr,
} from "cpsat-js/portable";

function sum(expressions) {
  return expressions.reduce(
    (total, expr) => total.plus(expr),
    LinearExpr.fromConstant(0),
  );
}

self.onmessage = async ({ data: { staff, demand, priority } }) => {
  try {
    const solver = await CpSolver.create({
      locateFile: () => new URL("cpsat.wasm", import.meta.url).href,
    });
    const model = new CpModel();
    const assignments = [];
    const penalties = [];
    const shortages = [];
    let secondaryBound = 0;
    for (const [i, employee] of staff.entries()) {
      const weekly = [];
      for (let d = 0; d < 7; d++) {
        if (d === employee.off) continue;
        const daily = [];
        for (let p = 0; p < 2; p++) {
          if (employee.available !== 2 && employee.available !== p) continue;
          for (const r of employee.skill) {
            const x = model.newBoolVar(`s_${i}_${d}_${p}_${r}`);
            daily.push(x.toLinearExpr());
            assignments.push({ i, d, p, r, x });
            const cost =
              Math.ceil(employee.wage / (priority === "cost" ? 100 : 1000)) +
              (employee.pref === p ? 0 : 8);
            penalties.push(x.times(cost));
            secondaryBound += cost;
          }
        }
        model.add(sum(daily).le(1));
        weekly.push(...daily);
      }
      const shifts = sum(weekly);
      model.add(shifts.le(Math.floor(employee.max / 5)));
      // Increasing marginal costs distribute shifts across available staff.
      for (let n = 1; n < 7; n++) {
        const extra = model.newIntVar(0, 7 - n, `extra_${i}_${n}`);
        model.add(extra.ge(shifts.minus(n)));
        const weight = priority === "balanced" ? 8 : 1;
        penalties.push(extra.times(weight));
        secondaryBound += (7 - n) * weight;
      }
    }
    for (const [d, slots] of demand.entries()) {
      for (const [p, needs] of slots.entries()) {
        for (const [r, needed] of needs.entries()) {
          const gap = model.newIntVar(0, needed, `gap_${d}_${p}_${r}`);
          const coverage = assignments.filter(
            (a) => a.d === d && a.p === p && a.r === r,
          );
          model.add(
            sum(coverage.map((a) => a.x.toLinearExpr()))
              .plus(gap.toLinearExpr())
              .equals(needed),
          );
          shortages.push(gap.toLinearExpr());
        }
      }
    }
    model.minimize(
      sum(shortages)
        .times(secondaryBound + 1)
        .plus(sum(penalties)),
    );
    const result = solver.solve(model, { maxTimeInSeconds: 5 });
    if (
      ![CpSolverStatus.OPTIMAL, CpSolverStatus.FEASIBLE].includes(result.status)
    )
      throw Error("No solution");
    const grid = staff.map(() => Array(7).fill(null));
    for (const { i, d, p, r, x } of assignments)
      if (result.value(x)) grid[i][d] = { r, p };
    self.postMessage({
      grid,
      optimal: result.status === CpSolverStatus.OPTIMAL,
    });
  } catch {
    self.postMessage({ error: true });
  }
};
