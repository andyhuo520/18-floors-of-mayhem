from pathlib import Path
import subprocess,json,concurrent.futures
root=Path(__file__).parent
def collect(p):
 key=p.stem
 if not p.read_text().strip():
  r=subprocess.run(['combos','asset','generate','--type','static_image','--prompt',(root/(key+'.prompt.txt')).read_text(),'--async','--idempotency-key','man18-world-v5-'+key,'--json','--quiet'],capture_output=True,text=True)
  p.write_text(r.stdout);(root/(key+'.err')).write_text(r.stderr)
  if not r.stdout.strip():print(key,r.stderr,flush=True);return
 try:task=json.loads(p.read_text())['data']['tasks'][0]['task_id']
 except Exception as e:print(key,str(e),flush=True);return
 r=subprocess.run(['combos','asset','get','--task',task,'--wait','--wait-timeout','45s','--output',str(root/'downloads'/key),'--json','--quiet'],capture_output=True,text=True)
 (root/(key+'.result.json')).write_text(r.stdout);(root/(key+'.err')).write_text(r.stderr);print(key,r.returncode,r.stdout[:120],r.stderr[:200],flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(collect,[root/(key+'.json') for key in ['giants-a','giants-b','giants-c','relics']]))
