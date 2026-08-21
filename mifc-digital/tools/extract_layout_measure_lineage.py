#!/usr/bin/env python3
"""Extract the MIFC Layout card-to-measure lineage without changing the PBIP."""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
from pathlib import Path
from typing import Any, Iterable


MEASURE_START = re.compile(r"^\tmeasure\s+(.+?)\s*=\s*(.*)$")
PROPERTY_START = re.compile(
    r"^\t\t(?:formatString|displayFolder|lineageTag|annotation|changedProperty|formatStringDefinition)\b"
)
BRACKET_REF = re.compile(r"\[([^\]]+)\]")
NUMBER_LITERAL = re.compile(r"(?<![A-Za-z_])(?:\d+(?:[.,]\d+)?)(?![A-Za-z_])")


def walk(node: Any) -> Iterable[Any]:
    yield node
    if isinstance(node, dict):
        for value in node.values():
            yield from walk(value)
    elif isinstance(node, list):
        for value in node:
            yield from walk(value)


def field_ref(field: dict[str, Any]) -> tuple[str, str, str] | None:
    for kind in ("Measure", "Column"):
        item = field.get(kind)
        if not isinstance(item, dict):
            continue
        entity = (
            item.get("Expression", {})
            .get("SourceRef", {})
            .get("Entity", "")
        )
        prop = item.get("Property", "")
        if entity and prop:
            return kind, str(entity), str(prop)
    return None


def collect_field_refs(node: Any) -> list[tuple[str, str, str]]:
    found: list[tuple[str, str, str]] = []
    seen: set[tuple[str, str, str]] = set()
    for item in walk(node):
        if not isinstance(item, dict):
            continue
        ref = field_ref(item)
        if ref and ref not in seen:
            seen.add(ref)
            found.append(ref)
    return found


def unquote_literal(value: Any) -> str:
    text = str(value)
    if text.startswith("'") and text.endswith("'"):
        text = text[1:-1].replace("''", "'")
    return text


def collect_filter_context(config: dict[str, Any]) -> list[str]:
    contexts: list[str] = []
    for filter_item in config.get("filters", []):
        if not isinstance(filter_item, dict):
            continue
        ref = field_ref(filter_item.get("field", {}))
        label = f"{ref[1]}[{ref[2]}]" if ref else "filtro"
        values: list[str] = []
        for node in walk(filter_item.get("filter", {})):
            if isinstance(node, dict) and set(node) == {"Literal"}:
                literal = node.get("Literal")
                if isinstance(literal, dict) and "Value" in literal:
                    val = unquote_literal(literal["Value"])
                    if val not in values:
                        values.append(val)
        contexts.append(f"{label}={','.join(values)}" if values else label)
    return contexts


def parse_measure_blocks(path: Path) -> dict[str, dict[str, str]]:
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    starts: list[tuple[int, str, str]] = []
    for index, line in enumerate(lines):
        match = MEASURE_START.match(line)
        if match:
            name = match.group(1).strip().strip("'")
            starts.append((index, name, match.group(2)))

    measures: dict[str, dict[str, str]] = {}
    for pos, (start, name, first_formula) in enumerate(starts):
        end = starts[pos + 1][0] if pos + 1 < len(starts) else len(lines)
        block = lines[start + 1 : end]
        formula_lines = [first_formula] if first_formula else []
        display_folder = ""
        format_string = ""
        for line in block:
            if line.startswith("\t\tdisplayFolder:"):
                display_folder = line.split(":", 1)[1].strip()
            elif line.startswith("\t\tformatString:"):
                format_string = line.split(":", 1)[1].strip()
            if PROPERTY_START.match(line):
                continue
            if line.startswith("\t\tannotation ") or line.startswith("\t\t\t"):
                if not line.startswith("\t\tannotation "):
                    formula_lines.append(line.lstrip("\t"))
        formula = "\n".join(formula_lines).strip()
        if formula.startswith("```"):
            formula = formula[3:]
        if formula.endswith("```"):
            formula = formula[:-3]
        comment = ""
        for line in formula.splitlines():
            stripped = line.strip()
            if stripped.startswith("--"):
                comment = stripped[2:].strip()
                break
        measures[name] = {
            "formula": formula.strip(),
            "comment": comment,
            "display_folder": display_folder,
            "format_string": format_string,
        }
    return measures


def table_names(tables_dir: Path) -> list[str]:
    return sorted(p.stem for p in tables_dir.glob("*.tmdl"))


def direct_tables(formula: str, names: list[str]) -> list[str]:
    refs: list[str] = []
    for name in names:
        quoted = re.escape(name)
        if re.search(rf"(?:'{quoted}'|(?<![\w']){quoted})\s*\[", formula, re.I):
            refs.append(name)
    return refs


