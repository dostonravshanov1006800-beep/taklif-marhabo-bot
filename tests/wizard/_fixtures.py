# Общие временные приглашения для браузерных сценариев. Создаются перед тестом и удаляются после (контекстный менеджер).
import json, os, shutil, subprocess, contextlib
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
INV = os.path.join(ROOT, 'docs', 'inv'); MEDIA = os.path.join(ROOT, 'docs', 'media', '999000111')
TYPES6 = ['sunnat', 'beshik', 'grad', 'corp', 'party', 'hayit']
@contextlib.contextmanager
def temp_invites(types=(), video=False):
    made = []
    try:
        base = {'t': 'wedding', 'l': 'ru', 'a': 'Азиз', 'b': 'Дилноза', 'd': '2027-06-12', 'h': '18:00', 'pl': 'Зал', 'ad': 'Ташкент', 'ct': '+998901234567'}
        for t in types:
            f = os.path.join(INV, f'tt-{t}.json'); json.dump(dict(base, i=f'tt-{t}', t=t), open(f, 'w', encoding='utf8'), ensure_ascii=False); made.append(f)
        if video:
            os.makedirs(MEDIA, exist_ok=True); mp4 = os.path.join(MEDIA, 'vcov1.mp4')
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=duration=3:size=320x180:rate=15', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', mp4], check=True); made.append(mp4)
            p = {'v': [['media/999000111/vcov1.mp4', 'l']]}
            for slug, extra in (('tt-vc', {'vc': 1}), ('tt-novc', {})):
                f = os.path.join(INV, slug + '.json'); json.dump(dict(base, i=slug, p=p, **extra), open(f, 'w', encoding='utf8'), ensure_ascii=False); made.append(f)
        yield
    finally:
        for f in made:
            with contextlib.suppress(Exception): os.remove(f)
        shutil.rmtree(MEDIA, ignore_errors=True)
