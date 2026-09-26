import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const skip = new Set(['.git','node_modules','dist','build','target','.next','coverage']);
const maxBytes = 1024 * 1024;

function walk(dir, out=[]) {
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    if (skip.has(ent.name)) continue;
    const p = path.join(dir,ent.name);
    if (ent.isDirectory()) walk(p,out);
    else if (ent.isFile()) out.push(p);
  }
  return out;
}

const files = walk(root);
const texts = [];
for (const f of files) {
  try {
    const st=fs.statSync(f);
    if (st.size>maxBytes) continue;
    const b=fs.readFileSync(f);
    if (b.includes(0)) continue;
    texts.push({file:path.relative(root,f).replaceAll('\\','/'),text:b.toString('utf8')});
  } catch {}
}

const tech = [
  ['solana-program',[/cargo build-sbf/i,/solana_program/i,/anchor_lang/i]],
  ['anchor',[/anchor_lang/i,/anchor build/i,/Anchor\.toml/i]],
  ['pda',[/findProgramAddress/i,/find_program_address/i,/\bPDA\b/i,/seeds\s*=\s*\[/i]],
  ['cpi',[/invoke_signed/i,/CpiContext/i,/cross.program invocation/i,/solana_cpi/i]],
  ['token-2022',[/Token-2022/i,/TOKEN_2022_PROGRAM_ID/i,/spl.token.*2022/i,/program-2022/i]],
  ['multi-wallet',[/Phantom/i,/Solflare/i,/Backpack/i,/wallet adapter/i,/multi.?wallet/i]],
  ['wallet-auth',[/signMessage/i,/wallet.*auth/i,/verify.*signature/i]],
  ['solana-actions',[/solana action/i,/actions\.json/i,/application\/vnd\.solana\.action/i]],
  ['blinks',[/\bBlinks?\b/i,/blockchain link/i]],
  ['qr-solana-pay',[/Solana Pay/i,/\bQR\b/i,/qrcode/i]],
  ['ai-agent',[/AI.?agent/i,/agentic/i,/registerAction/i,/orchestrat/i]],
  ['multi-model-ai',[/OpenAI/i,/Anthropic/i,/Gemini/i,/multi.?model/i,/provider routing/i]],
  ['mcp',[/Model Context Protocol/i,/\bMCP\b/i,/mcp server/i]],
  ['x402',[/\bx402\b/i,/PAYMENT-REQUIRED/i,/PAYMENT-SIGNATURE/i]],
  ['usdc-payments',[/\bUSDC\b/i,/usd coin/i]],
  ['pqc',[/ML-DSA/i,/ML-KEM/i,/post.quantum/i,/pqc/i]],
  ['conway',[/Conway/i,/Game of Life/i,/cellular autom/i]],
  ['realtime-events',[/WebSocket/i,/onLogs/i,/onAccountChange/i,/subscribe/i]]
];

const report={generated_at:new Date().toISOString(), technologies:{}};
for (const [name,patterns] of tech) {
  const evidence=[];
  for (const {file,text} of texts) {
    if (patterns.some(r=>r.test(file)||r.test(text))) evidence.push(file);
  }
  report.technologies[name]={
    status:evidence.length?'EVIDENCED_IN_REPOSITORY':'NOT_EVIDENCED',
    evidence:[...new Set(evidence)].slice(0,12)
  };
}
report.summary={
  evidenced:Object.values(report.technologies).filter(x=>x.status==='EVIDENCED_IN_REPOSITORY').length,
  total:tech.length
};
fs.writeFileSync('AUTONOMOUS_TECH_REPORT.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary));
for (const [k,v] of Object.entries(report.technologies)) console.log(`${v.status==='EVIDENCED_IN_REPOSITORY'?'[+]':'[-]'} ${k}`);
