from pathlib import Path
root=Path(__file__).parent
web=root/'web'
(web/'card-only.css').write_text('''body { user-select:none; -webkit-user-select:none; }
input, textarea, [contenteditable="true"] { user-select:text; -webkit-user-select:text; }
''',encoding='utf8')
(web/'copy-guard.js').write_text('''const editable = node => node?.closest?.('input,textarea,[contenteditable="true"]');
document.addEventListener('copy', event => {
  if (!editable(event.target) && !editable(document.activeElement)) event.preventDefault();
});
''',encoding='utf8')
page=web/'index.html'
s=page.read_text(encoding='utf8')
if 'card-only.css' not in s:
    s=s.replace('</head>','<link rel="stylesheet" href="./card-only.css">\n<script src="./copy-guard.js" defer></script>\n</head>')
    page.write_text(s,encoding='utf8')
print('Card-specific copy guard applied')
