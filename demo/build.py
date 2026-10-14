"""Build the removable GitHub Pages demo, with every product photo, into demo/.public."""
import importlib.util
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent
FRONTEND = PROJECT / 'frontend'
OUTPUT = ROOT / '.public'
OWNER = ROOT / '.public-build.json'
IDENTITY = {'generator': 'demo/build.py', 'version': 1}
EXTENSIONS = {'data': {'.js'}, 'runtime': {'.js'}, 'css': {'.css'}, 'images': {'.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif'}}


def shared_builder():
    spec = importlib.util.spec_from_file_location('shared_public_builder', PROJECT / 'deploy/prepare_frontend.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def public_file(relative: Path) -> bool:
    if any(part.startswith('.') or part.lower() in {'private', 'secrets', 'credentials', 'exports', 'backups', 'tests', 'node_modules', 'tmp', 'temp'} for part in relative.parts):
        return False
    name = relative.name.lower()
    if any(term in name for term in ('.test.', '.spec.', '.local.')) or name.startswith(('secret', 'credentials', 'service-account', 'client_secret')):
        return False
    return len(relative.parts) > 1 and relative.suffix.lower() in EXTENSIONS.get(relative.parts[0], set())


def validate_photos(stage: Path) -> int:
    """Fail the build when even one catalog/order image would be missing from publication."""
    refs = set()
    for name in ('products.js', 'orders.js'):
        data = (stage / 'demo/data' / name).read_text(encoding='utf-8')
        refs.update(re.findall(r"['\"](demo/images/[^'\"]+)['\"]", data))
    if not refs:
        raise ValueError('Demo catalog has no product photo references')
    for ref in sorted(refs):
        target = stage / ref
        if '..' in Path(ref).parts or not target.is_file() or target.stat().st_size == 0:
            raise ValueError(f'Missing demo product photo: {ref}')
    return len(refs)


def validate_output():
    if ROOT.is_symlink() or OUTPUT.is_symlink() or OWNER.is_symlink() or OUTPUT.resolve() != ROOT.resolve() / '.public':
        raise ValueError('Unsafe demo output path')
    if OUTPUT.exists():
        if not OUTPUT.is_dir():
            raise ValueError('Demo output is not a directory')
        owned = OWNER.is_file() and json.loads(OWNER.read_text(encoding='utf-8')) == IDENTITY
        if any(OUTPUT.iterdir()) and not owned:
            raise ValueError('Refusing to replace unmanaged demo output')


def stamp_assets(stage: Path) -> str:
    """Version every browser module from actual release contents, preventing stale login/UI code."""
    digest = hashlib.sha256()
    for file in sorted(stage.rglob('*')):
        if file.is_file() and file.suffix in {'.js', '.css', '.html'}:
            digest.update(file.relative_to(stage).as_posix().encode())
            digest.update(file.read_bytes())
    version = digest.hexdigest()[:12]
    loader = stage / 'js/app.js'
    if loader.is_file():
        text = loader.read_text(encoding='utf-8')
        loader.write_text(re.sub(r"var VERSION = '[^']+';", f"var VERSION = '{version}';", text), encoding='utf-8')
    for file in stage.rglob('*.html'):
        text = file.read_text(encoding='utf-8')
        file.write_text(re.sub(r'([?&]v=)[0-9a-z.-]+', lambda match: match[1] + version, text), encoding='utf-8')
    return version


def build() -> dict:
    if FRONTEND.is_symlink() or (FRONTEND / 'index.html').is_symlink() or not (FRONTEND / 'index.html').is_file():
        raise ValueError('Shared frontend/index.html is required')
    config = json.loads((ROOT / 'config.json').read_text(encoding='utf-8'))
    validate_output()
    helper = shared_builder()
    with tempfile.TemporaryDirectory(prefix='.public-build-', dir=ROOT) as temp:
        stage = Path(temp) / 'site'
        stage.mkdir()
        count = helper.copy_public(FRONTEND, stage)
        for directory, dirs, files in os.walk(ROOT, followlinks=False):
            parent = Path(directory)
            dirs[:] = [name for name in dirs if name in EXTENSIONS or parent != ROOT]
            dirs[:] = [name for name in dirs if not name.startswith('.') and not (parent / name).is_symlink()]
            for name in files:
                source = parent / name
                relative = source.relative_to(ROOT)
                if source.is_symlink() or not public_file(relative):
                    continue
                destination = stage / 'demo' / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, destination)
                count += 1
        env = ('window.KBCH_API_URL = "";\n'
               'window.KBCH_STORAGE_PREFIX = ' + json.dumps(config['storagePrefix']) + ';\n'
               'window.KBCH_EXTENSIONS = ' + json.dumps(config['extensions'], ensure_ascii=False) + ';\n')
        (stage / 'env.js').write_text(env, encoding='utf-8')
        (stage / '.nojekyll').write_text('', encoding='utf-8')
        for ref in config['extensions']['data'] + config['extensions']['runtime'] + config['extensions']['styles'] + [item for items in config['extensions']['pages'].values() for item in items]:
            if not (stage / ref.lstrip('@')).is_file():
                raise ValueError(f'Missing demo module: {ref}')
        photos = validate_photos(stage)
        version = stamp_assets(stage)
        size = sum(path.stat().st_size for path in stage.rglob('*') if path.is_file())
        if size >= 1024 ** 3:
            raise ValueError('Demo exceeds the 1 GiB GitHub Pages site size limit')
        validate_output()
        if OUTPUT.exists():
            shutil.rmtree(OUTPUT)  # reserved, resolved and owned directory checked above
        helper.replace_directory(stage, OUTPUT)
        OWNER.write_text(json.dumps(IDENTITY) + '\n', encoding='utf-8')
    return {'files': count, 'productPhotos': photos, 'bytes': size, 'assetVersion': version}


if __name__ == '__main__':
    print(json.dumps(build(), ensure_ascii=False))