def enrich_measures(measures: dict[str, dict[str, str]], tables: list[str]) -> None:
    names = set(measures)
    for name, item in measures.items():
        refs = []
        for candidate in BRACKET_REF.findall(item["formula"]):
            if candidate in names and candidate != name and candidate not in refs:
                refs.append(candidate)
        item["measure_dependencies"] = "; ".join(refs)
        item["direct_tables"] = "; ".join(direct_tables(item["formula"], tables))

    def upstream(name: str, stack: set[str] | None = None) -> set[str]:
        stack = set() if stack is None else stack
        if name in stack or name not in measures:
            return set()
        stack.add(name)
        item = measures[name]
        result = set(filter(None, item["direct_tables"].split("; ")))
        for dep in filter(None, item["measure_dependencies"].split("; ")):
            result |= upstream(dep, set(stack))
        return result

    for name, item in measures.items():
        item["upstream_tables"] = "; ".join(sorted(upstream(name)))
        literals = []
        formula_without_comments = re.sub(r"--.*", "", item["formula"])
        for literal in NUMBER_LITERAL.findall(formula_without_comments):
            if literal not in literals:
                literals.append(literal)
        item["numeric_literals"] = "; ".join(literals)


def source_class(upstream: str) -> str:
    tables = set(filter(None, upstream.split("; ")))
    oracle = {
        "SCANIA", "FH", "VM", "DAF", "DAF SLITTERS", "Produção", "Paradas",
        "Lotes", "BI_MIFC_LCT_POS_STOCK", "BI_OEE_SCRAP", "Relatorio_bases",
        "Relatorio_Item RF2", "Segregacao", "SHIPDATE", "BI_PUNCH_SCA", "BI_PUNCH_VDB",
    }
    sql_server = {"Produção LCT", "Produção RF2"}
    parameters = {"Máquinas", "Dados de embarque", "Emb Offset", "Emb Reta", "dOperacao", "Operações", "MP"}
    has_live = bool(tables & (oracle | sql_server))
    has_parameters = bool(tables & parameters)
    if has_live and has_parameters:
        return "MISTO: banco + parâmetro"
    if has_live:
        return "BANCO/CÁLCULO"
    if has_parameters:
        return "PARÂMETRO/CÁLCULO"
    if tables:
        return "MODELO/CÁLCULO"
    return "CONSTANTE ou medida derivada"


def detect_client(text: str, filters: str) -> str:
    haystack = f"{text} {filters}".upper()
    if "SCANIA" in haystack or re.search(r"(?:^|[-_/\\ ])SCA(?:$|[-_/\\ ])", haystack):
        return "Scania"
    if re.search(r"(?:^|[-_/\\ ])FH(?:$|[-_/\\ ])", haystack):
        return "Volvo FH"
    if re.search(r"(?:^|[-_/\\ ])VM(?:$|[-_/\\ ])", haystack):
        return "Volvo VM"
    if re.search(r"(?:^|[-_/\\ ])DAF(?:$|[-_/\\ ])", haystack):
        return "DAF"
    return "Compartilhado/por contexto"


def layout_lane(y: float, measure_name: str) -> tuple[str, str]:
    if measure_name.startswith("Q-D-S-"):
        return "Segregação", ""
    if y >= 2100:
        return "Rodapé sobreposto", "duplicação de cartões DAF; validar se deve permanecer"
    if y < 1635:
        return "Volvo FH — tempo de processo", ""
    if y < 1700:
        return "Volvo FH — estoque/logística", ""
    if y < 1750:
        return "Volvo VM — tempo de processo", ""
    if y < 1810:
        return "Volvo VM — estoque/logística", ""
    if y < 1870:
        return "Scania — tempo de processo", ""
    if y < 1940:
        return "Scania — estoque/logística", ""
    if y < 2000:
        return "DAF — tempo de processo", ""
    return "DAF — estoque/logística", ""


def extract_cards(layout_page: Path, measures: dict[str, dict[str, str]]) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for path in layout_page.glob("visuals/*/visual.json"):
        doc = json.loads(path.read_text(encoding="utf-8-sig"))
        visual = doc.get("visual", {})
        if visual.get("visualType") != "card":
            continue
        pos = doc.get("position", {})
        refs = collect_field_refs(visual.get("query", {}))
        measure_refs = [prop for kind, _entity, prop in refs if kind == "Measure"]
        contexts = collect_filter_context(doc.get("filterConfig", {}))
        filters = "; ".join(contexts)
        for sequence, measure_name in enumerate(measure_refs or [""], start=1):
            detail = measures.get(measure_name, {})
            identity = " ".join(
                [measure_name, detail.get("display_folder", ""), detail.get("comment", "")]
            )
            y = round(float(pos.get("y", 0)), 3)
            lane, issue = layout_lane(y, measure_name)
            inferred_client = detect_client(identity, filters)
            if inferred_client == "Compartilhado/por contexto":
                if lane.startswith("Volvo FH"):
                    inferred_client = "Volvo FH"
                elif lane.startswith("Volvo VM"):
                    inferred_client = "Volvo VM"
                elif lane.startswith("Scania"):
                    inferred_client = "Scania"
                elif lane.startswith("DAF") or lane == "Rodapé sobreposto":
                    inferred_client = "DAF"
            cards.append({
                "visual_id": doc.get("name", path.parent.name),
                "projection": sequence,
                "x": round(float(pos.get("x", 0)), 3),
                "y": y,
                "width": round(float(pos.get("width", 0)), 3),
                "height": round(float(pos.get("height", 0)), 3),
                "measure": measure_name,
                "client": inferred_client,
                "layout_lane": lane,
                "audit_note": issue,
                "filter_context": filters,
                "description": detail.get("comment", ""),
                "display_folder": detail.get("display_folder", ""),
                "format_string": detail.get("format_string", ""),
                "measure_dependencies": detail.get("measure_dependencies", ""),
                "direct_tables": detail.get("direct_tables", ""),
                "upstream_tables": detail.get("upstream_tables", ""),
                "source_class": source_class(detail.get("upstream_tables", "")),
                "numeric_literals": detail.get("numeric_literals", ""),
                "formula": " ".join(detail.get("formula", "").split()),
            })
    return sorted(cards, key=lambda row: (row["y"], row["x"], row["visual_id"]))


