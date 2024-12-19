#!/usr/bin/env bun
import path from "path";
import { parseArgs } from "util";

const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    colon: {
      type: "boolean",
      default: false,
    },
  },
  strict: true,
  allowPositionals: true,
});

// console.log(values);
// console.log(positionals);

if (positionals.length < 3) {
  console.error("Usage: printpub.ts <books.json> <books.txt>");
  process.exit(1);
}

const books = await Bun.file(positionals[2]).json();
const list = await Bun.file(positionals[3]).text();

for (let filename of list.split("\n")) {
  const parsed = path.parse(filename);
  const title = parsed.name;
  if (!values.colon) {
    const book = books.find((book: any) => book.title.indexOf(title) != -1);
    if (book) {
      console.log(
        `mkdir "${book.publisher}"; mv "${title}${parsed.ext}" "${book.publisher}/${title}${parsed.ext}"`
      );
    } else {
      console.error(`!!! Not found: ${title}`);
    }
  } else {
    const title1 = title.replace(" - ", ": ");
    const book = books.find((book: any) => book.title.indexOf(title1) != -1);
    if (book) {
      console.log(
        `mkdir "${book.publisher}"; mv "${title}${parsed.ext}" "${book.publisher}/${title}${parsed.ext}"`
      );
    } else {
      console.error(`!!! Not found: ${title}`);
    }
  }
}
