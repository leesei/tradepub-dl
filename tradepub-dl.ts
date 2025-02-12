#!/usr/bin/env bun
import { eachOfLimit } from "async";
import * as cheerio from "cheerio";
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
};

async function parseHTML(values: any, positionals: string[]): Book[] {
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
      title = title.replace(/\//i, " - ");

      // console.log(title, date);
      return { title, url, publisher, date } as Book;
    })
    .toArray();

  if (from) {
    console.log(from);
    books = books.filter((book) => book.date >= from);
  }

  return books;
}

const books = await parseHTML(values, positionals);

// console.log(books.length);
// console.log(JSON.stringify(books));
Bun.write("books.json", JSON.stringify(books, null, 2));

async function downloadBooks(values: any, books: Book[]) {
  const limit = parseInt(values.limit);
  return eachOfLimit(books, limit, async (book: Book, i: int) => {
    const path = `${book.publisher}/${book.title}.pdf`;
    if (await Bun.file(path).exists()) {
      // console.log(`[${i + 1}/${books.length}] Already downloaded: ${path}`);
      return;
    }
    console.log(`[${i}/${books.length}] Downloading: ${path}`);
    await Bun.write(
      `${book.publisher}/${book.title}.pdf`,
      await fetch(book.url, {})
    );
  });
}
if (values.download) await downloadBooks(values, books);
