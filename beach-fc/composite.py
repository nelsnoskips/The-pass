import numpy as np, subprocess, sys
from PIL import Image, ImageFilter
FF='/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'
W,H=1080,1350

def feather_band(y_full, y_none):
    """1.0 above y_full, linear to 0.0 at y_none."""
    m=np.zeros((H,W),np.float32)
    ys=np.arange(H)
    col=np.clip((y_none-ys)/(y_none-y_full),0,1).astype(np.float32)
    m[:]=col[:,None]
    return m

def text_mask(orig_rgb, thresh=80, dilate=9, blur=3, y_limit=880):
    lum=np.asarray(Image.fromarray(orig_rgb).convert('L'))
    m=(lum>thresh).astype(np.uint8)*255
    m[y_limit:,:]=0
    im=Image.fromarray(m).filter(ImageFilter.MaxFilter(2*dilate+1)).filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im,dtype=np.float32)/255.0

def run(video, orig_png, out, mask):
    orig=np.asarray(Image.open(orig_png).convert('RGB'),dtype=np.float32)
    m=mask(orig.astype(np.uint8))[...,None]
    Image.fromarray((m[...,0]*255).astype(np.uint8)).save(out.replace('.mp4','_mask.png'))
    dec=subprocess.Popen([FF,'-v','error','-i',video,'-vf',f'scale={W}:{H}:flags=lanczos','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
    enc=subprocess.Popen([FF,'-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','24','-i','-',
        '-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',out],stdin=subprocess.PIPE)
    n=0
    while True:
        buf=dec.stdout.read(W*H*3)
        if len(buf)<W*H*3: break
        fr=np.frombuffer(buf,np.uint8).reshape(H,W,3).astype(np.float32)
        comp=orig*m+fr*(1-m)
        enc.stdin.write(comp.clip(0,255).astype(np.uint8).tobytes()); n+=1
    enc.stdin.close(); enc.wait(); dec.wait()
    print(out,'frames',n)

# Schedule: everything above the fog line is the locked original; pier photo animates.
run('sched_kling.mp4','orig_schedule.png','beach-fc-schedule-motion.mp4',
    lambda o: feather_band(895,940))

# Roster: header/headline/divider band locked; every glyph and rule line locked via luminance mask; photo animates.
def roster_mask(o):
    band=feather_band(400,432)
    return np.maximum(band,text_mask(o,thresh=80,dilate=9,blur=3,y_limit=880))
run('roster_kling.mp4','orig_roster.png','beach-fc-roster-motion.mp4',roster_mask)
