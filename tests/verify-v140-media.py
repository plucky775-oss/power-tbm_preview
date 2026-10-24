"""Verify final media's decoder invariants, complete decode and timeline continuity."""
import json, re, struct, subprocess
from pathlib import Path
R=Path(__file__).resolve().parents[1]
records=json.loads((R/'assets/audio/narration-demo-v141/timing.json').read_text())
for lang,record in records.items():
 t=record['tv'];p=R/t['src']
 probe=lambda args:json.loads(subprocess.check_output(['ffprobe','-v','error',*args,'-of','json',str(p)]))
 video,audio=probe(['-show_streams'])['streams']
 assert (video['codec_name'],video['profile'],video['level'],video['width'],video['height'],video['pix_fmt'],video['avg_frame_rate'])==('h264','Main',31,480,1040,'yuv420p','30/1')
 assert audio['codec_name']=='aac' and audio['sample_rate']=='48000'
 assert int(video['nb_frames'])==round(t['duration']*30)
 for stream in [video,audio]:assert abs(float(stream['duration'])-t['duration'])<.002
 for a,b in zip(t['segments'],t['segments'][1:]):assert abs(a['end']-b['start'])<1e-6
 stream=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:v','-c:v','copy','-bsf:v','h264_mp4toannexb','-f','h264','-'])
 units=re.split(b'\x00\x00\x00?\x01',stream)
 for kind in (7,8):assert len({u for u in units if u and u[0]&31==kind})==1,(lang,'nonuniform parameter set',kind)
 packets=probe(['-select_streams','v:0','-show_packets','-show_entries','packet=pts_time,dts_time,flags'])['packets']
 for clock in [sorted(float(x['pts_time']) for x in packets),[float(x['dts_time']) for x in packets]]:
  assert all(abs(b-a-1/30)<.00001 for a,b in zip(clock,clock[1:])),(lang,'frame gap')
 keys=[float(x['pts_time']) for x in packets if 'K' in x['flags']]
 assert keys[0]==0 and max(b-a for a,b in zip(keys,keys[1:]))<=2.001
 atoms=[]
 with p.open('rb') as f:
  while header:=f.read(8):
   size,kind=struct.unpack('>I4s',header);assert size>=8;atoms.append(kind);f.seek(size-8,1)
 assert atoms.index(b'moov')<atoms.index(b'mdat')
 decoded=subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(p),'-f','null','-'],capture_output=True,text=True)
 assert decoded.returncode==0 and not decoded.stderr,decoded.stderr
 print('PASS',lang,'single SPS/PPS, uniform H264/AAC, timeline/frame/keyframe continuity, faststart, complete decode',flush=True)
