"""Collect public frontend files in .public/; never deploy the source folder wholesale."""

import argparse
import json
import os
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
    """Copy shared storefront assets into an already-created staging directory."""
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


def replace_directory(source: Path, destination: Path) -> None:
    """Windows scanners can temporarily lock freshly copied files during a directory rename."""
    for attempt in range(5):
        if destination.is_symlink():
            raise ValueError('Unsafe public output path')
        try:
            source.replace(destination)
            return
        except PermissionError as error:
            if os.name != 'nt' or error.winerror not in (5, 32, 33) or attempt == 4:
                raise
            time.sleep(0.1 * 2 ** attempt)


def validate_output() -> None:
    # Only this reserved project directory can be replaced. Never follow symlinks.
    if OUTPUT.is_symlink() or OUTPUT.resolve() != PROJECT / '.public' or OWNER.is_symlink():
        raise ValueError('Unsafe public output path')
    if OUTPUT.exists():
        if not OUTPUT.is_dir():
            raise ValueError('Public output is not a directory')
        owned = OWNER.is_file() and json.loads(OWNER.read_text(encoding='utf-8')) == IDENTITY
        if any(OUTPUT.iterdir()) and not owned:
            raise ValueError('Refusing to replace an unmanaged .public directory')


def prepare(api_env: str | None) -> int:
    source = PROJECT / 'frontend'
    if source.is_symlink() or (source / 'index.html').is_symlink() or not (source / 'index.html').is_file():
        raise ValueError('Frontend source with index.html is required')
    api_url = None
    if api_env:
        api_url = os.environ.get(api_env, '').strip()
        parsed = urlsplit(api_url)
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError('API address must not contain credentials, query parameters or fragments')
        if parsed.scheme and (parsed.scheme not in {'http', 'https'} or not parsed.netloc):
            raise ValueError('API address must use HTTP(S)')
        if not parsed.scheme and api_url and (not api_url.startswith('/') or api_url.startswith('//')):
            raise ValueError('Relative API address must start with a single slash')
    validate_output()
    # Build completely before replacing a previously generated artifact.
    with tempfile.TemporaryDirectory(prefix='.public-build-', dir=PROJECT) as temp:
        stage = Path(temp) / 'site'
        stage.mkdir()
        count = copy_public(source, stage)
        if api_url is not None:
            if not (stage / 'env.js').exists():
                count += 1
            (stage / 'env.js').write_text('window.KBCH_API_URL = ' + json.dumps(api_url) + ';\n', encoding='utf-8')
        validate_output()
        if OUTPUT.exists():
            shutil.rmtree(OUTPUT)  # resolved, reserved, non-symlink, ownership checked above
        replace_directory(stage, OUTPUT)
        OWNER.write_text(json.dumps(IDENTITY) + '\n', encoding='utf-8')
    return count


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--api-url-from-env', metavar='VARIABLE', help='public API address; never pass a secret here')
    args = parser.parse_args()
    try:
        total = prepare(args.api_url_from_env)
    except (ValueError, OSError) as error:
        parser.exit(1, f'Cannot prepare public frontend: {error}\n')
    print(f'Prepared {total} public files in .public/')
