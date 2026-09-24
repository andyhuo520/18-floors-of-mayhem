from pathlib import Path
import subprocess,json
root=Path(__file__).parent
jobs={
'heroes-a':['golden pineapple grenade with a green leafy crown, spinning and bursting into chunky pineapple slices','furious cream rooster with huge red comb and golden claws, flapping then lunging forward','sleek white rocket with red fins and orange exhaust, ignition then full rocket flight'],
'heroes-b':['emerald kiwi-fruit ram with curled golden horns, charging with physical gold coins scattering around its hooves','friendly WHITE whale carrying a little green apple crest, rising and releasing a curved clear turquoise water fountain','enormous deep BLUE armored cosmic whale with blueberry clusters on its back, mechanical gold fins and bright cyan mouth, opening jaws and launching a dense blueberry asteroid torpedo; MUST look distinct from a white fountain whale'],
'boss-a':['ornate red and gold monkey king staff sweeping through a miniature golden monkey warrior cloud clone','ancient bronze NINE-TOOTH RAKE smashing a jagged chunk of stone earth','sandstorm shaped like a skeletal desert dragon curling around a crescent monk shovel'],
'boss-b':['heavy obsidian bull head with gold horns charging in molten lava and broken volcanic rock','ivory skeletal ghost lantern surrounded by a handful of sharp bone spears','three interlocked blazing iron fire wheels with visible spokes and red tassels'],
'boss-c':['giant ivory silk spiderweb fired from a jade spider-shaped spindle','a golden eagle claw descending with a branching blue-white thunderbolt','dark purple lotus made of meteorite petals opening to release a polished black star stone'],
'impacts':['small compact golden orange arcade hit burst with sharp pixel sparks','small icy cyan shield shattering into large crystal shards','small curling pale gray smoke puff that expands then dissipates']}
base='Original premium 16-bit pixel arcade game EFFECT SPRITE SHEET. Exactly FOUR equal columns and THREE equal rows, TWELVE isolated cells. Pure solid neutral gray #dedede backdrop, no floor shadows no text no labels no borders. Each row depicts FOUR consecutive action frames of the SAME effect with coherent form, scale and palette: anticipation, launch, full attack, trailing release. All projectiles point RIGHT. Clean crisp pixel clusters, tangible detailed objects, readable silhouettes, dark outlines. Never generic circles, light rings, abstract beams or geometric blocks. Leave generous margins, each effect fully contained within its cell. '
for key,rows in jobs.items():
 prompt=base+' '.join('Row '+str(i+1)+': '+r+'.' for i,r in enumerate(rows))
 (root/(key+'.prompt.txt')).write_text(prompt)
 r=subprocess.run(['combos','asset','generate','--type','static_image','--prompt',prompt,'--async','--idempotency-key','man18-skills-v4-'+key,'--json','--quiet'],capture_output=True,text=True)
 (root/(key+'.json')).write_text(r.stdout);print(key,r.returncode,r.stdout,flush=True)