def extract_text_labels(layout_page: Path) -> list[dict[str, Any]]:
    labels: list[dict[str, Any]] = []
    for path in layout_page.glob("visuals/*/visual.json"):
        doc = json.loads(path.read_text(encoding="utf-8-sig"))
        visual = doc.get("visual", {})
        if visual.get("visualType") != "textbox":
            continue
        values: list[str] = []
        for node in walk(visual.get("objects", {})):
            if isinstance(node, dict) and isinstance(node.get("value"), str):
                value = node["value"].strip()
                if value and value not in values:
                    values.append(value)
        pos = doc.get("position", {})
        labels.append({
            "visual_id": doc.get("name", path.parent.name),
            "x": round(float(pos.get("x", 0)), 3),
            "y": round(float(pos.get("y", 0)), 3),
            "width": round(float(pos.get("width", 0)), 3),
            "height": round(float(pos.get("height", 0)), 3),
            "text": " | ".join(values),
        })
    return sorted(labels, key=lambda row: (row["y"], row["x"]))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pbip_root", type=Path)
    parser.add_argument(
        "--format",
        choices=("json", "csv", "cards-compact", "measures-csv", "summary", "labels"),
        default="summary",
    )
    args = parser.parse_args()

    measure_candidates = list(args.pbip_root.rglob("1-Measure.tmdl"))
    page_candidates = [p for p in args.pbip_root.rglob("ReportSection") if (p / "visuals").is_dir()]
    if not measure_candidates or not page_candidates:
        raise SystemExit("PBIP measure table or Layout page was not found.")

    measure_path = measure_candidates[0]
    measures = parse_measure_blocks(measure_path)
    enrich_measures(measures, table_names(measure_path.parent))
    cards = extract_cards(page_candidates[0], measures)

    if args.format == "labels":
        print(json.dumps(extract_text_labels(page_candidates[0]), ensure_ascii=False, indent=2))
    elif args.format == "cards-compact":
        fields = [
            "visual_id", "x", "y", "width", "height", "measure", "client", "layout_lane",
            "filter_context", "description", "source_class", "upstream_tables", "audit_note",
        ]
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(cards)
        print(output.getvalue(), end="")
    elif args.format == "measures-csv":
        fields = [
            "measure", "card_count", "clients", "layout_lanes", "description", "display_folder",
            "format_string", "measure_dependencies", "direct_tables", "upstream_tables", "source_class",
            "numeric_literals", "formula",
        ]
        rows = []
        for name in sorted({row["measure"] for row in cards}):
            uses = [row for row in cards if row["measure"] == name]
            detail = measures.get(name, {})
            rows.append({
                "measure": name,
                "card_count": len(uses),
                "clients": "; ".join(sorted({row["client"] for row in uses})),
                "layout_lanes": "; ".join(sorted({row["layout_lane"] for row in uses})),
                "description": detail.get("comment", ""),
                "display_folder": detail.get("display_folder", ""),
                "format_string": detail.get("format_string", ""),
                "measure_dependencies": detail.get("measure_dependencies", ""),
                "direct_tables": detail.get("direct_tables", ""),
                "upstream_tables": detail.get("upstream_tables", ""),
                "source_class": source_class(detail.get("upstream_tables", "")),
                "numeric_literals": detail.get("numeric_literals", ""),
                "formula": " ".join(detail.get("formula", "").split()),
            })
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
        print(output.getvalue(), end="")
    elif args.format == "json":
        print(json.dumps(cards, ensure_ascii=False, indent=2))
    elif args.format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=list(cards[0]))
        writer.writeheader()
        writer.writerows(cards)
        print(output.getvalue(), end="")
    else:
        print(f"Measures parsed: {len(measures)}")
        print(f"Layout card projections: {len(cards)}")
        print(f"Cards with unresolved measure: {sum(not row['formula'] for row in cards)}")
        print(f"Unique measures on cards: {len(set(row['measure'] for row in cards))}")
        print("Source classes:")
        for label in sorted(set(row["source_class"] for row in cards)):
            print(f"  {label}: {sum(row['source_class'] == label for row in cards)}")


if __name__ == "__main__":
    main()
