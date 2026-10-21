(function () {
  "use strict";

  const STORAGE_KEY = "barcode-demo-v1";

  const SEED = {
    doctors: [{ id: "3D-DOC-1042", name: "Dr. Amara Shah" }],
    patients: [
      { id: "3D-PAT-2281", name: "Elena Ruiz" },
      { id: "3D-PAT-3904", name: "Jordan Hale" }
    ],
    medications: [{ id: "3D-MED-5510", name: "Lisinopril 10mg" }],
    procedures: [{ id: "3D-PRC-7734", name: "Blood pressure cuff" }],
    orders: [{
      id: "ORD-1001",
      doctorId: "3D-DOC-1042",
      patientId: "3D-PAT-2281",
      procedureId: "3D-PRC-7734",
      medicationId: "3D-MED-5510",
      status: "ordered-and-performed"
    }]
  };

  const PREFIX = {
    doctors: "3D-DOC-",
    patients: "3D-PAT-",
    medications: "3D-MED-",
    procedures: "3D-PRC-"
  };

  const FIELD_ERROR = {
    doctors: "Enter a doctor name.",
    patients: "Enter a patient name.",
    medications: "Enter a medication identifier.",
    procedures: "Enter a procedure or device name."
  };

  const STATUS_TEXT = {
    verified: "Verified",
    "not-recognized": "Not recognized",
    "not-linked": "Not linked"
  };

  const SLOT_META = {
    doctor: { title: "Scan doctor barcode", list: "doctors" },
    patient: { title: "Scan patient barcode", list: "patients" },
    procedure: { title: "Scan procedure barcode", list: "procedures" }
  };

  function freshState() {
    return structuredClone(SEED);
  }

  function usedIds(state) {
    return new Set([
      ...state.doctors.map((item) => item.id),
      ...state.patients.map((item) => item.id),
      ...state.medications.map((item) => item.id),
      ...state.procedures.map((item) => item.id),
      ...state.orders.map((item) => item.id)
    ]);
  }

  function isEntity(row) {
    return Boolean(row) && typeof row.id === "string" && row.id.trim() !== "" && typeof row.name === "string" && row.name.trim() !== "";
  }

  function isValidState(data) {
    if (!data || typeof data !== "object") return false;
    const lists = ["doctors", "patients", "medications", "procedures", "orders"];
    if (!lists.every((key) => Array.isArray(data[key]))) return false;
    if (!data.doctors.every(isEntity) || !data.patients.every(isEntity) || !data.medications.every(isEntity) || !data.procedures.every(isEntity)) {
      return false;
    }
    const doctorIds = new Set(data.doctors.map((item) => item.id));
    const patientIds = new Set(data.patients.map((item) => item.id));
    const medicationIds = new Set(data.medications.map((item) => item.id));
    const procedureIds = new Set(data.procedures.map((item) => item.id));
    const all = [
      ...data.doctors.map((item) => item.id),
      ...data.patients.map((item) => item.id),
      ...data.medications.map((item) => item.id),
      ...data.procedures.map((item) => item.id),
      ...data.orders.map((item) => item.id)
    ];
    if (new Set(all).size !== all.length) return false;
    return data.orders.every((order) => {
      return Boolean(order)
        && typeof order.id === "string"
        && doctorIds.has(order.doctorId)
        && patientIds.has(order.patientId)
        && procedureIds.has(order.procedureId)
        && (order.medicationId === null || medicationIds.has(order.medicationId))
        && order.status === "ordered-and-performed";
    });
  }

  function stateFromStorage(raw) {
    if (typeof raw !== "string" || raw.trim() === "") return freshState();
    try {
      const data = JSON.parse(raw);
      return isValidState(data) ? data : freshState();
    } catch (error) {
      return freshState();
    }
  }

  function listSentence(verb, items) {
    if (items.length === 1) return verb + " " + items[0] + ".";
    if (items.length === 2) return verb + " " + items[0] + " and " + items[1] + ".";
    return verb + " " + items.slice(0, -1).join(", ") + ", and " + items[items.length - 1] + ".";
  }

  function generateCode(prefix, state) {
    const used = usedIds(state);
    for (let attempt = 0; attempt < 10000; attempt += 1) {
      const digits = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      const id = prefix + digits;
      if (!used.has(id)) return id;
    }
    return null;
  }

  function addEntity(state, kind, name) {
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!PREFIX[kind]) return { ok: false, error: "Unknown registration type." };
    if (!trimmed) return { ok: false, error: FIELD_ERROR[kind] };
    const id = generateCode(PREFIX[kind], state);
    if (!id) {
      return { ok: false, error: "A unique barcode could not be assigned. Reset demo data and try again." };
    }
    const next = structuredClone(state);
    const entity = { id: id, name: trimmed };
    next[kind].push(entity);
    return { ok: true, state: next, entity: entity };
  }

  function addOrder(state, input) {
    const doctorId = input && input.doctorId ? input.doctorId : "";
    const patientId = input && input.patientId ? input.patientId : "";
    const procedureId = input && input.procedureId ? input.procedureId : "";
    const medicationId = input && input.medicationId ? input.medicationId : null;
    const missing = [];
    if (!doctorId) missing.push("a doctor");
    if (!patientId) missing.push("a patient");
    if (!procedureId) missing.push("a procedure");
    if (missing.length) return { ok: false, error: listSentence("Choose", missing) };

    const doctor = state.doctors.find((item) => item.id === doctorId);
    const patient = state.patients.find((item) => item.id === patientId);
    const procedure = state.procedures.find((item) => item.id === procedureId);
    const medication = medicationId ? state.medications.find((item) => item.id === medicationId) : null;
    if (!doctor || !patient || !procedure) {
      return { ok: false, error: "Choose a doctor, a patient, and a procedure that are already registered." };
    }
    if (medicationId && !medication) {
      return { ok: false, error: "Choose a medication that is already registered." };
    }

    const id = generateCode("ORD-", state);
    if (!id) {
      return { ok: false, error: "A unique order id could not be assigned. Reset demo data and try again." };
    }
    const next = structuredClone(state);
    const order = {
      id: id,
      doctorId: doctorId,
      patientId: patientId,
      procedureId: procedureId,
      medicationId: medication ? medication.id : null,
      status: "ordered-and-performed"
    };
    next.orders.push(order);
    return { ok: true, state: next, order: order };
  }

  function verifyLinkage(state, scan) {
    const doctorId = scan.doctorId;
    const patientId = scan.patientId;
    const procedureId = scan.procedureId;
    const doctor = state.doctors.find((item) => item.id === doctorId) || null;
    const patient = state.patients.find((item) => item.id === patientId) || null;
    const procedure = state.procedures.find((item) => item.id === procedureId) || null;
    const matches = state.orders.filter((order) => {
      return order.doctorId === doctorId
        && order.patientId === patientId
        && order.procedureId === procedureId
        && order.status === "ordered-and-performed";
    });
    const linked = Boolean(doctor && patient && procedure);
    const order = linked && matches.length ? matches[matches.length - 1] : null;
    const message = linked
      ? "Physical and digital verification complete."
      : "Verification failed. One or more barcodes are not in the registry.";

    return {
      doctor: { status: doctor ? "verified" : "not-recognized", name: doctor ? doctor.name : null, id: doctorId },
      patient: { status: patient ? "verified" : "not-recognized", name: patient ? patient.name : null, id: patientId },
      procedure: { status: procedure ? "verified" : "not-recognized", name: procedure ? procedure.name : null, id: procedureId },
      linkage: linked ? "verified" : "not-linked",
      order: order,
      message: message
    };
  }

  function missingScanMessage(scans) {
    const missing = [];
    if (!scans.doctor) missing.push("a doctor");
    if (!scans.patient) missing.push("a patient");
    if (!scans.procedure) missing.push("a procedure");
    if (!missing.length) return null;
    return listSentence("Scan", missing);
  }

  function entityName(list, id) {
    const found = list.find((item) => item.id === id);
    return found ? found.name : "Unknown";
  }

  const api = {
    SEED: SEED,
    freshState: freshState,
    isValidState: isValidState,
    stateFromStorage: stateFromStorage,
    addEntity: addEntity,
    addOrder: addOrder,
    verifyLinkage: verifyLinkage,
    missingScanMessage: missingScanMessage
  };

  if (typeof module !== "undefined" && module.exports && typeof document === "undefined") {
    module.exports = api;
    return;
  }

  const dialog = document.getElementById("scan-dialog");
  const scanList = document.getElementById("scan-list");
  const scanTitle = document.getElementById("scan-title");
  const scanStatus = document.getElementById("scan-status");
  const verifyAlert = document.getElementById("verify-alert");

  let state = readStoredState();
  let scans = { doctor: null, patient: null, procedure: null };
  let lastResult = null;
  let activeSlot = null;
  let scanTimer = null;

  function readStoredState() {
    try {
      return stateFromStorage(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return freshState();
    }
  }

  function persist(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      // The session still runs when the browser blocks storage.
    }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function appendMark(parent) {
    const mark = document.createElement("div");
    mark.className = "mark";
    mark.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.src = "images/3d-barcode.png";
    image.alt = "";
    mark.appendChild(image);
    parent.appendChild(mark);
    return mark;
  }

  function showStep(name) {
    ["register", "verify", "results"].forEach((key) => {
      document.getElementById("panel-" + key).hidden = key !== name;
      const button = document.querySelector('[data-step="' + key + '"]');
      if (key === name) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
  }

  function showKind(kind) {
    document.querySelectorAll("[data-kind]").forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.kind === kind));
    });
    document.querySelectorAll("[data-form]").forEach((form) => {
      form.hidden = form.dataset.form !== kind;
    });
  }

  function renderLastAssigned(payload) {
    const box = document.getElementById("last-assigned");
    box.replaceChildren();
    if (!payload) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    box.append(el("p", "assigned-kicker", payload.kicker));
    if (payload.barcodeId) appendMark(box, payload.barcodeId);
    box.append(el("p", "assigned-name", payload.title), el("p", "mono", payload.code));
    if (payload.detail) box.append(el("p", "muted", payload.detail));
  }

  function renderRegistry() {
    const root = document.getElementById("registry");
    root.replaceChildren();
    [
      ["Doctors", state.doctors],
      ["Patients", state.patients],
      ["Medications", state.medications],
      ["Procedures", state.procedures]
    ].forEach((group) => {
      root.append(el("h3", null, group[0]));
      const list = document.createElement("ul");
      list.className = "record-list";
      group[1].forEach((item) => {
        const li = document.createElement("li");
        appendMark(li, item.id);
        const text = document.createElement("div");
        text.append(el("strong", null, item.name), el("span", "mono", item.id));
        li.append(text);
        list.append(li);
      });
      root.append(list);
    });

    root.append(el("h3", null, "Procedure orders"));
    const orders = document.createElement("ul");
    orders.className = "order-list";
    state.orders.forEach((order) => {
      const medication = order.medicationId ? entityName(state.medications, order.medicationId) : "No medication";
      const li = document.createElement("li");
      li.append(
        el("strong", "mono", order.id),
        el("span", null, entityName(state.doctors, order.doctorId) + " · " + entityName(state.patients, order.patientId) + " · " + entityName(state.procedures, order.procedureId)),
        el("span", "muted", medication)
      );
      orders.append(li);
    });
    root.append(orders);
  }

  function fillSelect(select, items, placeholder) {
    const current = select.value;
    select.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = placeholder;
    select.append(empty);
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name + " · " + item.id;
      select.append(option);
    });
    if (Array.from(select.options).some((option) => option.value === current)) select.value = current;
  }

  function renderOrderOptions() {
    fillSelect(document.getElementById("select-doctor"), state.doctors, "Select a doctor");
    fillSelect(document.getElementById("select-patient"), state.patients, "Select a patient");
    fillSelect(document.getElementById("select-procedure"), state.procedures, "Select a procedure");
    fillSelect(document.getElementById("select-medication"), state.medications, "No medication");
  }

  function renderSlots() {
    ["doctor", "patient", "procedure"].forEach((slot) => {
      const body = document.querySelector('[data-slot-body="' + slot + '"]');
      const button = document.querySelector('[data-scan="' + slot + '"]');
      body.replaceChildren();
      const selected = scans[slot];
      if (!selected) {
        body.append(el("p", "empty", "Not scanned"));
        button.textContent = "Scan";
      } else {
        appendMark(body, selected.id);
        if (slot !== "procedure") {
          body.append(el("p", "slot-name", selected.name), el("p", "mono", selected.id));
        }
        button.textContent = "Scan again";
      }
    });
  }

  function statusPill(status) {
    const passed = status === "verified";
    const pill = el("span", passed ? "status ok" : "status bad");
    pill.append(el("span", null, passed ? "✓" : "✕"));
    pill.lastChild.setAttribute("aria-hidden", "true");
    pill.append(document.createTextNode(" " + STATUS_TEXT[status]));
    return pill;
  }

  function renderResults() {
    const empty = document.getElementById("result-empty");
    const content = document.getElementById("result-content");
    if (!lastResult) {
      empty.hidden = false;
      content.hidden = true;
      return;
    }
    empty.hidden = true;
    content.hidden = false;

    const passed = lastResult.linkage === "verified";
    const message = document.getElementById("result-message");
    message.textContent = lastResult.message;
    message.className = passed ? "verdict pass" : "verdict fail";

    const tbody = document.getElementById("result-rows");
    tbody.replaceChildren();
    [
      ["Doctor", lastResult.doctor],
      ["Patient", lastResult.patient],
      ["Procedure", lastResult.procedure]
    ].forEach((row) => {
      const tr = document.createElement("tr");
      const item = document.createElement("th");
      item.scope = "row";
      const wrap = document.createElement("div");
      wrap.className = "result-item";
      if (row[1].status === "verified") appendMark(wrap, row[1].id);
      const text = document.createElement("div");
      text.append(el("p", null, row[0]));
      const detail = row[1].name ? row[1].name + " · " + row[1].id : row[1].id;
      text.append(el("p", "mono", detail));
      wrap.append(text);
      item.append(wrap);
      const status = document.createElement("td");
      status.append(statusPill(row[1].status));
      tr.append(item, status);
      tbody.append(tr);
    });

    const linkRow = document.createElement("tr");
    const linkItem = document.createElement("th");
    linkItem.scope = "row";
    linkItem.textContent = "Record Linkage";
    const linkStatus = document.createElement("td");
    linkStatus.append(statusPill(lastResult.linkage));
    linkRow.append(linkItem, linkStatus);
    tbody.append(linkRow);

    const detail = document.getElementById("order-detail");
    detail.replaceChildren();
    if (passed && lastResult.order) {
      const order = lastResult.order;
      const pairs = [
        ["Order", order.id],
        ["Doctor", entityName(state.doctors, order.doctorId)],
        ["Patient", entityName(state.patients, order.patientId)],
        ["Procedure", entityName(state.procedures, order.procedureId)],
        ["Status", "Ordered and performed"]
      ];
      if (order.medicationId) pairs.splice(4, 0, ["Medication", entityName(state.medications, order.medicationId)]);
      pairs.forEach((pair) => {
        detail.append(el("dt", null, pair[0]), el("dd", null, pair[1]));
      });
    }
  }

  function openScan(slot) {
    if (dialog.open) return;
    activeSlot = slot;
    const meta = SLOT_META[slot];
    scanTitle.textContent = meta.title;
    scanStatus.textContent = "";
    scanList.replaceChildren();
    const items = state[meta.list];
    if (!items.length) {
      scanList.append(el("p", "muted", "Nothing is registered for this scan yet."));
    }
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "scan-choice";
      appendMark(button, item.id);
      const text = document.createElement("div");
      if (slot === "procedure") text.append(el("p", null, "Procedure"));
      else text.append(el("p", null, item.name), el("p", "mono", item.id));
      button.append(text);
      button.addEventListener("click", () => beginScan(item, button));
      scanList.append(button);
    });
    dialog.dataset.scanning = "false";
    dialog.showModal();
  }

  function beginScan(entity, button) {
    if (dialog.dataset.scanning === "true") return;
    dialog.dataset.scanning = "true";
    button.classList.add("scanning");
    button.querySelector(".mark").classList.add("scanning");
    scanStatus.textContent = "Reading physical mark…";
    scanTimer = setTimeout(() => {
      scans[activeSlot] = { id: entity.id, name: entity.name };
      scanTimer = null;
      dialog.close();
      renderSlots();
      verifyAlert.textContent = "";
    }, 1000);
  }

  function clearForms() {
    document.querySelectorAll("#panel-register input").forEach((input) => {
      input.value = "";
    });
    document.querySelectorAll("#panel-register select").forEach((select) => {
      select.value = "";
    });
    document.querySelectorAll(".field-error").forEach((node) => {
      node.textContent = "";
    });
  }

  function bindEntityForm(kind) {
    document.getElementById("form-" + kind).addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const result = addEntity(state, kind, form.querySelector("input").value);
      const error = form.querySelector(".field-error");
      if (!result.ok) {
        error.textContent = result.error;
        return;
      }
      error.textContent = "";
      state = result.state;
      persist(state);
      form.querySelector("input").value = "";
      renderRegistry();
      renderOrderOptions();
      renderLastAssigned({
        kicker: "Barcode assigned",
        title: result.entity.name,
        code: result.entity.id,
        barcodeId: result.entity.id,
        detail: "Stored with the digital record in this browser."
      });
    });
  }

  document.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => showStep(button.dataset.step));
  });

  document.querySelectorAll("[data-kind]").forEach((button) => {
    button.addEventListener("click", () => showKind(button.dataset.kind));
  });

  ["doctors", "patients", "medications", "procedures"].forEach(bindEntityForm);

  document.getElementById("form-order").addEventListener("submit", (event) => {
    event.preventDefault();
    const result = addOrder(state, {
      doctorId: document.getElementById("select-doctor").value,
      patientId: document.getElementById("select-patient").value,
      procedureId: document.getElementById("select-procedure").value,
      medicationId: document.getElementById("select-medication").value
    });
    const error = event.currentTarget.querySelector(".field-error");
    if (!result.ok) {
      error.textContent = result.error;
      return;
    }
    error.textContent = "";
    state = result.state;
    persist(state);
    event.currentTarget.reset();
    renderRegistry();
    renderOrderOptions();
    const order = result.order;
    const medication = order.medicationId ? entityName(state.medications, order.medicationId) : "No medication";
    renderLastAssigned({
      kicker: "Procedure order created",
      title: entityName(state.doctors, order.doctorId) + ", " + entityName(state.patients, order.patientId),
      code: order.id,
      detail: entityName(state.procedures, order.procedureId) + " · " + medication
    });
  });

  document.querySelectorAll("[data-scan]").forEach((button) => {
    button.addEventListener("click", () => openScan(button.dataset.scan));
  });

  document.getElementById("verify-linkage").addEventListener("click", () => {
    const message = missingScanMessage(scans);
    if (message) {
      verifyAlert.textContent = message;
      return;
    }
    verifyAlert.textContent = "";
    lastResult = verifyLinkage(state, {
      doctorId: scans.doctor.id,
      patientId: scans.patient.id,
      procedureId: scans.procedure.id
    });
    renderResults();
    showStep("results");
  });

  document.getElementById("verify-another").addEventListener("click", () => {
    scans = { doctor: null, patient: null, procedure: null };
    lastResult = null;
    verifyAlert.textContent = "";
    renderSlots();
    renderResults();
    showStep("verify");
  });

  document.getElementById("reset-demo").addEventListener("click", () => {
    if (dialog.open) dialog.close();
    state = freshState();
    persist(state);
    scans = { doctor: null, patient: null, procedure: null };
    lastResult = null;
    clearForms();
    renderRegistry();
    renderOrderOptions();
    renderSlots();
    renderResults();
    renderLastAssigned(null);
    showKind("doctors");
    showStep("register");
    renderLastAssigned({
      kicker: "Demo data restored",
      title: "Original records are back",
      code: "ORD-1001",
      detail: "Dr. Amara Shah, Elena Ruiz, Jordan Hale, Lisinopril 10mg, and the blood pressure cuff."
    });
  });

  document.getElementById("scan-cancel").addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
    dialog.dataset.scanning = "false";
  });

  renderRegistry();
  renderOrderOptions();
  renderSlots();
  renderResults();
})();
