from pathlib import Path
import subprocess,json
import argparse
p=argparse.ArgumentParser();p.add_argument('source',type=Path);a=p.parse_args()
r=Path(__file__).resolve().parents[1]; s=a.source; o=r/'assets/tv-background-v147';o.mkdir(exist_ok=True)
for name,start,crop in [('kepco-meeting-v147',412.3,'520:292:30:78'),('kepco-ppe-v147',338,'384:216:180:122')]:
 f=f'[0:v]crop={crop},fps=6,scale=320:180:flags=lanczos,split[a][b];[a]trim=duration=20,setpts=PTS-STARTPTS,fps=6[a0];[b]trim=duration=0.5,setpts=PTS-STARTPTS,fps=6[b0];[a0][b0]xfade=transition=fade:duration=0.5:offset=19.5[out]'
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(s),'-filter_complex_threads','1','-filter_complex',f,'-map','[out]','-t','20','-an','-c:v','libwebp_anim','-quality','65','-compression_level','4','-loop','0',str(o/(name+'.webp'))],check=True)
 print(name,flush=True)
