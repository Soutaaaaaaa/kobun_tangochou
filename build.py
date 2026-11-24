"""Build index.html (standalone) and dist/artifact.html (fragment) from src/."""
import pathlib, sys
root = pathlib.Path(__file__).parent
app = (root / "src/app.html").read_text()
data = (root / "src/words.txt").read_text().strip()
assert "`" not in data and "${" not in data
frag = app.replace("/*__DATA__*/", data)
(root / "dist").mkdir(exist_ok=True)
(root / "dist/artifact.html").write_text(frag)
full = ('<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>\n'
        + frag.replace("<header", "</head>\n<body>\n<header", 1) + "\n</body>\n</html>\n")
(root / "index.html").write_text(full)
print("ok", len(full))
