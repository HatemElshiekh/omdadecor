// Pure quantity calculator, shared by the page and the assistant tool.
(function (g) {
  const STD = { door: 0.9 * 2.1, window: 1.2 * 1.2 };

  function parseFromName(name) {
    const n = String(name || "");
    const out = {};
    const tile = n.match(/(\d+(?:\.\d+)?)\s*[\*×xX]\s*(\d+(?:\.\d+)?)/);
    if (tile) { out.tileW = +tile[1]; out.tileL = +tile[2]; }
    const cm = n.match(/(\d+(?:\.\d+)?)\s*سم/);
    if (cm) out.widthCm = +cm[1];
    const len = n.match(/(?:طول\s*)?(\d+(?:\.\d+)?)\s*(?:متر|م\b)/) || n.match(/طول\s*(\d+(?:\.\d+)?)/);
    if (len && +len[1] <= 6) out.lengthM = +len[1];
    return out;
  }

  // input: {mode:'wall'|'floor'|'linear', a, b, openingsM2, unitAreaM2, unitLengthM, perBox, wastePct, stock, unitPrice}
  function calculate(i) {
    const waste = Math.max(0, +i.wastePct || 0) / 100;
    const r = { mode: i.mode, wastePct: +i.wastePct || 0 };
    if (i.mode === "linear") {
      const total = Math.max(0, +i.a || 0);
      const piece = +i.unitLengthM || 0;
      if (!total || !piece) return { error: "أدخل الطول المطلوب وطول العود" };
      r.netQty = round(total); r.qtyUnit = "متر طولي";
      r.grossQty = round(total * (1 + waste));
      r.units = Math.ceil(r.grossQty / piece - 1e-9);
    } else {
      const area = Math.max(0, (+i.a || 0) * (+i.b || 0));
      const net = Math.max(0, area - (i.mode === "wall" ? (+i.openingsM2 || 0) : 0));
      const ua = +i.unitAreaM2 || 0;
      if (!area || !ua) return { error: "أدخل المقاسات ومساحة الوحدة" };
      r.grossArea = round(area); r.netQty = round(net); r.qtyUnit = "م²";
      r.grossQty = round(net * (1 + waste));
      r.units = Math.ceil(r.grossQty / ua - 1e-9);
    }
    if (+i.perBox > 1) r.boxes = Math.ceil(r.units / +i.perBox - 1e-9);
    const sellUnits = r.boxes || r.units;
    if (i.stock != null && i.stock !== "") {
      r.stock = +i.stock;
      r.stockOk = r.stock >= sellUnits;
      r.shortage = r.stockOk ? 0 : sellUnits - r.stock;
    }
    if (+i.unitPrice > 0) r.total = round(sellUnits * +i.unitPrice);
    return r;
  }
  function round(x) { return Math.round(x * 100) / 100; }

  g.OmdaCalc = { calculate, parseFromName, STD };
  if (typeof module !== "undefined") module.exports = g.OmdaCalc;
})(typeof window !== "undefined" ? window : globalThis);
