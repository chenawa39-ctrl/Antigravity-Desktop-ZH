"""Version-pinned, reversible Antigravity desktop localization. No external dependencies."""
from __future__ import annotations
import copy, hashlib, json, os, pathlib, struct, subprocess, sys, tempfile, tkinter as tk
from tkinter import messagebox

HERE = pathlib.Path(__file__).resolve().parent
APP = pathlib.Path(os.environ['LOCALAPPDATA']) / 'Programs' / 'antigravity'
ARCHIVE = APP / 'resources' / 'app.asar'
MANIFEST = HERE / '安装记录.json'
BACKUP = HERE / '原始文件备份'
SUPPORTED_VERSION = '2.19.1'
# Populated from the actual original archive when the package is built.
ORIGINAL_SHA256 = '341234faf45bd1776fd5418a3c288dedc5487ebfcf153f53d75de17cfe15c1de'

def sha(data): return hashlib.sha256(data).hexdigest()

def unpack(raw):
    if len(raw) < 16: raise ValueError('软件资源文件不完整。')
    size, header_size, payload_size, json_size = struct.unpack('<4I', raw[:16])
    if size != 4 or header_size > len(raw): raise ValueError('软件资源格式不受支持。')
    tree = json.loads(raw[16:16 + json_size])
    base, packed = 8 + header_size, {}
    def walk(folder, prefix=''):
        for name, entry in folder['files'].items():
            path = prefix + name
            if 'files' in entry: walk(entry, path + '/')
            elif not entry.get('unpacked') and 'offset' in entry:
                start = base + int(entry['offset']); content = raw[start:start+entry['size']]
                if len(content) != entry['size']: raise ValueError('软件资源内容不完整：' + path)
                integrity = entry.get('integrity')
                if integrity and integrity['hash'] != sha(content): raise ValueError('资源校验失败：' + path)
                packed[path] = content
    walk(tree)
    return tree, packed

def repack(tree, contents):
    tree = copy.deepcopy(tree)
    def entry(path):
        node = tree
        for part in path.split('/')[:-1]: node = node['files'].setdefault(part, {'files': {}})
        return node['files'].setdefault(path.split('/')[-1], {})
    payload = bytearray()
    for path, data in contents.items():
        target = entry(path); target.update(size=len(data), offset=str(len(payload)))
        target.pop('unpacked', None)
        block = 4194304
        target['integrity'] = {'algorithm':'SHA256','hash':sha(data),'blockSize':block,
            'blocks':[sha(data[i:i+block]) for i in range(0,len(data),block)] or [sha(b'')]}
        payload.extend(data)
    header_json = json.dumps(tree, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    padding = (-len(header_json)) % 4
    header = struct.pack('<II',4+len(header_json)+padding,len(header_json)) + header_json + bytes(padding)
    raw = struct.pack('<II',4,len(header)) + header + payload
    verified_tree, verified_files = unpack(raw)
    if contents != verified_files: raise ValueError('重打包后的文件内容不一致。')
    return raw

def patched(original):
    tree, contents = unpack(original)
    pkg = json.loads(contents['package.json'])
    if pkg['version'] != SUPPORTED_VERSION: raise ValueError('此工具仅支持 Antigravity 2.19.1。')
    engine = (HERE / 'translator.js').read_text(encoding='utf-8')
    preload = contents['dist/preload.js'].decode('utf-8')
    contents['dist/preload.js'] = (preload + '\n// AGY_ZH_LOCAL_1_0_0\n' + engine + '\n').encode('utf-8')
    main = contents['dist/main.js'].decode('utf-8')
    contents['dist/main.js'] = ('require("./zh-native.cjs"); // AGY_ZH_LOCAL_1_0_0\n' + main).encode('utf-8')
    # Menu labels are also used to locate submenus; retain the original lookup key.
    menu = contents['dist/menu.js'].decode('utf-8')
    lookup = 'item.label === submenuLabel'
    if menu.count(lookup) != 1: raise ValueError('菜单结构已更改，停止安装。')
    menu = menu.replace(lookup,'(item.label === submenuLabel || item.__agyZhOriginalLabel === submenuLabel)')
    contents['dist/menu.js'] = menu.encode('utf-8')
    # The updater maps actions by label. Translate its enum and action keys together.
    updater = contents['dist/updater.js'].decode('utf-8')
    for key, en, zh in [
        ('CheckForUpdates','Check for Updates','检查更新'),
        ('CheckingForUpdates','Checking for Updates...','正在检查更新…'),
        ('DownloadingUpdate','Downloading Update...','正在下载更新…'),
        ('RestartToUpdate','Restart to Update','重启以更新')]:
        source = f'MenuUpdateStep["{key}"] = "{en}";'
        if updater.count(source) != 1: raise ValueError('更新菜单结构已更改，停止安装。')
        updater = updater.replace(source,f'MenuUpdateStep["{key}"] = "{zh}";')
    contents['dist/updater.js'] = updater.encode('utf-8')
    contents['dist/zh-native.cjs'] = (HERE / 'zh-native.cjs').read_bytes()
    contents['dist/zh-CN.json'] = (HERE / 'zh-CN.json').read_bytes()
    return repack(tree, contents)

def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent,prefix=path.name+'.zh-',suffix='.tmp',delete=False) as f:
        staging = pathlib.Path(f.name); f.write(data); f.flush(); os.fsync(f.fileno())
    try: os.replace(staging,path)
    finally:
        if staging.exists(): staging.unlink()

