import re

# Test what happens when "UNIAO" in ISO-8859-1 is decoded as UTF-8
raw_iso = b"UNI\xc3O"  # "UNIÃO" in ISO-8859-1 (Ã = 0xC3)
decoded = raw_iso.decode("utf-8", errors="replace")
print(f"ISO decoded as UTF-8: {repr(decoded)}")

# Check what replace gets us
s = decoded.upper()
print(f"After upper: {repr(s)}")

# Try removing non-ASCII
s_clean = re.sub(r"[^\x00-\x7F]", "", s)
print(f"After non-ASCII strip: {repr(s_clean)}")

# Try UFFFD replace
s2 = s.replace("�", "")
print(f"After UFFFD replace: {repr(s2)}")
print(f"Is UFFFD in string? {chr(0xFFFD) in s}")
print(f"ord of char at pos 3: {hex(ord(s[3]))}")
