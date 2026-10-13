import assert from "node:assert/strict";
import test from "node:test";
import { getRoleNames, hasGlobalSystemAdminRole } from "../shared/role-policy";

test("only a global System Administrator has full-system authority", () => {
  assert.equal(hasGlobalSystemAdminRole({ globalRol: "Sistem Yöneticisi", roller: [] }), true);
  assert.equal(hasGlobalSystemAdminRole({ roller: [{ rol: "Kurucu" }] }), false);
  assert.equal(hasGlobalSystemAdminRole({ roller: [{ rol: "Müdür" }] }), false);
});

test("role list combines the global role with branch-scoped roles", () => {
  assert.deepEqual(
    getRoleNames({
      globalRol: "Sistem Yöneticisi",
      roller: [{ rol: "Kurucu" }, { rol: "Kurucu" }],
    }),
    ["Sistem Yöneticisi", "Kurucu"],
  );
  assert.deepEqual(getRoleNames(null), []);
});