def install():
    current = ARCHIVE.read_bytes()
    if sha(current) == ORIGINAL_SHA256:
        original = current
    elif MANIFEST.exists():
        previous = json.loads(MANIFEST.read_text(encoding='utf-8'))
        if sha(current) != previous.get('patched_sha256'):
            raise ValueError('软件文件已被更新或改动。为避免覆盖其他版本，已停止安装。')
        original = pathlib.Path(previous['backup_path']).read_bytes()
    else: raise ValueError('软件版本或资源校验值与已验证的 2.19.1 不一致，已停止安装。')
    if sha(original) != ORIGINAL_SHA256: raise ValueError('原始备份校验失败，已停止安装。')
    new = patched(original)
    backup = BACKUP / f'app.asar.{SUPPORTED_VERSION}.{ORIGINAL_SHA256[:12]}.original'
    BACKUP.mkdir(exist_ok=True)
    if backup.exists():
        if sha(backup.read_bytes()) != ORIGINAL_SHA256: raise ValueError('已有备份校验失败。')
    else: atomic_write(backup, original)
    # Save recovery metadata first so a failed/locked archive write never loses its backup.
    record = {'version':SUPPORTED_VERSION,'original_sha256':ORIGINAL_SHA256,
              'patched_sha256':sha(new),'backup_path':str(backup),'archive_path':str(ARCHIVE),
              'dictionary_entries':len(json.loads((HERE/'zh-CN.json').read_text(encoding='utf-8')))}
    old_manifest = MANIFEST.read_bytes() if MANIFEST.exists() else None
    atomic_write(MANIFEST,json.dumps(record,ensure_ascii=False,indent=2).encode('utf-8'))
    try:
        atomic_write(ARCHIVE,new)
    except Exception:
        # If a running app locks the archive, preserve the previous installed state.
        if old_manifest is not None: atomic_write(MANIFEST,old_manifest)
        raise
    if sha(ARCHIVE.read_bytes()) != sha(new): raise ValueError('安装后校验失败。请运行恢复英文。')
    return record

def restore():
    if not MANIFEST.exists(): raise ValueError('找不到安装记录。')
    record = json.loads(MANIFEST.read_text(encoding='utf-8'))
    current = sha(ARCHIVE.read_bytes())
    if current == ORIGINAL_SHA256: return '当前已经是英文原版。'
    if current != record['patched_sha256']: raise ValueError('软件已更新或被其他工具修改，不能用旧备份覆盖当前版本。')
    original = pathlib.Path(record['backup_path']).read_bytes()
    if sha(original) != ORIGINAL_SHA256: raise ValueError('原始备份校验失败。')
    atomic_write(ARCHIVE,original)
    if sha(ARCHIVE.read_bytes()) != ORIGINAL_SHA256: raise ValueError('恢复后的校验失败。')
    return '英文原版已恢复。完全退出 Antigravity 后重新打开即可。'

def main():
    mode = sys.argv[1] if len(sys.argv)>1 else 'install'
    quiet = '--quiet' in sys.argv
    root = None
    if not quiet:
        root=tk.Tk();root.withdraw()
    try:
        if mode=='install':
            result=install(); msg='中文汉化已安装。\n\n请完全退出 Antigravity（包括托盘后台），然后重新打开。\n原来的快捷方式也会加载中文界面。\n\n原始文件已备份，可随时运行“恢复英文”。'
        elif mode=='restore':result=restore();msg=result
        elif mode=='status':
            result={'installed':MANIFEST.exists() and sha(ARCHIVE.read_bytes())==json.loads(MANIFEST.read_text(encoding='utf-8'))['patched_sha256']};msg='当前状态：'+('中文汉化已安装' if result['installed'] else '未安装或软件已更新')
        elif mode=='launch':
            subprocess.Popen([str(APP/'Antigravity.exe')],cwd=str(APP));result={'launched':True};msg='Antigravity 已启动。'
        else:raise ValueError('未知操作。')
        if quiet: print(json.dumps(result,ensure_ascii=True))
        elif mode!='launch':messagebox.showinfo('Antigravity 中文汉化',msg)
    except Exception as error:
        detail = '文件正被软件使用，或当前账户没有写入权限。请完全退出 Antigravity（包括托盘后台）后再试。' if isinstance(error,PermissionError) else str(error)
        if quiet: print(json.dumps({'error':detail},ensure_ascii=True));sys.exit(1)
        else:messagebox.showerror('Antigravity 中文汉化',detail)
    finally:
        if root:root.destroy()

if __name__=='__main__': main()
