import numpy as np, subprocess, sys
from PIL import Image, ImageFilter
FF='/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'
W,H=1080,1350
def feather_band(y_full,y_none):
    ys=np.arange(H); col=np.clip((y_none-ys)/(y_none-y_full),0,1).astype(np.float32)
    return np.repeat(col[:,None],W,1)
def text_mask(orig_rgb,thresh=120,dilate=3,blur=1.5,y_limit=880):
    lum=np.asarray(Image.fromarray(orig_rgb).convert('L'))
    m=(lum>thresh).astype(np.uint8)*255; m[y_limit:,:]=0
    im=Image.fromarray(m).filter(ImageFilter.MaxFilter(2*dilate+1)).filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im,dtype=np.float32)/255.0
def run(video,orig_png,out,mask):
    orig=np.asarray(Image.open(orig_png).convert('RGB'),dtype=np.float32)
    m=mask(orig.astype(np.uint8))[...,None]
    dec=subprocess.Popen([FF,'-v','error','-i',video,'-vf',f'scale={W}:{H}:flags=lanczos','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
    enc=subprocess.Popen([FF,'-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','24','-i','-','-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',out],stdin=subprocess.PIPE)
    n=0
    while True:
        buf=dec.stdout.read(W*H*3)
        if len(buf)<W*H*3: break
        fr=np.frombuffer(buf,np.uint8).reshape(H,W,3).astype(np.float32)
        enc.stdin.write((orig*m+fr*(1-m)).clip(0,255).astype(np.uint8).tobytes()); n+=1
    enc.stdin.close(); enc.wait(); dec.wait(); print(out,'frames',n)
which=sys.argv[1]
if which=='schedule':
    run('sched_kling15.mp4','orig_schedule.png','beach-fc-schedule-motion-15s.mp4',lambda o: feather_band(895,940))
else:
    run('roster_kling15.mp4','orig_roster.png','beach-fc-roster-motion-15s.mp4',lambda o: np.maximum(feather_band(400,432),text_mask(o)))
