import argparse
import json
import os
import posixpath
import re
from pathlib import Path
import shutil
import tempfile
import time
from urllib.parse import urlsplit

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT / '.public'
OWNER = PROJECT / '.public-build.json'
IDENTITY = {'generator': 'deploy/prepare_frontend.py', 'version': 1}
ROOT_FILES = {'index.html', '404.html', 'env.js', '.nojekyll', 'robots.txt', 'sitemap.xml', 'favicon.ico', 'favicon.svg'}
WEB_EXTENSIONS = {
    'pages': {'.html'},
    'admin': {'.html'},
    'css': {'.css'},
    'js': {'.js'},
    'texts': {'.js'},
    'assets': {'.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf'},
}


PRIVATE_PARTS = {'private', 'personal', 'secrets', 'credentials', 'exports', 'backups', 'tmp', 'temp', 'tests', 'test-results', 'node_modules', '_local'}


def public_file(relative: Path) -> bool:
    if relative.as_posix() in ROOT_FILES:
        return True
    if any(part.startswith('.') or part.lower() in PRIVATE_PARTS for part in relative.parts):
        return False
    name = relative.name.lower()
    if any(term in name for term in ('.local.', '.test.', '.spec.', '.stories.')):
        return False
    if name.startswith(('secret', 'credentials', 'client_secret', 'service-account', 'service_account')):
        return False
    return len(relative.parts) > 1 and relative.suffix.lower() in WEB_EXTENSIONS.get(relative.parts[0], set())


def copy_public(source: Path, destination: Path) -> int:
    count = 0
    for directory, dirs, files in os.walk(source, followlinks=False):
        parent = Path(directory)
        dirs[:] = [name for name in dirs if not name.startswith('.') and name.lower() not in PRIVATE_PARTS and not (parent / name).is_symlink()]
        for name in sorted(files):
            item = parent / name
            relative = item.relative_to(source)
            if item.is_symlink() or not public_file(relative):
                continue
            target = destination / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(item, target)
            count += 1
    return count


IMPORT = re.compile(r"""@import\s+url\(\s*['"]?([^'")?]+)(?:\?[^'")]*)?['"]?\s*\)\s*;""")
URL = re.compile(r"""url\(\s*(['"]?)([^'")]+)\1\s*\)""")


def inline_css(path: Path, entry_dir: Path, seen: set) -> str:
    real = path.resolve()
    if real in seen:
        return ''
    seen.add(real)
    text = path.read_text(encoding='utf-8')

    def rebase(match):
        quote, target = match.group(1), match.group(2)
        if target.startswith(('data:', 'http:', 'https:', '//', '/', '#')):
            return match.group(0)
        base, _, suffix = target.partition('?')
        moved = os.path.relpath(path.parent / base, entry_dir).replace(os.sep, '/')
        return f'url({quote}{posixpath.normpath(moved)}{"?" + suffix if suffix else ""}{quote})'

    parts, last = [], 0
    for match in IMPORT.finditer(text):
        parts.append(URL.sub(rebase, text[last:match.start()]))
        parts.append(inline_css(path.parent / match.group(1), entry_dir, seen))
        last = match.end()
    parts.append(URL.sub(rebase, text[last:]))
    return ''.join(parts)


def bundle_css(stage: Path) -> None:
    for entry in sorted((stage / 'css').glob('*.css')):
        if IMPORT.search(entry.read_text(encoding='utf-8')):
            entry.write_text(inline_css(entry, entry.parent, set()), encoding='utf-8')


def replace_directory(source: Path, destination: Path) -> None:
    for attempt in range(5):
        if destination.is_symlink():
            raise ValueError('Небезопасный путь для папки .public')
        try:
            source.replace(destination)
            return
        except PermissionError as error:
            if os.name != 'nt' or error.winerror not in (5, 32, 33) or attempt == 4:
                raise
            time.sleep(0.1 * 2 ** attempt)


def validate_output() -> None:
    if OUTPUT.is_symlink() or OUTPUT.resolve() != PROJECT / '.public' or OWNER.is_symlink():
        raise ValueError('Небезопасный путь для папки .public')
    if OUTPUT.exists():
        if not OUTPUT.is_dir():
            raise ValueError('.public — не папка')
        owned = OWNER.is_file() and json.loads(OWNER.read_text(encoding='utf-8')) == IDENTITY
        if any(OUTPUT.iterdir()) and not owned:
            raise ValueError('Папка .public создана не этим скриптом — заменять её не будем')


def prepare(api_env: str | None) -> int:
    source = PROJECT / 'frontend'
    if source.is_symlink() or (source / 'index.html').is_symlink() or not (source / 'index.html').is_file():
        raise ValueError('Нужна папка frontend с файлом index.html')
    api_url = None
    if api_env:
        api_url = os.environ.get(api_env, '').strip()
        parsed = urlsplit(api_url)
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError('Адрес API не должен содержать логин, пароль, параметры (?) или якорь (#)')
        if parsed.scheme and (parsed.scheme not in {'http', 'https'} or not parsed.netloc):
            raise ValueError('Адрес API должен начинаться с http:// или https://')
        if not parsed.scheme and api_url and (not api_url.startswith('/') or api_url.startswith('//')):
            raise ValueError('Относительный адрес API должен начинаться с одного /')
    validate_output()
    with tempfile.TemporaryDirectory(prefix='.public-build-', dir=PROJECT) as temp:
        stage = Path(temp) / 'site'
        stage.mkdir()
        count = copy_public(source, stage)
        if (stage / 'css').is_dir():
            bundle_css(stage)
        if api_url is not None:
            if not (stage / 'env.js').exists():
                count += 1
            (stage / 'env.js').write_text('window.KBCH_API_URL = ' + json.dumps(api_url) + ';\n', encoding='utf-8')
        validate_output()
        if OUTPUT.exists():
            shutil.rmtree(OUTPUT)
        replace_directory(stage, OUTPUT)
        OWNER.write_text(json.dumps(IDENTITY) + '\n', encoding='utf-8')
    return count


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--api-url-from-env', metavar='VARIABLE', help='имя переменной окружения с публичным адресом API (не секрет)')
    args = parser.parse_args()
    try:
        total = prepare(args.api_url_from_env)
    except (ValueError, OSError) as error:
        parser.exit(1, f'Не удалось собрать .public: {error}\n')
    print(f'Готово: {total} публичных файлов в .public/')
