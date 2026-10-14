import assert from "node:assert/strict";
import test from "node:test";
import { canAccessBranchManagement, getRoleNames, hasGlobalSystemAdminRole } from "../shared/role-policy";

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

test("Kurucu can open branch management without becoming a global System Administrator", () => {
  const kurucu = { roller: [{ rol: "Kurucu" }] };
  assert.equal(canAccessBranchManagement(kurucu), true);
  assert.equal(hasGlobalSystemAdminRole(kurucu), false);
  assert.equal(canAccessBranchManagement({ roller: [{ rol: "Müdür" }] }), false);
  assert.equal(canAccessBranchManagement({ globalRol: "Sistem Yöneticisi" }), true);
});
