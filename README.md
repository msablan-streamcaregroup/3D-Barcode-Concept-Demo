# 3D Barcode Verification Demo

Open `index.html` in Chrome or Edge. There is no install and no server.

The page is a stakeholder walkthrough. A physical barcode stands in for a doctor, patient, medication, or procedure. Verification passes only when the doctor, patient, and procedure belong to the same performed order.

## Loaded records

| Role | Name | Barcode |
|---|---|---|
| Doctor | Dr. Amara Shah | `3D-DOC-1042` |
| Patient | Elena Ruiz | `3D-PAT-2281` |
| Patient | Jordan Hale | `3D-PAT-3904` |
| Medication | Lisinopril 10mg | `3D-MED-5510` |
| Procedure | Blood pressure cuff | `3D-PRC-7734` |

Order `ORD-1001` links Dr. Amara Shah, Elena Ruiz, the blood pressure cuff, and Lisinopril 10mg. Jordan Hale is registered and is not on that order.

## Path that verifies

1. Open **Verify**.
2. Scan Dr. Amara Shah, Elena Ruiz, and Blood pressure cuff. Each scan takes about a second.
3. Choose **Verify linkage**.

Doctor, Patient, Procedure, and Record Linkage show Verified. The page reads: Physical and digital verification complete. Order `ORD-1001` includes Lisinopril 10mg.

## Path that fails

1. Choose **Verify another**.
2. Scan Dr. Amara Shah, Jordan Hale, and Blood pressure cuff.
3. Choose **Verify linkage**.

Doctor, Patient, and Procedure show Verified. Record Linkage shows Not linked, because Hale is not on the same performed order.

## Register during the meeting

Use **Register** to add a doctor, patient, medication, or procedure. Each one receives a barcode. Create a procedure order to link a doctor, patient, and procedure, with an optional medication. Then verify that order.

**Reset demo data** restores the records above and removes anything added in the browser.
