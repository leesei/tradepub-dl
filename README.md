# `tradepub-dl`

Parse TradePub's library page as structured JSON and download PDF in batch.

# Usage

To install dependencies:

```bash
bun install
```

Get the magic link to your library at TradePub.
Save the page as HTML, say "My Account.html".

```bash
./tradepub-dl.ts My\ Account.html
# you can use date filter to only download newer files
./tradepub-dl.ts --from 2024-10-02 My\ Account.html
```

# NOTE

- "Requested" titles with no "OPEN NOW" link will not be downloaded  
  using `.reqcard:not(.client)` as filter

# TODO

- use Puppeteer to visit magic link and create `books.json`
- Make title file-system safe  
  replace "/" for \*nix, more for Windows

---

# `findpub`

Find the publisher of downloaded PDF files using the file name and print out the move commands

```bash
# run `tradepub-dl` to get `books.json`

# single layer
fd -d 1 -t f > books.txt

# print the move commands
./findpub.ts books.json books.txt | sort
```
