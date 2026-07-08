import { intervalsOverlap, timeToMinutes } from "@/lib/domain/slots";
import type { Row, Store } from "@/lib/dev/fake-db";

type Filter = { col: string; op: "eq" | "neq" | "gte" | "lte" | "in" | "is" | "isnot"; val: unknown };
type Mode = "many" | "single" | "maybeSingle";
type Op = { type: "insert" | "update" | "upsert"; payload: Row | Row[]; opts?: { onConflict?: string } };
type Result = { data: unknown; error: { code?: string; message: string } | null };

function randomId(): string {
  return crypto.randomUUID();
}

function defaultsFor(table: string): Row {
  if (table === "insurance_companies" || table === "appointment_types") return { active: true };
  if (table === "quirofano_candidatos") return { status: "pendiente" };
  return {};
}

function hasDuplicate(table: string, payload: Row, rows: Row[]): boolean {
  if (table === "insurance_companies") {
    return rows.some((r) => String(r.name).toLowerCase() === String(payload.name).toLowerCase());
  }
  if (table === "appointment_types") {
    return rows.some((r) => r.agenda === payload.agenda && String(r.name).toLowerCase() === String(payload.name).toLowerCase());
  }
  return false;
}

function hasOverlap(rows: Row[], candidate: Row, excludeId: string | null): boolean {
  const start = timeToMinutes(String(candidate.start_time).slice(0, 5));
  const end = start + Number(candidate.duration_minutes);
  return rows.some((r) => {
    if (excludeId && r.id === excludeId) return false;
    if (r.agenda !== candidate.agenda || r.date !== candidate.date) return false;
    if (r.status === "cancelada") return false;
    const rStart = timeToMinutes(String(r.start_time).slice(0, 5));
    const rEnd = rStart + Number(r.duration_minutes);
    return intervalsOverlap(start, end, rStart, rEnd);
  });
}

