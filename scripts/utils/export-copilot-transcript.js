const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Uso: node export-copilot-transcript.js <input.jsonl> <output.md>');
  process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  usage();
}

if (!fs.existsSync(inputPath)) {
  console.error('Arquivo de entrada nao encontrado:', inputPath);
  process.exit(2);
}

const raw = fs.readFileSync(inputPath, 'utf8');
const lines = raw.split(/\r?\n/).filter(Boolean);

const out = [];
out.push('# Exportacao de conversa do Copilot Chat');
out.push('');
out.push(`- Origem: ${inputPath}`);
out.push(`- Exportado em: ${new Date().toISOString()}`);
out.push('');

let count = 0;

for (const line of lines) {
  let entry;
  try {
    entry = JSON.parse(line);
  } catch {
    continue;
  }

  const type = entry?.type;
  const data = entry?.data || {};
  const ts = entry?.timestamp || '';

  if (type === 'user.message') {
    const content = (data.content || '').trim();
    if (!content) continue;
    out.push(`## Usuario (${ts})`);
    out.push('');
    out.push(content);
    out.push('');
    count += 1;
    continue;
  }

  if (type === 'assistant.message') {
    const content = (data.content || '').trim();
    const reasoning = (data.reasoningText || '').trim();
    if (!content && !reasoning) continue;

    out.push(`## Assistente (${ts})`);
    out.push('');
    if (content) {
      out.push(content);
      out.push('');
    }

    if (reasoning) {
      out.push('### Raciocinio interno registrado');
      out.push('');
      out.push(reasoning);
      out.push('');
    }

    count += 1;
  }
}

out.push('---');
out.push(`Entradas exportadas: ${count}`);
out.push('');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, out.join('\n'), 'utf8');

console.log('OK:', outputPath);
console.log('Entradas exportadas:', count);
