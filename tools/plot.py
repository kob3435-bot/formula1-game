import json,sys
from PIL import Image, ImageDraw
ims=[]
for t in sys.argv[1:]:
    d=json.load(open(f'/tmp/{t}.json')); x,z=d['x'],d['z']
    mnx,mxx,mnz,mxz=min(x),max(x),min(z),max(z); S=900/max(mxx-mnx,mxz-mnz)
    P=lambda i:((x[i]-mnx)*S+50,(z[i]-mnz)*S+50)
    im=Image.new('RGB',(1000,1000),'white'); dr=ImageDraw.Draw(im)
    n=len(x); dr.line([P(i) for i in range(n)]+[P(0)],fill='black',width=max(1,int(2*d['hw']*S)))
    dr.line([P(i) for i in range(int(d['a']),int(d['b']))],fill='red',width=3)
    for k in range(0,n,int(500/d['ds'])): dr.text(P(k),str(int(k*d['ds'])),fill='blue')
    dr.text((10,10),t,fill='black'); ims.append(im)
W=Image.new('RGB',(1000*len(ims),1000)); [W.paste(im,(k*1000,0)) for k,im in enumerate(ims)]; W.resize((500*len(ims),500)).save('/tmp/tr.png')
