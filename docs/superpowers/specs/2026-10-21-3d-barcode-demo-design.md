# 3D Barcode Healthcare Verification Demo

## Purpose

A proof-of-concept web page for a stakeholder meeting. It shows how a one-of-a-kind physical barcode can stand in for a doctor, a patient, a medication, or a procedure, and how scanning those marks can confirm that a billed procedure matches a digital order.

The demo does not detect fraud at scale, talk to a payer, or manufacture 3D barcodes. It has to be openable in a browser on a laptop, readable on a projector, and usable on a phone width.

## Approach

A static site in this folder. No install, no server, and no database. The page stores registries and orders in `localStorage`. Opening `index.html` is the whole setup.

Camera scanning is out of scope. A 3D barcode is not a QR code. Each scan is a guided pick from barcodes already in the registry, followed by a scan animation of about one second.

## Files

| File | Responsibility |
|---|---|
| `index.html` | The three steps, forms, scan slots, and results |
| `styles.css` | Clinical layout, barcode drawing, and phone stacking |
| `app.js` | Seed data, registration, scanning, verification, reset |
| `README.md` | How to open the demo and the two click paths for the meeting |

## Screens

One page. Three steps in a top navigation: **Register**, **Verify**, and **Results**. Any step can be opened directly.

### Register

Four entity forms and one order form.

| Form | Fields | Barcode prefix |
|---|---|---|
| Doctor | Name | `3D-DOC-` |
| Patient | Name | `3D-PAT-` |
| Medication | Identifier (the drug name and strength) | `3D-MED-` |
| Procedure or device | Name | `3D-PRC-` |
| Procedure order | Doctor, patient, procedure, optional medication | `ORD-` |

Submitting an entity form assigns a barcode and shows it. The user does not type the barcode. The barcode is the prefix plus four digits. Generation draws a four-digit number and retries until that full code is unused across every entity. A saved entity cannot be given a code that already exists.

Submitting a procedure order links one existing doctor, one existing patient, one existing procedure, and an optional existing medication. The order is stored as ordered and performed. There is no separate status workflow. The order id is `ORD-` plus four digits, unique among orders.

Each form requires its name or identifier. The order form requires a doctor, a patient, and a procedure. Medication may be left unset. A form with a missing required field does not save and names the missing field.

### Verify

Three slots: Doctor, Patient, and Procedure. Medication is not a scan slot. It appears on the matched order when one exists.

**Scan** on a slot opens the registered barcodes of that type only. Choosing one plays an animation of about one second, then the slot shows the barcode and the registered name. Choosing again replaces that slot. There is no free-text barcode entry, because the presenter should not be able to invent an unknown code during the meeting.

**Verify linkage** requires all three slots to be filled. If one is empty, the page stays on Verify and asks for the missing scans. When all three are filled, the page moves to Results.

### Results

Four rows:

| Row | Pass | Fail |
|---|---|---|
| Doctor | Verified | Not recognized |
| Patient | Verified | Not recognized |
| Procedure | Verified | Not recognized |
| Record Linkage | Verified | Not linked |

When all four rows pass, the page ends with **Physical and digital verification complete.** and shows the matched order: order id, doctor, patient, procedure, medication when present, and the status ordered and performed. If more than one order contains the same three barcodes, show the most recently created match.

When the doctor, patient, and procedure are Verified and linkage is Not linked, the page ends with **Verification failed. These barcodes are not linked to the same performed procedure.**

When any of the three is Not recognized, the page ends with **Verification failed. One or more barcodes are not in the registry.**

**Verify another** clears the three slots and returns to Verify. It does not delete registries or orders.

**Reset demo data** replaces `localStorage` with the seed below, clears the scan slots and the last result, and opens Register.

## Seed data

Loaded the first time the page opens, and again on reset.

**Success case, order `ORD-1001`**

| Role | Name | Barcode |
|---|---|---|
| Doctor | Dr. Amara Shah | `3D-DOC-1042` |
| Patient | Elena Ruiz | `3D-PAT-2281` |
| Medication | Lisinopril 10mg | `3D-MED-5510` |
| Procedure | Blood pressure cuff | `3D-PRC-7734` |

`ORD-1001` links Shah, Ruiz, the cuff, and Lisinopril, and is ordered and performed.

**Mismatch case**

| Role | Name | Barcode |
|---|---|---|
| Patient | Jordan Hale | `3D-PAT-3904` |

Hale is registered and is not on `ORD-1001` or any other seed order.

Meeting paths:

- Shah + Ruiz + the cuff verifies all four rows.
- Shah + Hale + the cuff verifies the doctor, patient, and procedure, and fails record linkage.

## Verification rules

Evaluate the three barcodes, then look for one order.

1. A barcode that is still in its registry is **Verified**. A barcode whose entity is no longer stored is **Not recognized**. The guided picker only lists current entities, so Not recognized is a stored-data failure, not a path the presenter chooses.
2. Record linkage passes only when one order contains all three barcodes and is marked ordered and performed. Every order created in this demo has that status, so the live test is whether the three barcodes share an order.
3. If no order contains all three, linkage is **Not linked**. Registered entities on that attempt stay **Verified**.
4. If any of the three is Not recognized, linkage is **Not linked**.

## Data

`localStorage` key: `barcode-demo-v1`.

```json
{
  "doctors": [{ "id": "3D-DOC-1042", "name": "Dr. Amara Shah" }],
  "patients": [
    { "id": "3D-PAT-2281", "name": "Elena Ruiz" },
    { "id": "3D-PAT-3904", "name": "Jordan Hale" }
  ],
  "medications": [{ "id": "3D-MED-5510", "name": "Lisinopril 10mg" }],
  "procedures": [{ "id": "3D-PRC-7734", "name": "Blood pressure cuff" }],
  "orders": [{
    "id": "ORD-1001",
    "doctorId": "3D-DOC-1042",
    "patientId": "3D-PAT-2281",
    "procedureId": "3D-PRC-7734",
    "medicationId": "3D-MED-5510",
    "status": "ordered-and-performed"
  }]
}
```

Hale is a second patient and has no order. `medicationId` may be `null`. If the stored value is missing or unreadable, the page loads the seed.

## Visual design

Off-white background, deep teal headings, large type for a projector. Each barcode is drawn as stacked bands in different colors so it reads as a physical layered mark. Status uses a green check or a red mark together with the words Verified, Not recognized, or Not linked. On a narrow viewport the steps and forms stack in one column.

## Demo check

Before the meeting, confirm all of the following by opening `index.html`:

1. Shah + Ruiz + the cuff shows four Verified rows, the success sentence, and order `ORD-1001` with Lisinopril.
2. Shah + Hale + the cuff shows the doctor, patient, and procedure as Verified, linkage as Not linked, and the failure sentence.
3. A new doctor can be registered, placed on a new order with Ruiz and the cuff, and that order verifies.
4. Reset restores Shah, Ruiz, Hale, Lisinopril, the cuff, and `ORD-1001`, and removes the doctor added in step 3.
5. At a phone width, the steps and forms stack without overlapping.

## Out of scope

Real camera scanning, printed codes, a backend, accounts, payer submission, medication as a required scan, and more than one failure status for an order.
