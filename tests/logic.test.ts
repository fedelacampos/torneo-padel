import { describe, it, expect } from "vitest";
import { validateMatch, validateSet, formatScore } from "@/lib/scoring";
import { buildZones, roundRobin, standings, firstRound, seedOrder, seedQualifiers } from "@/lib/draw";
import { koCategoryPoints, DEFAULT_POINTS } from "@/lib/ranking";

describe("sets", () => {
  it("acepta sets normales", () => {
    expect(validateSet({ a: 6, b: 4 }, 1)).toBeNull();
    expect(validateSet({ a: 5, b: 7 }, 1)).toBeNull();
    expect(validateSet({ a: 6, b: 5 }, 1)).not.toBeNull();
    expect(validateSet({ a: 8, b: 6 }, 1)).not.toBeNull();
  });
  it("tiebreak", () => {
    expect(validateSet({ a: 7, b: 6, tbA: 7, tbB: 5 }, 1)).toBeNull();
    expect(validateSet({ a: 7, b: 6, tbA: 12, tbB: 10 }, 1)).toBeNull();
    expect(validateSet({ a: 7, b: 6, tbA: 7, tbB: 6 }, 1)).not.toBeNull();
    expect(validateSet({ a: 7, b: 6, tbA: 5, tbB: 7 }, 1)).not.toBeNull(); // ganó el tb el otro
    expect(validateSet({ a: 7, b: 6 }, 1)).not.toBeNull();
  });
  it("supertiebreak a 10 con diferencia de 2", () => {
    expect(validateSet({ a: 10, b: 8, super: true }, 3)).toBeNull();
    expect(validateSet({ a: 11, b: 9, super: true }, 3)).toBeNull();
    expect(validateSet({ a: 9, b: 11, super: true }, 3)).toBeNull();
    expect(validateSet({ a: 10, b: 9, super: true }, 3)).not.toBeNull();
    expect(validateSet({ a: 12, b: 9, super: true }, 3)).not.toBeNull();
  });
});

describe("partidos", () => {
  it("mejor de 3", () => {
    const r = validateMatch([{ a: 6, b: 4 }, { a: 3, b: 6 }, { a: 7, b: 6, tbA: 7, tbB: 3 }], "BEST_OF_3");
    expect(r.ok && r.result.winner).toBe("A");
    expect(validateMatch([{ a: 6, b: 4 }, { a: 6, b: 2 }, { a: 6, b: 2 }], "BEST_OF_3").ok).toBe(false);
    expect(validateMatch([{ a: 6, b: 4 }, { a: 3, b: 6 }], "BEST_OF_3").ok).toBe(false);
  });
  it("con supertiebreak", () => {
    const r = validateMatch([{ a: 6, b: 4 }, { a: 3, b: 6 }, { a: 9, b: 11, super: true }], "SUPER_TB");
    expect(r.ok && r.result.winner).toBe("B");
    expect(validateMatch([{ a: 6, b: 4 }, { a: 3, b: 6 }, { a: 6, b: 3 }], "SUPER_TB").ok).toBe(false);
  });
  it("formato", () => {
    expect(formatScore([{ a: 6, b: 4 }, { a: 6, b: 7, tbA: 5, tbB: 7 }, { a: 10, b: 8, super: true }])).toBe("6-4 6-7(5) [10-8]");
  });
});

describe("sorteo", () => {
  it("zonas de 3 con sobrante", () => {
    const pairs = Array.from({ length: 10 }, (_, i) => ({ id: "p" + i }));
    const z = buildZones(pairs, 3);
    expect(z.map((x) => x.length).sort()).toEqual([3, 3, 4]);
  });
  it("todos contra todos", () => {
    expect(roundRobin([1, 2, 3]).length).toBe(3);
    expect(roundRobin([1, 2, 3, 4]).length).toBe(6);
  });
  it("orden de siembra", () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
  it("cuadro con byes y sin cruces de misma zona", () => {
    const q = seedQualifiers(
      ["A", "B", "C"].map((n) => ({ name: n, ranked: [n + "1", n + "2"] })),
      2,
    );
    const r = firstRound(q);
    expect(r.length).toBe(4);
    expect(r.filter((m) => m[1] === null).length).toBe(2); // 2 byes
    for (const [a, b] of r) if (a && b) expect(a.zone).not.toBe(b.zone);
  });
  it("tabla de posiciones", () => {
    const s = standings(["x", "y", "z"], [
      { pairAId: "x", pairBId: "y", winnerId: "x", sets: [{ a: 6, b: 1 }, { a: 6, b: 1 }], walkover: false },
      { pairAId: "y", pairBId: "z", winnerId: "y", sets: [{ a: 6, b: 4 }, { a: 6, b: 4 }], walkover: false },
      { pairAId: "x", pairBId: "z", winnerId: "z", sets: [{ a: 6, b: 4 }, { a: 4, b: 6 }, { a: 8, b: 10, super: true }], walkover: false },
    ]);
    expect(s.map((r) => r.pairId)).toEqual(["x", "y", "z"]);
  });
});

describe("ranking", () => {
  it("puntos por instancia", () => {
    const pts = koCategoryPoints(
      ["a", "b", "c", "d", "e"],
      [
        { round: 4, pairAId: "a", pairBId: "b", winnerId: "a" },
        { round: 4, pairAId: "c", pairBId: "d", winnerId: "c" },
        { round: 2, pairAId: "a", pairBId: "c", winnerId: "c" },
      ],
      DEFAULT_POINTS,
    );
    expect(pts.get("c")).toBe(200);
    expect(pts.get("a")).toBe(150);
    expect(pts.get("b")).toBe(100);
    expect(pts.get("e")).toBe(25);
  });
});

import { fillMessage, suggestSuperior, DEFAULT_REJECT } from "@/lib/messages";
describe("mensajes", () => {
  it("categoría superior", () => {
    expect(suggestSuperior("5ta Caballeros", ["4ta Caballeros", "5ta Caballeros"])).toBe("4ta Caballeros");
    expect(suggestSuperior("7ma Damas", [])).toBe("6ta Damas");
    expect(suggestSuperior("Mixto", [])).toBe("");
  });
  it("completa el mensaje", () => {
    const t = fillMessage(DEFAULT_REJECT, { nombre: "Sofía", categoria: "7ma Damas", superior: "6ta Damas" });
    expect(t).toContain("¡Hola Sofía!");
    expect(t).toContain("anotarte en 7ma Damas");
    expect(t).toContain("participes en 6ta Damas");
    expect(t).not.toContain("[");
  });
});
