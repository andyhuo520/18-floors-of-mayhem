import subprocess,json,concurrent.futures
from pathlib import Path
keys=['wukong-views','bajie-views','landscapes','props','effects']
def get(key):
 task=json.loads(Path('art-jobs/v2/'+key+'.json').read_text())['data']['tasks'][0]['task_id']
 r=subprocess.run(['combos','asset','get','--task',task,'--wait','--wait-timeout','20m','--output','art-jobs/v2/downloads/'+key,'--json','--quiet'],capture_output=True,text=True)
 Path('art-jobs/v2/'+key+'.result.json').write_text(r.stdout);print(key,r.returncode,r.stdout[-200:],r.stderr[-150:],flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(get,keys))
