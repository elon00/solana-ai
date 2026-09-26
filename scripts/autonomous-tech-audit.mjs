import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const skipDirs = new Set(['.git','node_modules','dist','build','target','.next','coverage']);
const allowedExt = new Set(['.ts','.tsx','.js','.mjs','.cjs','.rs','.toml','.yml','.yaml']);
const explicitFiles = new Set(['public/actions.json','Anchor.toml','Cargo.toml','package.json']);
const excludedFiles = new Set([
  'scripts/autonomous-tech-audit.mjs',
  'AUTONOMOUS_BLUEPRINT.md',
  'AUTONOMOUS_TECH_REPORT.json'
]);
const maxBytes = 1024 * 1024;

function walk(dir, out=[]) {
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    if (skipDirs.has(ent.name)) continue;
    const p = path.join(dir,ent.name);
    if (ent.isDirectory()) walk(p,out);
    else if (ent.isFile()) out.push(p);
  }
  return out;
}

const texts = [];
for (const abs of walk(root)) {
  const rel=path.relative(root,abs).replaceAll('\\','/');
  if (excludedFiles.has(rel)) continue;
  if (!allowedExt.has(path.extname(rel)) && !explicitFiles.has(rel)) continue;
  try {
    const st=fs.statSync(abs);
    if (st.size>maxBytes) continue;
    const b=fs.readFileSync(abs);
    if (b.includes(0)) continue;
    texts.push({file:rel,text:b.toString('utf8')});
  } catch {}
}

const tech = [
  ['solana-program',[/solana_program/i,/anchor_lang/i,/cargo build-sbf/i,/entrypoint!\s*\(/i]],
  ['anchor',[/anchor_lang/i,/anchor build/i,/\[programs\./i]],
  ['pda',[/findProgramAddress/i,/find_program_address/i,/seeds\s*=\s*\[/i,/ProgramDerivedAddress/i]],
  ['cpi',[/invoke_signed/i,/CpiContext/i,/cross.program invocation/i,/solana_cpi/i]],
  ['token-2022',[/Token-2022/i,/TOKEN_2022_PROGRAM_ID/i,/token_2022/i,/program-2022/i]],
  ['multi-wallet',[/Phantom/i,/Solflare/i,/Backpack/i,/multi.?wallet/i,/wallet adapter/i]],
  ['wallet-auth',[/signMessage/i,/wallet.*auth/i,/verify.*signature/i]],
  ['solana-actions',[/createSolanaActionMetadata/i,/application\/vnd\.solana\.action/i,/actions\.json/i]],
  ['blinks',[/createBlinkUrl/i,/solana-action:/i,/\bBlink\b/i]],
  ['qr-solana-pay',[/Solana Pay/i,/qrcode/i,/buildSolanaPayRequest/i,/parseSolanaPayRequest/i]],
  ['ai-agent',[/AI.?agent/i,/agentic/i,/registerAction/i,/orchestrat/i]],
  ['multi-model-ai',[/OpenAI/i,/Anthropic/i,/Gemini/i,/multi.?model/i,/provider routing/i]],
  ['mcp',[/createMcpRuntime/i,/Model Context Protocol/i,/tools\/call/i,/tools\/list/i]],
  ['x402',[/\bx402\b/i,/PAYMENT-REQUIRED/i,/PAYMENT-SIGNATURE/i]],
  ['usdc-payments',[/\bUSDC\b/i,/usd coin/i,/USDC_MINT/i]],
  ['pqc',[/ML-DSA/i,/ML-KEM/i,/post.quantum/i,/\bPQC\b/i]],
  ['conway',[/Conway/i,/Game of Life/i,/cellular autom/i]],
  ['realtime-events',[/new WebSocket/i,/WebSocketImpl/i,/onLogs/i,/onAccountChange/i,/accountSubscribe/i,/logsSubscribe/i]]
];

const report={generated_at:new Date().toISOString(), methodology:{
  scope:'executable source, build/config, and workflow files only',
  excluded:['documentation-only mentions','the audit script itself','generated reports','node_modules/lockfile transitive names']
}, technologies:{}};

for (const [name,patterns] of tech) {
  const evidence=[];
  for (const {file,text} of texts) {
    if (patterns.some(r=>r.test(file)||r.test(text))) evidence.push(file);
  }
  report.technologies[name]={
    status:evidence.length?'IMPLEMENTATION_EVIDENCE':'NOT_EVIDENCED',
    evidence:[...new Set(evidence)].slice(0,12)
  };
}
report.summary={
  evidenced:Object.values(report.technologies).filter(x=>x.status==='IMPLEMENTATION_EVIDENCE').length,
  total:tech.length
};
fs.writeFileSync('AUTONOMOUS_TECH_REPORT.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary));
for (const [k,v] of Object.entries(report.technologies)) console.log(`${v.status==='IMPLEMENTATION_EVIDENCE'?'[+]':'[-]'} ${k}${v.evidence.length?' :: '+v.evidence.slice(0,3).join(', '):''}`);
