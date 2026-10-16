from html.parser import HTMLParser
from pathlib import Path
import json,sys
class Parser(HTMLParser):
 def __init__(self):
  super().__init__();self.root={'tag':'document','attrs':{},'children':[]};self.stack=[self.root]
 def handle_starttag(self,tag,attrs):
  n={'tag':tag,'attrs':dict(attrs),'children':[]};self.stack[-1]['children'].append(n)
  if tag not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:self.stack.append(n)
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i]['tag']==tag:self.stack=self.stack[:i];break
 def handle_data(self,data):
  if data.strip():self.stack[-1]['children'].append({'tag':'#text','text':data})
p=Parser();p.feed((Path(__file__).resolve().parents[1]/'index.html').read_text());json.dump(p.root,sys.stdout,ensure_ascii=False)
