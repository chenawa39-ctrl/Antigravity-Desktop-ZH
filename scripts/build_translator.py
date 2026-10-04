"""Build the runtime translator from the template and dictionary (Python stdlib)."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
template = (root / "translator-template.js").read_text(encoding="utf-8")
dictionary = json.loads((root / "zh-CN.json").read_text(encoding="utf-8"))
marker = "/*__DICTIONARY__*/{}"
if template.count(marker) != 1:
    raise ValueError("Expected exactly one dictionary marker")
payload = json.dumps(dictionary, ensure_ascii=False, separators=(",", ":"))
(root / "translator.js").write_text(template.replace(marker, payload), encoding="utf-8", newline="\n")
print(f"Built translator.js with {len(dictionary)} entries")
