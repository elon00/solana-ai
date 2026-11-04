#!/usr/bin/env python3
"""Read-only GitHub portfolio inventory. Deployment is NEVER inferred from repository existence."""
import csv, json, os, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path
owner=os.getenv("PORTFOLIO_OWNER","elon00")
token=os.getenv("GH_TOKEN") or os.getenv("GITHUB_TOKEN","")
headers={"Accept":"application/vnd.github+json","User-Agent":"portfolio-reality-audit"}
if token: headers["Authorization"]="Bearer "+token
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=25) as r:
        return json.load(r)
repos=[]
for page in range(1,101):
    batch=get(f"https://api.github.com/users/{owner}/repos?per_page=100&page={page}&type=owner")
    if not batch: break
    repos.extend(batch)
    if len(batch)<100: break
else: raise RuntimeError("Pagination limit reached; audit incomplete")
out=Path("audit-output");out.mkdir(exist_ok=True)
fields=["repository","url","description","fork","archived","updated_at","default_branch","originality","deployment_status","deployment_evidence","verification_time_utc"]
stamp=datetime.now(timezone.utc).isoformat()
with (out/"portfolio.csv").open("w",newline="",encoding="utf-8") as f:
    w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
    for r in repos:
        w.writerow({"repository":r["name"],"url":r["html_url"],"description":r.get("description") or "","fork":r["fork"],"archived":r["archived"],"updated_at":r["updated_at"],"default_branch":r["default_branch"],"originality":"FORK" if r["fork"] else "REVIEW REQUIRED","deployment_status":"UNVERIFIED","deployment_evidence":"Not checked on-chain","verification_time_utc":stamp})
summary={"owner":owner,"repository_count":len(repos),"forks":sum(bool(r["fork"]) for r in repos),"verified_mainnet":0,"verified_testnet":0,"note":"Inventory only; no RPC/explorer validation performed.","generated_at":stamp}
(out/"summary.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
print(json.dumps(summary,indent=2))
