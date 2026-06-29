#!/usr/bin/env python3
"""Export the ETCBC/BHSA database into the JSON shape the Vocab web app consumes.

This is the one piece that still needs Python + text-fabric: it reads the full
morphologically-annotated Hebrew Bible and writes a flat list of word records
(public/data/bhsa-sample.json's big sibling). The web app never touches
text-fabric — it just fetches this JSON.

Prerequisites (one-time):
    pip install text-fabric
    text-fabric etcbc/bhsa        # downloads the dataset (~once, cached in ~/text-fabric-data)

Usage:
    # Single file (drop-in replacement for the sample):
    python export_bhsa.py --out ../web/public/data/bhsa-sample.json
    python export_bhsa.py --out bhsa-freq.json --max-rank 1000   # only the 1000 most frequent lexemes
    python export_bhsa.py --out bhsa.json --gzip                  # also write bhsa.json.gz

    # Rank-banded shards + manifest.json for on-demand loading of the full Bible
    # (--out is a directory here):
    python export_bhsa.py --out ../web/public/data --split-by-rank 100,500,1000,2000

Each record matches the WordEntry interface in web/src/types.ts:
    node, lex, lexUtf8, language, pos, stem, tense, rank, sfx, gloss,
    ref, clauseWords, targetIndex

Notes
-----
* The full export is large (~426k words, each carrying its clause). For a
  production build, consider --max-rank to trim to the frequency band you train,
  or normalise clauses into a separate map (see --dedupe-clauses). Gzip ~6-8x.
* Glosses here are BHSA's English `gloss` feature. Other languages come from the
  <Language>_glosses.csv files (same format as Danish_glosses.csv); the web app
  layers those on top — they are not part of this export.
"""

import argparse
import gzip
import json
import os
import sys


def build_records(max_rank, languages):
    # Imported lazily so --help works without text-fabric installed.
    from tf.app import use

    A = use("etcbc/bhsa", silent="deep")
    F, T, L = A.api.F, A.api.T, A.api.L

    records = []
    skipped = 0
    for w in F.otype.s("word"):
        lang = F.language.v(w)
        if languages and lang not in languages:
            continue

        rank = F.rank_lex.v(w)
        if max_rank is not None and (rank is None or rank > max_rank):
            skipped += 1
            continue

        clause = L.u(w, "clause")
        if not clause:
            continue
        clause_words = L.d(clause[0], "word")

        section = T.sectionFromNode(w)  # (book, chapter, verse)
        ref = "{} {}:{}".format(*section) if section else ""

        records.append(
            {
                "node": w,
                "lex": F.lex.v(w),
                "lexUtf8": F.lex_utf8.v(w),
                "language": lang,
                "pos": F.sp.v(w),
                "stem": F.vs.v(w) or "NA",
                "tense": F.vt.v(w) or "NA",
                "rank": rank,
                "sfx": F.prs_ps.v(w) == "p1",
                "gloss": F.gloss.v(w) or "",
                "ref": ref,
                "clauseWords": [T.text(cw) for cw in clause_words],
                "targetIndex": clause_words.index(w),
            }
        )

    print(f"Exported {len(records)} words ({skipped} skipped by --max-rank).", file=sys.stderr)
    return records


def write_json(path, data, do_gzip):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False)
    print(f"Wrote {path} ({len(data)} records)", file=sys.stderr)
    if do_gzip:
        with gzip.open(path + ".gz", "wt", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False)
        print(f"Wrote {path}.gz", file=sys.stderr)


def write_shards(out_dir, records, boundaries, do_gzip):
    """Split records into rank bands and emit shard files + manifest.json.

    `boundaries` like [100, 500, 1000] yields bands 0-99, 100-499, 500-999,
    1000+. The manifest matches what web/src/lib/data.ts expects.
    """
    os.makedirs(out_dir, exist_ok=True)
    edges = [0] + sorted(boundaries) + [10**9]
    shards = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        band = [r for r in records if lo <= (r["rank"] or 0) < hi]
        max_rank = hi - 1 if hi < 10**9 else 999999
        file = f"bhsa-{lo}-{max_rank}.json"
        write_json(os.path.join(out_dir, file), band, do_gzip)
        shards.append({"file": file, "minRank": lo, "maxRank": max_rank})

    manifest_path = os.path.join(out_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump({"shards": shards}, fh, ensure_ascii=False, indent=2)
    print(f"Wrote {manifest_path} ({len(shards)} shards)", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True, help="output JSON file, or directory when --split-by-rank is used")
    ap.add_argument("--max-rank", type=int, default=None, help="keep only lexemes with rank_lex <= this")
    ap.add_argument(
        "--languages",
        nargs="*",
        default=["Hebrew", "Aramaic"],
        help="languages to include (default: Hebrew Aramaic)",
    )
    ap.add_argument(
        "--split-by-rank",
        default=None,
        help="comma-separated rank boundaries; emit shards + manifest.json into --out (a directory)",
    )
    ap.add_argument("--gzip", action="store_true", help="also write .gz files alongside the JSON")
    args = ap.parse_args()

    records = build_records(args.max_rank, set(args.languages))

    if args.split_by_rank:
        boundaries = [int(x) for x in args.split_by_rank.split(",") if x.strip()]
        write_shards(args.out, records, boundaries, args.gzip)
    else:
        write_json(args.out, records, args.gzip)


if __name__ == "__main__":
    main()