// Reimplementa, en memoria, el subconjunto de la API de supabase-js que usa esta app
// (select/eq/neq/gte/lte/in/or/order/limit/single/maybeSingle/insert/update/upsert).
// Es "thenable" a propósito: el código real hace `await supabase.from(x)...`.
export class FakeQueryBuilder implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private orFilter: { col: string; pattern: string }[] | null = null;
  private orders: { col: string; asc: boolean }[] = [];
  private limitN: number | null = null;
  private mode: Mode = "many";
  private embeds = new Set<string>();
  private op: Op | null = null;

  constructor(
    private table: string,
    private store: Store,
  ) {}

  private rows(table: string): Row[] {
    return this.store[table] ?? (this.store[table] = []);
  }

  select(cols: string) {
    const re = /(\w+)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(cols))) this.embeds.add(m[1]);
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push({ col, op: "eq", val });
    return this;
  }
  neq(col: string, val: unknown) {
    this.filters.push({ col, op: "neq", val });
    return this;
  }
  gte(col: string, val: unknown) {
    this.filters.push({ col, op: "gte", val });
    return this;
  }
  lte(col: string, val: unknown) {
    this.filters.push({ col, op: "lte", val });
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push({ col, op: "in", val: vals });
    return this;
  }
  is(col: string, val: null | boolean) {
    this.filters.push({ col, op: "is", val });
    return this;
  }
  not(col: string, _op: string, val: unknown) {
    this.filters.push({ col, op: "isnot", val });
    return this;
  }
  or(expr: string) {
    this.orFilter = expr.split(",").map((part) => {
      const [col, , pattern] = part.split(".");
      return { col, pattern: pattern.replace(/%/g, "") };
    });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending ?? true });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = { type: "insert", payload };
    return this;
  }
  update(payload: Row) {
    this.op = { type: "update", payload };
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    this.op = { type: "upsert", payload, opts };
    return this;
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private matches(row: Row): boolean {
    for (const f of this.filters) {
      const val = row[f.col];
      if (f.op === "eq" && val !== f.val) return false;
      if (f.op === "neq" && val === f.val) return false;
      if (f.op === "gte" && !(val != null && String(val) >= String(f.val))) return false;
      if (f.op === "lte" && !(val != null && String(val) <= String(f.val))) return false;
      if (f.op === "in" && !(f.val as unknown[]).includes(val)) return false;
      if (f.op === "is" && val !== f.val) return false;
      if (f.op === "isnot" && val === f.val) return false;
    }
    if (this.orFilter) {
      const any = this.orFilter.some(({ col, pattern }) => String(row[col] ?? "").toLowerCase().includes(pattern.toLowerCase()));
      if (!any) return false;
    }
    return true;
  }

  private embed(row: Row): Row {
    const out = { ...row };
    if (this.embeds.has("patients") && "patient_id" in row) {
      out.patients = row.patient_id ? (this.rows("patients").find((p) => p.id === row.patient_id) ?? null) : null;
    }
    if (this.embeds.has("insurance_companies") && "insurance_company_id" in row) {
      out.insurance_companies = row.insurance_company_id
        ? (this.rows("insurance_companies").find((c) => c.id === row.insurance_company_id) ?? null)
        : null;
    }
    if (this.embeds.has("appointment_types") && "appointment_type_id" in row) {
      out.appointment_types = row.appointment_type_id
        ? (this.rows("appointment_types").find((t) => t.id === row.appointment_type_id) ?? null)
        : null;
    }
    return out;
  }

  private shape(rows: Row[]): Result {
    if (this.mode === "single") {
      if (rows.length === 0) return { data: null, error: { code: "PGRST116", message: "No rows found" } };
      return { data: rows[0], error: null };
    }
    if (this.mode === "maybeSingle") {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  private execute(): Result {
    if (this.op) return this.executeOp();

    let rows = this.rows(this.table).filter((r) => this.matches(r));
    if (this.orders.length > 0) {
      rows = [...rows].sort((a, b) => {
        for (const { col, asc } of this.orders) {
          const av = a[col] as string | number | null;
          const bv = b[col] as string | number | null;
          if (av == null && bv == null) continue;
          if (av == null) return asc ? -1 : 1;
          if (bv == null) return asc ? 1 : -1;
          if (av < bv) return asc ? -1 : 1;
          if (av > bv) return asc ? 1 : -1;
        }
        return 0;
      });
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    return this.shape(rows.map((r) => this.embed(r)));
  }

  private executeOp(): Result {
    const table = this.rows(this.table);
    const op = this.op!;

    if (op.type === "insert") {
      const payload = Array.isArray(op.payload) ? op.payload : [op.payload];
      for (const p of payload) {
        if (hasDuplicate(this.table, p, table)) return { data: null, error: { code: "23505", message: "duplicate" } };
        if (this.table === "appointments" && hasOverlap(table, p, null)) {
          return { data: null, error: { code: "23P01", message: "overlap" } };
        }
      }
      const now = new Date().toISOString();
      const created = payload.map((p) => ({ id: randomId(), created_at: now, updated_at: now, ...defaultsFor(this.table), ...p }));
      table.push(...created);
      return this.shape(created.map((r) => this.embed(r)));
    }

    if (op.type === "update") {
      const targets = table.filter((r) => this.matches(r));
      if (this.table === "appointments") {
        for (const t of targets) {
          const merged = { ...t, ...op.payload };
          if (hasOverlap(table, merged, t.id as string)) return { data: null, error: { code: "23P01", message: "overlap" } };
        }
      }
      const now = new Date().toISOString();
      for (const t of targets) Object.assign(t, op.payload, { updated_at: now });
      return this.shape(targets.map((r) => this.embed(r)));
    }

    // upsert
    const payload = Array.isArray(op.payload) ? op.payload : [op.payload];
    const conflictCols = (op.opts?.onConflict ?? "id").split(",");
    const results: Row[] = [];
    for (const p of payload) {
      const existing = table.find((r) => conflictCols.every((c) => r[c] === p[c]));
      if (existing) {
        Object.assign(existing, p);
        results.push(existing);
      } else {
        const now = new Date().toISOString();
        const row = { id: randomId(), created_at: now, ...p };
        table.push(row);
        results.push(row);
      }
    }
    return this.shape(results);
  }
}
