import re, sys

# Redirect output to file to avoid encoding issues
out = open("test_enc_out.txt", "w", encoding="utf-8")

raw_iso = b"UNI\xc3O"
decoded = raw_iso.decode("utf-8", errors="replace")
out.write(f"ISO decoded as UTF-8: {repr(decoded)}\n")

s = decoded.upper()
out.write(f"After upper: {repr(s)}\n")

s_clean = re.sub(r"[^\x00-\x7F]", "", s)
out.write(f"After non-ASCII strip: {repr(s_clean)}\n")

repl_char = "�"
out.write(f"UFFFD in s: {repl_char in s}\n")
out.write(f"Char at pos 3: {hex(ord(s[3]))}\n")

s3 = s.replace(repl_char, "")
out.write(f"After explicit UFFFD replace: {repr(s3)}\n")

out.close()
print("Done")
