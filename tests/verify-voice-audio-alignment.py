"""Verify actual rendered chapter/tour contains approved visible-first-measure audio.
Independent of source filename/metadata: normalized source waveform correlation.
"""
import json, subprocess
from pathlib import Path
import numpy as np
R=Path(__file__).resolve().parents[1]
D=R/'assets/audio/narration-demo-v142'
def decode(p,extra=[]):
 return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),*extra,'-ar','48000','-ac','1','-f','f32le','-']),dtype='<f4')
source=decode(D/'sample-measure.mp3',['-af','loudnorm=I=-16:TP=-2:LRA=11'])
records=json.loads((D/'timing.json').read_text())
for lang,rec in records.items():
 t=rec['voiceDemo']; seg=next(s for s in rec['tv']['segments'] if s['id']=='02-tbm-basic')
 for name,p,start in [('chapter',D/f'02-tbm-basic-{lang}.m4a',t['measureStart']),('tour',R/rec['tv']['src'],seg['start']+t['measureStart'])]:
  clip=decode(p,['-ss',str(start),'-t',str(t['sampleEnd']-t['measureStart'])])
  n=min(len(source),len(clip)); score=float(np.corrcoef(source[:n],clip[:n])[0,1])
  assert score>.98,(lang,name,score,'rendered audio does not match approved visible measure')
  print('PASS',lang,name,'first-visible-measure waveform correlation',score)
