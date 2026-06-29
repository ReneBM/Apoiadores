const fs = require('fs');
const lines = fs.readFileSync('C:/Users/User/.gemini/antigravity/brain/3dd9021a-2d85-44bf-9de5-94698b481600/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
  if (!lines[i]) continue;
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.tool_calls) {
      for (let call of obj.tool_calls) {
        if (call.tool_name === 'replace_file_content' &&
            call.arguments.TargetFile &&
            call.arguments.TargetFile.endsWith('Feed.jsx') &&
            call.arguments.TargetContent.includes('Header do Perfil')) {
          
          console.log('Found old Feed.jsx content!');
          const target = call.arguments.TargetContent;
          let file = fs.readFileSync('frontend/src/pages/painel/PerfilAdmin.jsx', 'utf8');
          file = file.replace(/export default function Feed\(\) \{/, 'export default function PerfilAdmin() {');
          const startIdx = file.indexOf('<div style={{ maxWidth: "600px"');
          const endIdx = file.indexOf('{/* Modal de Criação de Postagem (Instagram Style) */}');
          
          if (startIdx > -1 && endIdx > -1) {
            file = file.substring(0, startIdx) + target + file.substring(endIdx);
            fs.writeFileSync('frontend/src/pages/painel/PerfilAdmin.jsx', file);
            console.log('Fixed PerfilAdmin.jsx successfully!');
          } else {
            console.log('Could not find start/end indices to replace', startIdx, endIdx);
            // Let's print out what startIdx would be with single quotes
            const startIdx2 = file.indexOf("<div style={{ maxWidth: '600px'");
            if (startIdx2 > -1 && endIdx > -1) {
              file = file.substring(0, startIdx2) + target + file.substring(endIdx);
              fs.writeFileSync('frontend/src/pages/painel/PerfilAdmin.jsx', file);
              console.log('Fixed PerfilAdmin.jsx successfully! (with single quotes)');
            }
          }
          process.exit(0);
        }
      }
    }
  } catch (e) {
    // ignore parse errors
  }
}
console.log('Could not find the target content in transcript.');
