# `tradepub-dl`

Parse TradePub's library page as structured JSON and download PDF in batch.

# Usage

To install dependencies:

```bash
bun install
```

Get the magic link to your library at TradePub's [My Library](https://www.tradepub.com/?pt=myacct&page=history).
Save the page as HTML, say "My Account.html".

```bash
# these two output `books.json`
./tradepub-dl.ts My\ Account.html
# you can use date filter to only download newer files
./tradepub-dl.ts --from 2024-10-02 My\ Account.html

# add `--download` to actually download the eBooks
# skip download if file already exists
./tradepub-dl.ts --download My\ Account.html
# download concurrency can be controlled by `--limit` (default 5)
./tradepub-dl.ts --limit 1 --download My\ Account.html
```

# NOTE

- "Requested" titles with no "OPEN NOW" link will not be downloaded  
  using `.reqcard:not(.client)` as filter
- Find failed downloads
  `fd -i -t f -e pdf -S -200k | sort | xargs -d"\n" -n1  file | grep -v "PDF document"`
  There are caused by outdated link, delete and redownload for latest "My Account.html"

# TODO

- use Puppeteer to visit magic link and create `books.json`
- make title file-system safe  
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
# move files and update books.txt
# try again with colon
./findpub.ts --colon books.json books.txt | sort
```
