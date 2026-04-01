# Client shell + HecTech vault (this project)

Schools bind **one** client script to their sheet: copy **`Client_Shell_Template/Client_Shell.js.txt`** only.

- Add **one** library: this vault’s Script ID.
- Identifier must be exactly **`HecTechVault`**.

Class settings and subject context (`CTX_*`) are stored in the **client** project’s Script Properties, not the library’s.

## Deploy vault
**Deploy** → **Library** → copy Script ID.

## Client Google Sheet
**Extensions → Apps Script** → paste the contents of **`Client_Shell.js.txt`** → **Libraries** → add Script ID → identifier **`HecTechVault`**.

## Secondary (JHS/SHS) vault
Use the separate **secondary vault repo**; it ships its own single `Client_Shell.js.txt` with identifier **`HecTechSecondaryVault`**.

## Updates
Publish a new library version from the vault; client sheets pick it up on HEAD or after a version bump.
