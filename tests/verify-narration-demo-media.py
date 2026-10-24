from pathlib import Path
import json, subprocess, numpy as np
R=Path(__file__).resolve().parents[1];O=R/'assets/audio/narration-demo-v140';B=json.loads((O/'baseline.json').read_text());T=json.loads((O/'timing.json').read_text());RATE=48000
def read(p):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar',str(RATE),'-ac','1','-f','f32le','-']),dtype='<f4').copy()
def corr(a,b):
 n=min(len(a),len(b));return float(np.corrcoef(a[:n],b[:n])[0,1])
report={}
for lang in ['ko','en']:
 old=read(R/B[lang]['tv']['src']);new=read(R/T[lang]['tv']['src']);records=[]
 for original in B[lang]['tv']['segments']:
  if original['id']=='02-tbm-basic':continue
  updated=next(x for x in T[lang]['tv']['segments'] if x['id']==original['id'])
  # Exclude12ms chapter-edge music fades; no altered words in these chapters.
  a=old[round((original['start']+.03)*RATE):round((original['end']-.03)*RATE)]
  b=new[round((updated['start']+.03)*RATE):round((updated['end']-.03)*RATE)]
  value=corr(a,b);assert value>.99,(lang,original['id'],value);records.append({'chapter':original['id'],'audioCorrelation':value})
 original=read(R/B[lang]['src']);updated=read(O/f'02-tbm-basic-{lang}.m4a');value=corr(original[:round((B[lang]['duration']-.05)*RATE)],updated[:round((B[lang]['duration']-.05)*RATE)])
 assert value>.99;records.append({'chapter':'02-tbm-basic original portion','audioCorrelation':value})
 # Full decode must not emit an error.
 for p in [R/T[lang]['tv']['src'],O/f'02-tbm-basic-{lang}.m4a']:
  q=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True,check=True);assert not q.stderr,q.stderr.decode()
 report[lang]=records
print(json.dumps(report,indent=2));(R/'review/unchanged-audio-verification.json').write_text(json.dumps(report,indent=2))
