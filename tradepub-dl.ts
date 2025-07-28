#!/usr/bin/env bun
import { eachOfLimit } from "async";
import { $ } from "bun";
import * as cheerio from "cheerio";
import { mkdir } from "node:fs/promises";
import { parseArgs } from "util";

const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    from: {
      type: "string",
    },
    download: {
      type: "boolean",
      default: false,
    },
    limit: {
      type: "string",
      default: "5",
    },
  },
  strict: true,
  allowPositionals: true,
});

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
// console.log(values);
// console.log(positionals);

if (positionals.length < 3) {
  console.error("Usage: tradepub-dl.ts <options> <html>");
  process.exit(1);
}

type Book = {
  title: string;
  url: string;
  publisher: string;
  date: string;
  ext: string; // file extension, e.g., "pdf"
};

async function parseHTML(values: any, positionals: string[]): Promise<Book[]> {
  let from: string | undefined;
  if (values.from) {
    from = new Date(values.from).toISOString();
  }

  const file = Bun.file(positionals[2]);
  const $ = cheerio.load(await file.text());

  const $cards = $(".reqcard:not(.client)");
  let books = $cards
    .map((i, card) => {
      const $card = $(card);
      let title = $card.find(".reqtitle").text();
      let url = $card.find("a").attr("href");
      let publisher = $card.find(".reqpub").text();
      let date = $card.find(".reqdate").text();
      let ext = "pdf"; // default extension

      // parse date
      try {
        date = new Date(date).toISOString();
      } catch (e) {
        console.error(e);
        date = "";
      }

      // trim title of "($" till the end
      title = title.replace(/\s*\(\$.+$/, "");
      // trim title of "(FREE*" at the end
      title = title.replace(/\s*\(free.+\)$/i, "");
      title = title.replace(/\//g, " - ");
      title = title.replace(/:/g, " -");
      title = title.replace(/[\x00-\x1F\xA5\\?*:\"";|\/<>\u200B!]/g, "");
      title = title.replace(/\s+/g, " ");

      // console.log(title, date);
      return { title, url, publisher, date, ext } as Book;
    })
    .toArray();

  if (from) {
    console.log(from);
    books = books.filter((book) => book.date >= from);
  }

  return books;
}

async function postProcess(books: Book[]) {
  const uniqueBooks = new Map<string, Book>();
  books.forEach((book) => {
    // handle non-PDF files
    if (book.title.includes("Cheat Sheet Bundle")) {
      book.ext = "zip";
    } else if (book.title == "To SIEM or not to SIEM") {
      book.ext = "mp4";
    }

    // publisher mapping
    if (book.publisher == "KDnuggets") {
      book.publisher = "KDNuggets";
    } else if (book.publisher == "Inc.") {
      book.publisher = "Inc";
    } else if (book.publisher == "Kevin Sheridan International") {
      book.publisher = "Kevin Sheridan";
    } else if (book.publisher == "Rogue Wave Software | Klocwork") {
      book.publisher = "Rogue Wave Software";
    }

    const key = `${book.publisher}/${book.title}`;
    if (!uniqueBooks.has(key)) {
      uniqueBooks.set(key, book);
    }
  });

  let _b: Book | undefined;
  _b = uniqueBooks.get(
    "Inc/101 Great Ideas That Work - Leadership & Managing (Valued at $6.95) FREE"
  );
  if (_b) {
    _b.title = "101 Great Ideas That Work - Leadership & Managing";
  }
  _b = uniqueBooks.get("Indegy/Critical Infrastructure Cyber Security -");
  if (_b) {
    _b.title =
      "Critical Infrastructure Cyber Security - How to Actively Secure Your Industrial Environment In the New Era of Distrust";
  }
  _b = uniqueBooks.get("KDNuggets/Ship Health AI Products Faster -");
  if (_b) {
    _b.title =
      "Ship Health AI Products Faster - Strategies to Deploy with Quality and Speed";
  }
  _b = uniqueBooks.get(
    "O'Reilly/Linux Cookbook 2nd edition ( $56.99 Value) FREE for a Limited Time"
  );
  if (_b) {
    _b.title = "Linux Cookbook 2nd edition";
  }
  _b = uniqueBooks.get(
    "TradePub.com/New Member Exclusive - Join TradePub.com Now and Receive a Free 'Professional Development Kit'"
  );
  if (_b) {
    _b.title = "Professional Development Kit";
  }
  _b = uniqueBooks.get(
    "Wiley/Excel Formulas & Functions For Dummies, 6th Edition (25.00 Value) FREE for a Limited Time"
  );
  if (_b) {
    _b.title = "Excel Formulas & Functions For Dummies, 6th Edition";
  }

  // have new edition
  uniqueBooks.delete(
    "CustomGuide/Microsoft Access 2013 Basic - Free Quick Reference Card"
  );
  uniqueBooks.delete(
    "Machine Learning Mastery/Ship Health AI Products Faster -"
  );
  uniqueBooks.delete(
    "The Genard Method/12 Easy Ways to Achieve Presence and Charisma"
  );
  uniqueBooks.delete("Wiley/Artificial Intelligence For Dummies, 2nd Edition");
  uniqueBooks.delete("Wiley/Ship Health AI Products Faster -");
  uniqueBooks.delete("Wiley/Teach Yourself VISUALLY Microsoft 365");

  return Array.from(uniqueBooks.values());
}

let books = await parseHTML(values, positionals);
books = await postProcess(books);

// console.log(books.length);
// console.log(JSON.stringify(books));
Bun.write("books.json", JSON.stringify(books, null, 2));

async function downloadBooks(values: any, books: Book[]) {
  const limit = parseInt(values.limit);
  return eachOfLimit(books, limit, async (book: Book, i: string | number) => {
    const path = `${book.publisher}/${book.title}.${book.ext}`;
    if (await Bun.file(path).exists()) {
      console.log(
        `[${(i as number) + 1}/${books.length}] Already downloaded: ${path}`
      );
      return;
    }
    console.log(`[${i}/${books.length}] Downloading: ${path}`);
    await mkdir(book.publisher, { recursive: true }).catch((e) => {
      console.error(`Error creating directory ${book.publisher}:`, e);
    });
    const { stdout, stderr, exitCode } =
      await $`wget --no-check-certificate -O ${path} ${book.url}`
        .nothrow()
        .quiet();

    if (exitCode === 0) {
      console.log(`[${i}/${books.length}] Downloaded: ${path}`);
    } else {
      console.error(`wget failed for ${book.title}: exit code ${exitCode}`);
    }
  });
}

if (values.download) await downloadBooks(values, books);
