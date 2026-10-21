const test = require("node:test");
const assert = require("node:assert/strict");
const {
  freshState,
  isValidState,
  stateFromStorage,
  addEntity,
  addOrder,
  verifyLinkage,
  missingScanMessage
} = require("../app.js");

const successScan = {
  doctorId: "3D-DOC-1042",
  patientId: "3D-PAT-2281",
  procedureId: "3D-PRC-7734"
};

test("seed matches the meeting records", () => {
  const state = freshState();
  assert.deepEqual(state.doctors, [{ id: "3D-DOC-1042", name: "Dr. Amara Shah" }]);
  assert.deepEqual(state.patients, [
    { id: "3D-PAT-2281", name: "Elena Ruiz" },
    { id: "3D-PAT-3904", name: "Jordan Hale" }
  ]);
  assert.deepEqual(state.medications, [{ id: "3D-MED-5510", name: "Lisinopril 10mg" }]);
  assert.deepEqual(state.procedures, [{ id: "3D-PRC-7734", name: "Blood pressure cuff" }]);
  assert.equal(state.orders[0].id, "ORD-1001");
  assert.equal(state.orders[0].medicationId, "3D-MED-5510");
  assert.equal(state.orders[0].status, "ordered-and-performed");
});

test("Shah, Ruiz, and the cuff verify with the linked order", () => {
  const result = verifyLinkage(freshState(), successScan);
  assert.equal(result.doctor.status, "verified");
  assert.equal(result.patient.status, "verified");
  assert.equal(result.procedure.status, "verified");
  assert.equal(result.linkage, "verified");
  assert.equal(result.order.id, "ORD-1001");
  assert.equal(result.order.medicationId, "3D-MED-5510");
  assert.equal(result.message, "Physical and digital verification complete.");
});

test("Shah, Hale, and the cuff fail record linkage only", () => {
  const result = verifyLinkage(freshState(), {
    doctorId: "3D-DOC-1042",
    patientId: "3D-PAT-3904",
    procedureId: "3D-PRC-7734"
  });
  assert.equal(result.doctor.status, "verified");
  assert.equal(result.doctor.name, "Dr. Amara Shah");
  assert.equal(result.patient.status, "verified");
  assert.equal(result.patient.name, "Jordan Hale");
  assert.equal(result.procedure.status, "verified");
  assert.equal(result.linkage, "not-linked");
  assert.equal(result.order, null);
  assert.equal(result.message, "Verification failed. These barcodes are not linked to the same performed procedure.");
});

test("an unrecognized barcode fails registry verification", () => {
  const result = verifyLinkage(freshState(), {
    doctorId: "3D-DOC-0000",
    patientId: "3D-PAT-2281",
    procedureId: "3D-PRC-7734"
  });
  assert.equal(result.doctor.status, "not-recognized");
  assert.equal(result.patient.status, "verified");
  assert.equal(result.procedure.status, "verified");
  assert.equal(result.linkage, "not-linked");
  assert.equal(result.message, "Verification failed. One or more barcodes are not in the registry.");
});

test("a newly registered doctor verifies on a new order", () => {
  const added = addEntity(freshState(), "doctors", "Dr. Priya Nair");
  assert.equal(added.ok, true);
  assert.match(added.entity.id, /^3D-DOC-\d{4}$/);
  const ordered = addOrder(added.state, {
    doctorId: added.entity.id,
    patientId: "3D-PAT-2281",
    procedureId: "3D-PRC-7734",
    medicationId: ""
  });
  assert.equal(ordered.ok, true);
  assert.equal(ordered.order.medicationId, null);
  assert.equal(ordered.order.status, "ordered-and-performed");
  const result = verifyLinkage(ordered.state, {
    doctorId: added.entity.id,
    patientId: "3D-PAT-2281",
    procedureId: "3D-PRC-7734"
  });
  assert.equal(result.linkage, "verified");
  assert.equal(result.order.id, ordered.order.id);
});

test("the newest matching order is the one shown", () => {
  const ordered = addOrder(freshState(), successScan);
  const result = verifyLinkage(ordered.state, successScan);
  assert.equal(result.order.id, ordered.order.id);
  assert.notEqual(result.order.id, "ORD-1001");
});

test("blank and incomplete forms name the missing field", () => {
  assert.equal(addEntity(freshState(), "doctors", "   ").error, "Enter a doctor name.");
  assert.equal(addEntity(freshState(), "medications", "").error, "Enter a medication identifier.");
  const missing = addOrder(freshState(), { doctorId: "", patientId: "", procedureId: "3D-PRC-7734" });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "Choose a doctor and a patient.");
});

test("verification asks for every empty scan", () => {
  assert.equal(missingScanMessage({ doctor: null, patient: null, procedure: null }), "Scan a doctor, a patient, and a procedure.");
  assert.equal(missingScanMessage({ doctor: { id: "x" }, patient: null, procedure: { id: "y" } }), "Scan a patient.");
  assert.equal(missingScanMessage({ doctor: { id: "x" }, patient: { id: "y" }, procedure: { id: "z" } }), null);
});

test("fresh state replaces missing or unreadable storage", () => {
  assert.equal(isValidState(null), false);
  assert.equal(isValidState({ doctors: [] }), false);
  const restored = stateFromStorage("{");
  assert.equal(restored.patients[1].name, "Jordan Hale");
  const broken = freshState();
  broken.orders[0].doctorId = "3D-DOC-0000";
  assert.equal(isValidState(broken), false);
  assert.equal(stateFromStorage(JSON.stringify(broken)).orders[0].doctorId, "3D-DOC-1042");
});

test("assigned barcodes stay unique", () => {
  let state = freshState();
  const ids = new Set();
  for (let i = 0; i < 20; i += 1) {
    const added = addEntity(state, "patients", "Patient " + i);
    assert.equal(added.ok, true);
    assert.equal(ids.has(added.entity.id), false);
    ids.add(added.entity.id);
    state = added.state;
  }
});
