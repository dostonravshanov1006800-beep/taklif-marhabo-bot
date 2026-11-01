# Общие временные приглашения для браузерных сценариев. Создаются перед тестом и удаляются после (контекстный менеджер).
import json, os, shutil, subprocess, contextlib
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
INV = os.path.join(ROOT, 'docs', 'inv'); MEDIA = os.path.join(ROOT, 'docs', 'media', '999000111')
TYPES6 = ['sunnat', 'beshik', 'grad', 'corp', 'party', 'hayit']
@contextlib.contextmanager
def temp_invites(types=(), video=False, gallery=False, playlist=False):
    made = []
    try:
        base = {'t': 'wedding', 'l': 'ru', 'a': 'Азиз', 'b': 'Дилноза', 'd': '2027-06-12', 'h': '18:00', 'pl': 'Зал', 'ad': 'Ташкент', 'ct': '+998901234567'}
        for t in types:
            f = os.path.join(INV, f'tt-{t}.json'); json.dump(dict(base, i=f'tt-{t}', t=t), open(f, 'w', encoding='utf8'), ensure_ascii=False); made.append(f)
        if video:
            os.makedirs(MEDIA, exist_ok=True); mp4 = os.path.join(MEDIA, 'vcov1.mp4')
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=duration=3:size=320x180:rate=15', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=12', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', mp4], check=True); made.append(mp4)
            p = {'v': [['media/999000111/vcov1.mp4', 'l']]}
            for slug, extra in (('tt-vc', {'vc': 1}), ('tt-novc', {})):
                f = os.path.join(INV, slug + '.json'); json.dump(dict(base, i=slug, p=p, **extra), open(f, 'w', encoding='utf8'), ensure_ascii=False); made.append(f)
        if gallery:
            os.makedirs(MEDIA, exist_ok=True); paths = []
            for k, (w, hh, col) in enumerate([(640, 480, 'c0a060'), (480, 640, '6080c0'), (600, 600, 'c06080'), (700, 420, '60c080'), (420, 700, '8060c0')]):
                f = os.path.join(MEDIA, f'gal{k+1}x.jpg')
                subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=0x{col}:s={w}x{hh}', '-frames:v', '1', f], check=True); made.append(f); paths.append(f'media/999000111/gal{k+1}x.jpg')
            caps = ['Наш первый танец', '', 'Мама и папа', 'Лето', 'Финал']
            for slug, extra in (('tt-gg', {}), ('tt-gm', {'gv': 'm'}), ('tt-gr', {'gv': 'r'}), ('tt-gn', {})):
                p = {'g': paths}
                if slug != 'tt-gn': p['gc'] = caps
                p.update(extra)
                f = os.path.join(INV, slug + '.json'); json.dump(dict(base, i=slug, p=p), open(f, 'w', encoding='utf8'), ensure_ascii=False); made.append(f)
        if playlist:
            os.makedirs(MEDIA, exist_ok=True); tr = []
            for k, fr in enumerate((440, 554, 660)):
                f = os.path.join(MEDIA, f'trk{k+1}x.mp3')
                subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', f'sine=frequency={fr}:duration=12', '-b:a', '32k', f], check=True); made.append(f); tr.append(f'media/999000111/trk{k+1}x.mp3')
            for slug, p in (('tt-pl', {'ul': tr[1:], 'un': ['Вальс', 'Финал']}), ('tt-pn', {}), ('tt-pb', {'ul': [tr[1], 'https://evil.example/a.php']})):
                f = os.path.join(INV, slug + '.json'); json.dump(dict(base, i=slug, u=tr[0], p=p), open(f, 'w', encoding='utf8'), ensure_ascii=False); made.append(f)
        yield
    finally:
        for f in made:
            with contextlib.suppress(Exception): os.remove(f)
        shutil.rmtree(MEDIA, ignore_errors=True)
