import json, re
from collections import defaultdict

ALIASES = {
    "UNIAO": "UNIAO",
    "UNIO": "UNIAO",
    "PCDOB": "PC DO B",
}

def normalize(sigla):
    s = sigla.strip().upper()
    s_clean = re.sub(r"[^\x00-\x7F]", "", s)
    result = ALIASES.get(s, ALIASES.get(s_clean, s_clean if s_clean != s else s))
    return result

# Test
test_cases = ["UNIAO", "UNIO", "UNI�O"]
out = open("debug2_out.txt", "w", encoding="utf-8")
for t in test_cases:
    out.write(f"Input: {repr(t)}\n")
    s = t.strip().upper()
    s_clean = re.sub(r"[^\x00-\x7F]", "", s)
    out.write(f"  s={repr(s)}\n")
    out.write(f"  s_clean={repr(s_clean)}\n")
    out.write(f"  normalized={repr(normalize(t))}\n")
out.close()
print("Done")
