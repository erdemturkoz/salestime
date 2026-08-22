import assert from "node:assert/strict";
import { test } from "node:test";
import { pdfHtmlMetniniKacir } from "../client/src/utils/teklif-pdf-generator";

test("PDF metin kaçışı eğitim alanındaki HTML'i düz metne dönüştürür", () => {
  const metin = `<img src=x onerror="alert('xss')">`;
  assert.equal(
    pdfHtmlMetniniKacir(metin),
    "&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;",
  );
});